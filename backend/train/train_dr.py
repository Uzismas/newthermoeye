"""
Thermoeye - Diabetic Retinopathy training baseline (APTOS 2019).

This script is a research baseline only. It is not an OCTA/Alzheimer model
and must not be presented as clinically validated. Keep patient-level groups
intact when a dataset provides a patient/subject identifier.

Usage from backend/train:
  pip install -r requirements-train.txt
  python train_dr.py --data-dir data/aptos2019 --epochs 30
"""
import argparse
import json
import random
from pathlib import Path

import cv2
import torch
import pandas as pd
import numpy as np
from PIL import Image
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.metrics import (
    balanced_accuracy_score,
    confusion_matrix,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold

# ─── Config ──────────────────────────────────────────────────────────────────
IMG_SIZE   = 384
# A 6 GB GPU (for example GTX 1660 Ti) is more likely to fit B3 at 384px with
# batch 8; lower to 4 if the selected augmentation/model still exhausts VRAM.
BATCH      = 8
EPOCHS     = 30
LR         = 1e-4
SEED       = 42
EARLY_STOPPING_PATIENCE = 6

# DR severity grades: 0=No DR, 1=Mild, 2=Moderate, 3=Severe, 4=Proliferative
NUM_CLASSES = 5

# ─── Dataset ─────────────────────────────────────────────────────────────────
class APTOSDataset(Dataset):
    def __init__(self, df: pd.DataFrame, img_dir: Path, transform=None):
        self.df = df.reset_index(drop=True)
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self): return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = self.img_dir / f"{row['id_code']}.png"
        image = Image.open(img_path).convert("RGB")
        image_array = np.asarray(image)
        lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
        lightness, channel_a, channel_b = cv2.split(lab)
        lightness = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lightness)
        image = Image.fromarray(cv2.cvtColor(cv2.merge((lightness, channel_a, channel_b)), cv2.COLOR_LAB2RGB))
        if self.transform:
            image = self.transform(image)
        return image, int(row["diagnosis"])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Thermoeye APTOS DR baseline.")
    parser.add_argument("--data-dir", type=Path, default=Path("data/aptos2019"))
    parser.add_argument("--model-dir", type=Path, default=Path("models"))
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    parser.add_argument("--batch-size", type=int, default=BATCH)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--test-size", type=float, default=0.10)
    parser.add_argument("--val-size", type=float, default=0.10)
    parser.add_argument("--no-pretrained", action="store_true", help="Do not download ImageNet weights.")
    return parser.parse_args()


