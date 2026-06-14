"""
Thermoeye — Diabetic Retinopathy Training Script (APTOS 2019 dataset)
Usage:
  1. Install: pip install -r requirements-train.txt
  2. Download dataset from Kaggle:
       kaggle competitions download -c aptos2019-blindness-detection
       unzip aptos2019-blindness-detection.zip -d data/aptos2019/
  3. Run: python train_dr.py
"""
import os, json, torch, torchvision
import pandas as pd
import numpy as np
from pathlib import Path
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.model_selection import train_test_split

# ─── Config ──────────────────────────────────────────────────────────────────
DATA_DIR   = Path("data/aptos2019")
IMG_DIR    = DATA_DIR / "train_images"
LABELS_CSV = DATA_DIR / "train.csv"
MODEL_OUT  = Path("models/dr_efficientnet.pt")
ONNX_OUT   = Path("models/dr_efficientnet.onnx")
IMG_SIZE   = 224
BATCH      = 16
EPOCHS     = 10
LR         = 3e-4
DEVICE     = "cuda" if torch.cuda.is_available() else "cpu"

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
        img = torchvision.io.read_image(str(img_path)).float() / 255.0
        if img.shape[0] == 1:
            img = img.repeat(3, 1, 1)
        if self.transform:
            img = self.transform(img)
        return img, int(row["diagnosis"])

# ─── Transforms ──────────────────────────────────────────────────────────────
train_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ─── Model ───────────────────────────────────────────────────────────────────
def build_model() -> nn.Module:
    model = models.efficientnet_b4(weights="IMAGENET1K_V1")
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
    return model

# ─── Training loop ───────────────────────────────────────────────────────────
def train():
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(LABELS_CSV)
    train_df, val_df = train_test_split(df, test_size=0.15, stratify=df["diagnosis"], random_state=42)

    train_ds = APTOSDataset(train_df, IMG_DIR, train_tf)
    val_ds   = APTOSDataset(val_df,   IMG_DIR, val_tf)
    train_dl = DataLoader(train_ds, batch_size=BATCH, shuffle=True,  num_workers=4, pin_memory=True)
    val_dl   = DataLoader(val_ds,   batch_size=BATCH, shuffle=False, num_workers=4)

    model = build_model().to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=LR, steps_per_epoch=len(train_dl), epochs=EPOCHS)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0.0
    history = []

    for epoch in range(1, EPOCHS + 1):
        model.train()
        train_loss = 0.0
        for imgs, labels in train_dl:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            loss = criterion(model(imgs), labels)
            loss.backward()
            optimizer.step()
            scheduler.step()
            train_loss += loss.item()

        model.eval()
        correct = total = 0
        with torch.no_grad():
            for imgs, labels in val_dl:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                preds = model(imgs).argmax(1)
                correct += (preds == labels).sum().item()
                total   += len(labels)
        acc = correct / total
        print(f"Epoch {epoch}/{EPOCHS} | loss={train_loss/len(train_dl):.4f} | val_acc={acc:.4f}")
        history.append({"epoch": epoch, "val_acc": acc})
        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), MODEL_OUT)
            print(f"  ✓ Saved best model (acc={acc:.4f})")

    # Export to ONNX for FastAPI inference
    model.load_state_dict(torch.load(MODEL_OUT))
    model.eval()
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    torch.onnx.export(model, dummy, ONNX_OUT, input_names=["image"], output_names=["logits"],
                      dynamic_axes={"image": {0: "batch"}}, opset_version=17)
    print(f"✓ ONNX model exported to {ONNX_OUT}")

    with open("models/train_history.json", "w") as f:
        json.dump({"best_val_acc": best_acc, "history": history}, f, indent=2)
    print(f"✓ Training done. Best val accuracy: {best_acc:.4f}")

if __name__ == "__main__":
    train()
