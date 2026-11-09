# Training baseline สำหรับ Thermoeye

ดูเกณฑ์คัดเลือกและแผนเพิ่ม dataset ได้ที่ [DATASET_REVIEW_TH.md](DATASET_REVIEW_TH.md)

ชุดนี้เป็น baseline สำหรับ **Diabetic Retinopathy จาก APTOS 2019** เท่านั้น
ยังไม่ใช่โมเดล OCTA/Alzheimer และยังห้ามใช้เป็นเครื่องมือวินิจฉัยหรือ release ผลกับผู้ป่วยจริง

## เตรียมข้อมูล

ดาวน์โหลด dataset จากแหล่งที่มีสิทธิ์ใช้งาน แล้ววางโครงสร้างดังนี้:

```text
backend/train/data/aptos2019/
  train.csv
  train_images/
    <id_code>.png
```

ห้ามใส่ข้อมูลผู้ป่วยจริงใน git หรือใน `public/` และต้อง de-identify ตามสิทธิ์/การอนุมัติของโครงการก่อนเทรน

ถ้าใช้ Kaggle CLI และมีสิทธิ์เข้าถึงการแข่งขัน APTOS 2019:

```powershell
cd backend/train
kaggle competitions download -c aptos2019-blindness-detection -p data\aptos2019
Expand-Archive data\aptos2019\aptos2019-blindness-detection.zip -DestinationPath data\aptos2019 -Force
```

ตรวจสอบชื่อไฟล์และสิทธิ์ใช้งานก่อนเทรนจริง หากไฟล์ถูกแตกเป็นโฟลเดอร์ซ้อน ให้ย้าย `train.csv` และ `train_images/` มาไว้ใต้ `data/aptos2019/` โดยตรง

## ติดตั้งและรัน

```powershell
cd backend/train
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-train.txt
python preflight.py
python train_dr.py --data-dir data/aptos2019 --epochs 30 --batch-size 8
```

`preflight.py` ต้องผ่านก่อนจึงเริ่มเทรนได้ โดยจะหยุดถ้า label ไม่ครบ 0–4, มีรูปหาย, id ซ้ำ หรือมี patient identifier ที่ใช้แบ่งกลุ่มไม่ได้

เครื่องที่มี GPU VRAM 6 GB ให้เริ่มที่ `--batch-size 8`; ถ้าเจอ CUDA out-of-memory ให้ลดเป็น `4` โดยไม่เปลี่ยน test split หรือ seed

ถ้าเครื่องไม่มี GPU ให้ใช้ `--num-workers 0 --no-pretrained` เพื่อไม่ดาวน์โหลด ImageNet weights; การเทรนจะช้าลงและผลยังเป็นเพียง baseline

ผลลัพธ์จะถูกเขียนไว้ใน `backend/train/models/`:

- `dr_efficientnet_b3.pt` และ `dr_efficientnet_b3.onnx`
- `train_history.json` พร้อม validation/test balanced accuracy, sensitivity, specificity, AUROC และ confusion matrix
- `split_manifest.json` พร้อมรายการ train/validation/test และแหล่ง group ที่ใช้ป้องกัน patient leakage
- `model_card.json` ระบุ intended use, out-of-scope, preprocessing และข้อจำกัดของโมเดล

ก่อนนำ model ไปต่อกับ inference ต้องมี independent test set, calibration, subgroup analysis, clinician review และ model card เพิ่มเติมก่อนเสมอ
