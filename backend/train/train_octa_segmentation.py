"""Train a small OCTA vessel segmentation baseline.

Research use only. The split is grouped by subject to prevent image leakage.
The output is not a clinical model until independently validated.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from sklearn.model_selection import GroupShuffleSplit
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import InterpolationMode, functional as TF


IMAGE_SIZE = 256


class OCTADataset(Dataset):
    def __init__(self, rows: list[dict[str, str]], root: Path):
        self.rows, self.root = rows, root

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int):
        row = self.rows[index]
        image = Image.open(self.root / row["image_path"]).convert("L")
        mask = Image.open(self.root / row["vessel_mask_path"]).convert("L")
        image = TF.resize(image, [IMAGE_SIZE, IMAGE_SIZE])
        mask = TF.resize(mask, [IMAGE_SIZE, IMAGE_SIZE], interpolation=InterpolationMode.NEAREST)
        return TF.to_tensor(image), (TF.to_tensor(mask) > 0.5).float()


def conv_block(in_channels: int, out_channels: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Conv2d(in_channels, out_channels, 3, padding=1), nn.BatchNorm2d(out_channels), nn.ReLU(inplace=True),
        nn.Conv2d(out_channels, out_channels, 3, padding=1), nn.BatchNorm2d(out_channels), nn.ReLU(inplace=True),
    )


class SmallUNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1, self.enc2, self.enc3 = conv_block(1, 32), conv_block(32, 64), conv_block(64, 128)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = conv_block(128, 256)
        self.up3, self.dec3 = nn.ConvTranspose2d(256, 128, 2, 2), conv_block(256, 128)
        self.up2, self.dec2 = nn.ConvTranspose2d(128, 64, 2, 2), conv_block(128, 64)
        self.up1, self.dec1 = nn.ConvTranspose2d(64, 32, 2, 2), conv_block(64, 32)
        self.head = nn.Conv2d(32, 1, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))
        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return self.head(d1)


def dice_score(logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    prediction = (torch.sigmoid(logits) > 0.5).float()
    intersection = (prediction * target).sum(dim=(1, 2, 3))
    return ((2 * intersection + 1.0) / (prediction.sum(dim=(1, 2, 3)) + target.sum(dim=(1, 2, 3)) + 1.0)).mean()


def soft_dice_loss(logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    probability = torch.sigmoid(logits)
    intersection = (probability * target).sum(dim=(1, 2, 3))
    score = (2 * intersection + 1.0) / (probability.sum(dim=(1, 2, 3)) + target.sum(dim=(1, 2, 3)) + 1.0)
    return 1.0 - score.mean()


def run_epoch(model, loader, optimizer, device, train: bool):
    model.train(train)
    loss_total, dice_total = 0.0, 0.0
    criterion = nn.BCEWithLogitsLoss()
    for images, masks in loader:
        images, masks = images.to(device), masks.to(device)
        with torch.set_grad_enabled(train):
            logits = model(images)
            dice = dice_score(logits, masks)
            loss = criterion(logits, masks) + soft_dice_loss(logits, masks)
            if train:
                optimizer.zero_grad(set_to_none=True)
                loss.backward()
                optimizer.step()
        loss_total += float(loss.detach()) * len(images)
        dice_total += float(dice.detach()) * len(images)
    size = max(1, len(loader.dataset))
    return {"loss": loss_total / size, "dice": dice_total / size}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("data/octa"))
    parser.add_argument("--model-dir", type=Path, default=Path("models/octa"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    with (args.data_dir / "metadata.csv").open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    official_train = [row for row in rows if row.get("source_split") == "train"]
    official_test = [row for row in rows if row.get("source_split") == "test"]
    if official_train and official_test:
        # Preserve the published ROSE-O test split. The archive does not
        # provide participant identities, so this avoids creating a new,
        # unverifiable test split from the training partition.
        groups = np.array([row["subject_id"] for row in official_train])
        indices = np.arange(len(official_train))
        train_idx, val_idx = next(GroupShuffleSplit(
            n_splits=1, test_size=0.20, random_state=args.seed,
        ).split(indices, groups=groups))
        train_rows = [official_train[i] for i in train_idx]
        val_rows = [official_train[i] for i in val_idx]
        test_rows = official_test
        split_name = "published test split; validation sampled from published train split"
    else:
        groups = np.array([row["subject_id"] for row in rows])
        indices = np.arange(len(rows))
        train_idx, holdout_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=args.seed).split(indices, groups=groups))
        holdout_groups = groups[holdout_idx]
        val_idx, test_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=args.seed).split(holdout_idx, groups=holdout_groups))
        train_rows = [rows[i] for i in train_idx]
        val_rows = [rows[holdout_idx[i]] for i in val_idx]
        test_rows = [rows[holdout_idx[i]] for i in test_idx]
        split_name = "subject-grouped random split"
    if not train_rows or not val_rows or not test_rows:
        raise RuntimeError("Training, validation, and test partitions must all contain data.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SmallUNet().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
    train_loader = DataLoader(OCTADataset(train_rows, args.data_dir), batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(OCTADataset(val_rows, args.data_dir), batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(OCTADataset(test_rows, args.data_dir), batch_size=args.batch_size, shuffle=False, num_workers=0)

    args.model_dir.mkdir(parents=True, exist_ok=True)
    best_dice = -1.0
    history = []
    checkpoint = args.model_dir / "octa_vessel_unet.pt"
    for epoch in range(1, args.epochs + 1):
        train_metrics = run_epoch(model, train_loader, optimizer, device, True)
        val_metrics = run_epoch(model, val_loader, optimizer, device, False)
        history.append({"epoch": epoch, "train": train_metrics, "validation": val_metrics})
        print(f"Epoch {epoch}/{args.epochs} train_dice={train_metrics['dice']:.4f} val_dice={val_metrics['dice']:.4f}")
        if val_metrics["dice"] > best_dice:
            best_dice = val_metrics["dice"]
            torch.save(model.state_dict(), checkpoint)

    model.load_state_dict(torch.load(checkpoint, map_location=device, weights_only=True))
    test_metrics = run_epoch(model, test_loader, optimizer, device, False)
    # Keep the export self-contained. The modern dynamo exporter can emit an
    # external .onnx.data file and is sensitive to Windows console encoding;
    # the legacy exporter is sufficient for this fixed-shape inference graph.
    torch.onnx.export(
        model,
        torch.zeros(1, 1, IMAGE_SIZE, IMAGE_SIZE, device=device),
        args.model_dir / "octa_vessel_unet.onnx",
        input_names=["image"],
        output_names=["vessel_logits"],
        opset_version=17,
        dynamo=False,
    )
    (args.model_dir / "train_history.json").write_text(json.dumps({"history": history, "test": test_metrics}, indent=2), encoding="utf-8")
    (args.model_dir / "model_card.json").write_text(json.dumps({
        "name": "Thermoeye OCTA vessel segmentation baseline",
        "scope": "Vessel segmentation only; not AD/MCI classification or diagnosis",
        "image_size": IMAGE_SIZE,
        "device": device,
        "best_validation_dice": best_dice,
        "test": test_metrics,
        "split": split_name,
        "counts": {"train": len(train_rows), "validation": len(val_rows), "test": len(test_rows)},
    }, indent=2), encoding="utf-8")
    print(f"Saved {checkpoint} and ONNX export")


if __name__ == "__main__":
    main()
