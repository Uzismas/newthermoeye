"""Controlled OCTA vessel-segmentation experiment (research only).

Compares training configurations with k-fold cross-validation on the published
ROSE-O *train* partition, then trains one final model on all train images and
evaluates it ONCE on the published test partition. The test partition is never
used for choosing a configuration. Nothing here replaces the deployed artifact;
output goes to --out-dir and must be promoted by hand after review.

Caveat: subject_id values are image-derived (the archive has no patient map), so
folds are image-level and may leak between layers of the same eye. Report the
numbers as such.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch import nn
from torchvision.transforms import InterpolationMode, functional as TF

from train_octa_segmentation import IMAGE_SIZE, SmallUNet, soft_dice_loss


def load(rows, root):
    imgs, masks = [], []
    for r in rows:
        im = TF.resize(Image.open(root / r["image_path"]).convert("L"), [IMAGE_SIZE, IMAGE_SIZE])
        mk = TF.resize(Image.open(root / r["vessel_mask_path"]).convert("L"), [IMAGE_SIZE, IMAGE_SIZE], interpolation=InterpolationMode.NEAREST)
        imgs.append(TF.to_tensor(im))
        masks.append((TF.to_tensor(mk) > 0.5).float())
    return torch.stack(imgs), torch.stack(masks)


def augment(x, y, gen):
    """Geometric ops are applied to image and mask together; intensity ops to image only."""
    if torch.rand(1, generator=gen) < 0.5:
        x, y = x.flip(-1), y.flip(-1)
    if torch.rand(1, generator=gen) < 0.5:
        x, y = x.flip(-2), y.flip(-2)
    k = int(torch.randint(0, 4, (1,), generator=gen))
    x, y = torch.rot90(x, k, (-2, -1)), torch.rot90(y, k, (-2, -1))
    # small rotation / scale / shift
    angle = float(torch.empty(1).uniform_(-15, 15, generator=gen))
    scale = float(torch.empty(1).uniform_(0.9, 1.1, generator=gen))
    tx, ty = (int(v) for v in torch.randint(-16, 17, (2,), generator=gen))
    x = TF.affine(x, angle, [tx, ty], scale, 0.0, interpolation=InterpolationMode.BILINEAR)
    y = TF.affine(y, angle, [tx, ty], scale, 0.0, interpolation=InterpolationMode.NEAREST)
    gamma = float(torch.empty(1).uniform_(0.8, 1.25, generator=gen))
    gain = float(torch.empty(1).uniform_(0.85, 1.15, generator=gen))
    x = (x.clamp(0, 1) ** gamma * gain).clamp(0, 1)
    return x, (y > 0.5).float()


@torch.no_grad()
def evaluate(model, x, y):
    model.eval()
    p = (torch.sigmoid(model(x)) > 0.5).float()
    tp = (p * y).sum((1, 2, 3)); fp = (p * (1 - y)).sum((1, 2, 3))
    fn = ((1 - p) * y).sum((1, 2, 3)); tn = ((1 - p) * (1 - y)).sum((1, 2, 3))
    e = 1e-6
    per = {
        "dice": ((2 * tp + e) / (2 * tp + fp + fn + e)),
        "iou": ((tp + e) / (tp + fp + fn + e)),
        "sensitivity": ((tp + e) / (tp + fn + e)),
        "specificity": ((tn + e) / (tn + fp + e)),
    }
    return {k: float(v.mean()) for k, v in per.items()}, [float(d) for d in per["dice"]]


def train(xs, ys, epochs, aug, seed, batch=4, lr=3e-4):
    torch.manual_seed(seed)
    gen = torch.Generator().manual_seed(seed)
    model = SmallUNet()
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    steps_total = epochs * math.ceil(len(xs) / batch)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=steps_total)
    bce = nn.BCEWithLogitsLoss()
    for _ in range(epochs):
        model.train()
        perm = torch.randperm(len(xs), generator=gen)
        for i in range(0, len(xs), batch):
            idx = perm[i:i + batch]
            bx, by = xs[idx], ys[idx]
            if aug:
                pairs = [augment(a, b, gen) for a, b in zip(bx, by)]
                bx = torch.stack([p[0] for p in pairs]); by = torch.stack([p[1] for p in pairs])
            logits = model(bx)
            loss = bce(logits, by) + soft_dice_loss(logits, by)
            opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); sched.step()
    return model  # final-epoch weights: no best-epoch picking, so no selection bias


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, default=Path("train/data/octa"))
    ap.add_argument("--out-dir", type=Path, default=Path("models/octa_candidate"))
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--configs", default="noaug,aug")
    ap.add_argument("--threads", type=int, default=16)
    ap.add_argument("--final", default="", help="config to train on all train images and test once")
    args = ap.parse_args()
    torch.set_num_threads(args.threads)

    with (args.data_dir / "metadata.csv").open(newline="", encoding="utf-8-sig") as h:
        rows = list(csv.DictReader(h))
    tr = [r for r in rows if r["source_split"] == "train"]
    te = [r for r in rows if r["source_split"] == "test"]
    xs, ys = load(tr, args.data_dir)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    report = {"epochs": args.epochs, "folds": args.folds, "seed": args.seed, "n_train": len(tr), "n_test": len(te), "cv": {}}

    order = np.random.RandomState(args.seed).permutation(len(tr))
    fold_ids = np.array_split(order, args.folds)
    for cfg in [c for c in args.configs.split(",") if c]:
        scores = []
        t0 = time.time()
        for f, val_idx in enumerate(fold_ids):
            tr_idx = np.setdiff1d(order, val_idx)
            m = train(xs[tr_idx], ys[tr_idx], args.epochs, cfg == "aug", args.seed + f)
            met, _ = evaluate(m, xs[val_idx], ys[val_idx])
            scores.append(met)
            print(f"[{cfg}] fold {f + 1}/{args.folds} dice={met['dice']:.4f} ({time.time() - t0:.0f}s)", flush=True)
        report["cv"][cfg] = {
            "dice_mean": float(np.mean([s["dice"] for s in scores])),
            "dice_std": float(np.std([s["dice"] for s in scores])),
            "iou_mean": float(np.mean([s["iou"] for s in scores])),
            "folds": scores,
        }
        print(f"[{cfg}] CV dice {report['cv'][cfg]['dice_mean']:.4f} +/- {report['cv'][cfg]['dice_std']:.4f}", flush=True)
        (args.out_dir / "experiment_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    if args.final:
        xt, yt = load(te, args.data_dir)
        m = train(xs, ys, args.epochs, args.final == "aug", args.seed)
        met, per = evaluate(m, xt, yt)
        report["final"] = {"config": args.final, "test": met, "test_per_image_dice": per, "note": "test partition evaluated once, after configuration was fixed by CV"}
        torch.save(m.state_dict(), args.out_dir / "octa_vessel_unet.pt")
        torch.onnx.export(m, torch.zeros(1, 1, IMAGE_SIZE, IMAGE_SIZE), args.out_dir / "octa_vessel_unet.onnx",
                          input_names=["image"], output_names=["vessel_logits"], opset_version=17, dynamo=False)
        print(f"FINAL [{args.final}] test dice={met['dice']:.4f} iou={met['iou']:.4f} sens={met['sensitivity']:.4f} spec={met['specificity']:.4f}")
        (args.out_dir / "experiment_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
