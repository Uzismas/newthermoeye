# Thermoeye OCTA pipeline

ไฟล์นี้เตรียม pipeline สำหรับการอ่านภาพ OCTA แบบ local โดยแยกเป็น 2 ส่วน:

1. การวัด vessel mask และ central non-vessel fraction (research proxy) จากภาพและ quality gate
2. โมเดลจำแนก Healthy/MCI/AD ซึ่งยังต้องใช้ข้อมูลที่มี label และสิทธิ์ใช้งาน

backend มี endpoint `POST /octa/analyze` แล้ว เมื่อ model artifact หายหรือโหลดไม่ได้จะคืน
`unavailable` พร้อมเหตุผลและ measurements เป็น null โดยไม่มี automatic fallback
`heuristic_research_baseline` ต้องเลือกด้วย `OCTA_SEGMENTATION_ENGINE` อย่างชัดเจนเท่านั้น
classification เป็น `indeterminate` เสมอ ไม่มี risk/confidence หรือ disease classifier
ดูสัญญาข้อมูลและการตรวจล่าสุดใน `docs/ANALYSIS_CONTRACT.md` และ `docs/ENGINEERING_REPORT.md`

## ฝึก vessel segmentation เมื่อมีข้อมูลพร้อม

```powershell
cd backend/train
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-train.txt
python preflight_octa.py --data-dir data/octa
python train_octa_segmentation.py --data-dir data/octa --epochs 30 --batch-size 4
```

ผลลัพธ์จะอยู่ใน `backend/train/models/octa/` และยังต้องผ่าน independent validation ก่อนนำไปใช้
กับผู้ป่วยหรือเปลี่ยนสถานะ release

เมื่อต้องการให้ FastAPI โหลดโมเดล ให้คัดลอก `octa_vessel_unet.onnx` ไปไว้ที่
`backend/models/octa/octa_vessel_unet.onnx` หลังตรวจสอบ model card แล้วเท่านั้น
path เดิม `backend/models/octa_vessel_unet.onnx` เป็น compatibility fallback เฉพาะเมื่อ canonical path ไม่มี

ถ้าเทรนครบแล้วแต่ขั้น export ONNX ถูกขัดจังหวะ ให้ export จาก checkpoint เดิมโดยไม่ต้องเทรนใหม่:

```powershell
python export_octa_artifact.py --data-dir data\octa --model-dir models\octa
Copy-Item models\octa\octa_vessel_unet.onnx ..\models\octa\octa_vessel_unet.onnx -Force
```

สำหรับ ROSE-O ที่ดาวน์โหลดจาก Zenodo ให้แตกไฟล์และสร้าง metadata ด้วย:

```powershell
Expand-Archive -LiteralPath data\ROSE-O.zip -DestinationPath data\rose_o_raw
python prepare_rose_o_metadata.py --source-dir data\rose_o_raw --out-dir data\octa
python preflight_octa.py --data-dir data\octa
```

ตัวเตรียมข้อมูลเลือกภาพ SVC และ SCC vessel ground truth ซึ่งเป็นการจับคู่ภาพ/เส้นเลือดสำหรับ
vessel segmentation เท่านั้น โดยเก็บ published split ของ ROSE-O ไว้เป็น train 30 ภาพ และ test 9 ภาพ
เพื่อไม่ให้ test ปะปนกับการเลือกโมเดล เนื่องจาก archive ไม่ได้แจก subject mapping, `subject_id` ที่
สร้างขึ้นจึงเป็น image identifier ไม่ใช่รหัสผู้ป่วยและไม่อาจอ้างว่าเป็น subject-grouped split ได้

ทดสอบ runtime โดยไม่ต้องใช้ dataset ได้ด้วย:

```powershell
cd backend
.\.venv\Scripts\python.exe train\smoke_octa_pipeline.py
```

## ข้อมูลที่ต้องเตรียม

```text
backend/train/data/octa/
  images/
  vessel_masks/
  faz_masks/
  metadata.csv
```

`metadata.csv` ควรมีอย่างน้อย:

```text
subject_id,image_id,image_path,vessel_mask_path,faz_mask_path,group,device,scan_size
```

ค่า `group` ใช้ `healthy`, `mci`, หรือ `ad` และต้องแบ่ง train/validation/test ตาม
`subject_id` เท่านั้น

ROSE เหมาะสำหรับเริ่มฝึก vessel segmentation ส่วน OCTA-500 เหมาะสำหรับ pretraining
segmentation/retinal-layer แต่ไม่ใช่ AD label โดยอัตโนมัติ ต้องตรวจ license และสิทธิ์ใช้ข้อมูลก่อน

## เกณฑ์ก่อนเชื่อมเป็น clinical screening

- segmentation Dice/IoU จาก held-out subjects
- classifier AUROC, sensitivity, specificity, PPV/NPV และ calibration
- external test set จากอุปกรณ์หรือโรงพยาบาลอื่น
- subgroup analysis และ clinician review
- model card, versioned preprocessing และ audit trail

ห้ามนำ heuristic baseline หรือ literature AUC ไปใช้วินิจฉัยผู้ป่วย