def seed_everything(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def resolve_patient_groups(df: pd.DataFrame) -> pd.Series:
    """Use an explicit patient id when available; otherwise isolate each image.

    APTOS supplies one labelled image per id_code in its public CSV. Treating
    each id_code as a group prevents accidental image-level leakage and emits
    a warning so the limitation is visible in the training artifact.
    """
    for column in ("patient_id", "patient", "subject_id", "subject"):
        if column not in df.columns:
            continue
        values = df[column].astype("string").str.strip()
        if values.notna().all() and values.ne("").all():
            return values.astype(str).rename(column)
    print("Warning: no patient identifier found; using id_code as one group per image.")
    return df["id_code"].astype(str).rename("id_code")


def _stratified_group_holdout(
    df: pd.DataFrame,
    groups: pd.Series,
    fraction: float,
    random_state: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Return train/holdout positions with groups kept intact and labels stratified."""
    group_count = groups.nunique()
    if group_count < 2:
        raise ValueError("At least two patient/subject groups are required for a split")
    requested_splits = max(2, round(1 / fraction))
    n_splits = min(requested_splits, group_count)
    splitter = StratifiedGroupKFold(
        n_splits=n_splits,
        shuffle=True,
        random_state=random_state,
    )
    candidates = list(splitter.split(df, df["diagnosis"], groups=groups))
    target_count = len(df) * fraction
    return min(candidates, key=lambda pair: abs(len(pair[1]) - target_count))


def split_patient_level(
    df: pd.DataFrame,
    val_size: float,
    test_size: float,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str]:
    if val_size <= 0 or test_size <= 0 or val_size + test_size >= 1:
        raise ValueError("val-size and test-size must be positive and sum to less than 1")

    work_df = df.reset_index(drop=True)
    groups = resolve_patient_groups(work_df).reset_index(drop=True)
    train_idx, test_idx = _stratified_group_holdout(work_df, groups, test_size, SEED)
    remainder = work_df.iloc[train_idx].reset_index(drop=True)
    remainder_groups = groups.iloc[train_idx].reset_index(drop=True)
    val_fraction_of_remainder = val_size / (1 - test_size)
    remainder_train_idx, val_idx = _stratified_group_holdout(
        remainder,
        remainder_groups,
        val_fraction_of_remainder,
        SEED + 1,
    )

    train_df = remainder.iloc[remainder_train_idx].reset_index(drop=True)
    val_df = remainder.iloc[val_idx].reset_index(drop=True)
    test_df = work_df.iloc[test_idx].reset_index(drop=True)
    train_groups = set(groups.iloc[train_idx].iloc[remainder_train_idx])
    val_groups = set(remainder_groups.iloc[val_idx])
    test_groups = set(groups.iloc[test_idx])
    overlap = (train_groups & val_groups) | (train_groups & test_groups) | (val_groups & test_groups)
    if overlap:
        raise RuntimeError(f"Patient leakage detected across train/validation/test split: {len(overlap)} groups")
    for split_name, split_df in (("train", train_df), ("validation", val_df), ("test", test_df)):
        present = set(split_df["diagnosis"].astype(int))
        missing = sorted(set(range(NUM_CLASSES)) - present)
        if missing:
            raise ValueError(
                f"{split_name} split is missing diagnosis classes {missing}; "
                "add more labelled groups or adjust the split sizes before training"
            )
    return train_df, val_df, test_df, str(groups.name or "id_code")


def validation_metrics(labels: list[int], predictions: list[int], probabilities: list[list[float]]) -> dict:
    matrix = confusion_matrix(labels, predictions, labels=list(range(NUM_CLASSES)))
    true_positive = np.diag(matrix)
    false_negative = matrix.sum(axis=1) - true_positive
    false_positive = matrix.sum(axis=0) - true_positive
    true_negative = matrix.sum() - (true_positive + false_negative + false_positive)
    specificity = np.divide(
        true_negative,
        true_negative + false_positive,
        out=np.zeros(NUM_CLASSES, dtype=float),
        where=(true_negative + false_positive) != 0,
    )
    metrics = {
        "balanced_accuracy": float(balanced_accuracy_score(labels, predictions)),
        "macro_sensitivity": float(recall_score(labels, predictions, labels=list(range(NUM_CLASSES)), average="macro", zero_division=0)),
        "macro_specificity": float(np.mean(specificity)),
        "confusion_matrix": matrix.tolist(),
    }
    try:
        metrics["macro_auroc_ovr"] = float(
            roc_auc_score(labels, np.asarray(probabilities), multi_class="ovr", labels=list(range(NUM_CLASSES)))
        )
    except ValueError:
        metrics["macro_auroc_ovr"] = None
        print("Warning: AUROC unavailable because validation lacks one or more classes.")
    return metrics


def evaluate(model: nn.Module, loader: DataLoader, device: str) -> dict:
    model.eval()
    labels_seen: list[int] = []
    predictions: list[int] = []
    probabilities: list[list[float]] = []
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            probabilities.extend(torch.softmax(logits, dim=1).cpu().tolist())
            predictions.extend(logits.argmax(1).cpu().tolist())
            labels_seen.extend(labels.cpu().tolist())
    return validation_metrics(labels_seen, predictions, probabilities)


def class_weights(df: pd.DataFrame) -> torch.Tensor:
    counts = np.bincount(df["diagnosis"].astype(int), minlength=NUM_CLASSES).astype(float)
    if (counts == 0).any():
        missing = np.flatnonzero(counts == 0).tolist()
        raise ValueError(f"Training split is missing diagnosis classes: {missing}")
    weights = len(df) / (NUM_CLASSES * counts)
    return torch.tensor(weights, dtype=torch.float32)


def label_counts(df: pd.DataFrame) -> dict[str, int]:
    return {
        str(label): int((df["diagnosis"].astype(int) == label).sum())
        for label in range(NUM_CLASSES)
    }

# ─── Transforms ──────────────────────────────────────────────────────────────
train_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ─── Model ───────────────────────────────────────────────────────────────────
def build_model(use_pretrained: bool = True) -> nn.Module:
    weights = models.EfficientNet_B3_Weights.DEFAULT if use_pretrained else None
    model = models.efficientnet_b3(weights=weights)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
    return model

# ─── Training loop ───────────────────────────────────────────────────────────
def train(args: argparse.Namespace):
    data_dir = args.data_dir
    img_dir = data_dir / "train_images"
    labels_csv = data_dir / "train.csv"
    model_out = args.model_dir / "dr_efficientnet_b3.pt"
    onnx_out = args.model_dir / "dr_efficientnet_b3.onnx"
    history_out = args.model_dir / "train_history.json"
    split_out = args.model_dir / "split_manifest.json"
    model_card_out = args.model_dir / "model_card.json"

    if not labels_csv.exists() or not img_dir.exists():
        raise FileNotFoundError(
            f"APTOS dataset not found. Expected {labels_csv} and {img_dir}. "
            "Download and de-identify the dataset before training."
        )

    seed_everything()
    args.model_dir.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(labels_csv)
    required_columns = {"id_code", "diagnosis"}
    missing = required_columns.difference(df.columns)
    if missing:
        raise ValueError(f"Dataset CSV is missing required columns: {sorted(missing)}")
    df["id_code"] = df["id_code"].astype(str).str.strip()
    try:
        df["diagnosis"] = pd.to_numeric(df["diagnosis"], errors="raise").astype(int)
    except (TypeError, ValueError) as exc:
        raise ValueError("diagnosis must contain integer grades from 0 to 4") from exc
    if df["id_code"].eq("").any() or df["id_code"].duplicated().any():
        raise ValueError("Dataset CSV must contain unique, non-empty id_code values")
    if not df["diagnosis"].between(0, NUM_CLASSES - 1).all():
        raise ValueError(f"diagnosis must contain integer grades from 0 to {NUM_CLASSES - 1}")
    missing_classes = sorted(set(range(NUM_CLASSES)) - set(df["diagnosis"]))
    if missing_classes:
        raise ValueError(f"Dataset CSV is missing diagnosis classes: {missing_classes}")
    train_df, val_df, test_df, group_source = split_patient_level(df, args.val_size, args.test_size)

    missing_images = [name for name in df["id_code"].astype(str) if not (img_dir / f"{name}.png").exists()]
    if missing_images:
        raise FileNotFoundError(f"Missing {len(missing_images)} image files; first: {missing_images[0]}")
    split_out.write_text(json.dumps({
        "dataset": "APTOS 2019",
        "group_source": group_source,
        "seed": SEED,
        "train_count": len(train_df),
        "validation_count": len(val_df),
        "test_count": len(test_df),
        "train_label_counts": label_counts(train_df),
        "validation_label_counts": label_counts(val_df),
        "test_label_counts": label_counts(test_df),
        "train_ids": train_df["id_code"].astype(str).tolist(),
        "validation_ids": val_df["id_code"].astype(str).tolist(),
        "test_ids": test_df["id_code"].astype(str).tolist(),
    }, indent=2), encoding="utf-8")

    train_ds = APTOSDataset(train_df, img_dir, train_tf)
    val_ds   = APTOSDataset(val_df, img_dir, val_tf)
    test_ds  = APTOSDataset(test_df, img_dir, val_tf)
    train_dl = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers, pin_memory=torch.cuda.is_available())
    val_dl   = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)
    test_dl  = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build_model(use_pretrained=not args.no_pretrained).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.CrossEntropyLoss(weight=class_weights(train_df).to(device))

    best_score = -1.0
    patience = 0
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        for imgs, labels in train_dl:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(imgs), labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        metrics = evaluate(model, val_dl, device)
        score = metrics["macro_auroc_ovr"] if metrics["macro_auroc_ovr"] is not None else metrics["balanced_accuracy"]
        scheduler.step()
        print(f"Epoch {epoch}/{args.epochs} | loss={train_loss/len(train_dl):.4f} | balanced_acc={metrics['balanced_accuracy']:.4f} | auroc={metrics['macro_auroc_ovr']}")
        history.append({"epoch": epoch, "train_loss": train_loss / len(train_dl), **metrics})
        if score > best_score + 1e-4:
            best_score = score
            torch.save(model.state_dict(), model_out)
            print(f"  Saved best model (selection metric={score:.4f})")
            patience = 0
        else:
            patience += 1
            if patience >= EARLY_STOPPING_PATIENCE:
                print(f"  Early stopping after {patience} epochs without validation improvement")
                break

    # Export to ONNX for FastAPI inference
    model.load_state_dict(torch.load(model_out, map_location=device))
    model.eval()
    test_metrics = evaluate(model, test_dl, device)
    print(
        "Test set | "
        f"balanced_acc={test_metrics['balanced_accuracy']:.4f} | "
        f"sensitivity={test_metrics['macro_sensitivity']:.4f} | "
        f"specificity={test_metrics['macro_specificity']:.4f} | "
        f"auroc={test_metrics['macro_auroc_ovr']}"
    )
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(device)
    torch.onnx.export(model, dummy, onnx_out, input_names=["image"], output_names=["logits"],
                      dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}}, opset_version=17)
    print(f"ONNX model exported to {onnx_out}")

    with history_out.open("w", encoding="utf-8") as f:
        json.dump({
            "model_scope": "APTOS diabetic retinopathy classification; not OCTA/Alzheimer",
            "device": device,
            "best_selection_metric": best_score,
            "test_metrics": test_metrics,
            "history": history,
        }, f, indent=2)
    model_card_out.write_text(json.dumps({
        "model_name": "Thermoeye DR EfficientNet-B3 baseline",
        "intended_use": "Research screening support for diabetic retinopathy image classification only",
        "out_of_scope": ["OCTA/Alzheimer risk", "standalone diagnosis", "release without clinician review"],
        "dataset": "APTOS 2019; verify license and de-identification before use",
        "image_size": f"{IMG_SIZE}x{IMG_SIZE}",
        "preprocessing": ["RGB conversion", "CLAHE", "ImageNet normalization"],
        "split": {
            "train": 1 - args.val_size - args.test_size,
            "validation": args.val_size,
            "test": args.test_size,
            "group_source": group_source,
        },
        "training": {
            "epochs_requested": args.epochs,
            "batch_size": args.batch_size,
            "learning_rate": LR,
            "optimizer": "AdamW",
            "scheduler": "CosineAnnealingLR",
            "early_stopping_patience": EARLY_STOPPING_PATIENCE,
            "seed": SEED,
        },
        "test_metrics": test_metrics,
        "limitations": [
            "APTOS is a public fundus dataset and is not an OCTA Alzheimer dataset.",
            "External validation, calibration, subgroup analysis, and prospective clinical validation are still required.",
        ],
    }, indent=2), encoding="utf-8")
    print(f"Training done. Best selection metric: {best_score:.4f}")

if __name__ == "__main__":
    train(parse_args())
