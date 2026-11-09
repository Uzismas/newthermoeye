# แนวทางเทรน AI รูป OCT/OCTA สำหรับ Thermoeye

เริ่มจาก fine-tune โมเดลภาพ ไม่ควรเริ่มจาก train from scratch เพราะต้องใช้ข้อมูลและ GPU จำนวนมากเกินจำเป็นสำหรับ MVP

## ตัวเลือกที่แนะนำ

1. **PyTorch + EfficientNet/ConvNeXt**
   - เหมาะกับ classification เช่น normal, Alzheimer-risk, diabetic retinopathy, glaucoma, AMD
   - โปรเจกต์มีตัวอย่างแล้วที่ `backend/train/train_dr.py`
   - Export เป็น ONNX ได้ เพื่อนำไปใช้ inference ใน FastAPI/Next backend

2. **MONAI**
   - เหมาะกับ medical imaging มากกว่า PyTorch ล้วน
   - ใช้เมื่อเริ่มทำ segmentation, 3D/OCT volume, heatmap, หรือ workflow ทางคลินิกจริงจัง

3. **Roboflow หรือ Label Studio**
   - ใช้จัด dataset และ label รูปโดยไม่ต้องเขียนโค้ดเยอะ
   - Roboflow เหมาะกับเริ่มเร็ว ส่วน Label Studio เหมาะกับงานที่ต้องคุมข้อมูลเอง

4. **Weights & Biases หรือ MLflow**
   - ใช้เก็บ experiment, metric, model version, threshold version
   - สำคัญมากสำหรับระบบแพทย์ เพราะต้องรู้ว่าโมเดลไหนให้ผลอะไรจากข้อมูลชุดไหน

## ชุดข้อมูลเริ่มต้น

- APTOS 2019 Blindness Detection: diabetic retinopathy
- EyePACS: diabetic retinopathy
- REFUGE / RIM-ONE: glaucoma
- PALM: pathologic myopia
- OCT2017 / Kermany: OCT disease baseline

สำหรับ Alzheimer-risk จาก OCTA ต้องระวังเป็นพิเศษ เพราะ public dataset ที่ label ตรงโรคนี้มีจำกัด ควรเริ่มจาก research/reference dataset, label จากแพทย์, และรายงานผลเป็น screening support เท่านั้น

## ขั้นตอนทำงาน

1. เก็บรูปและ label ให้เป็นมาตรฐาน เช่น `dataset/train/<class>` และ `dataset/val/<class>`
2. ลบข้อมูลระบุตัวบุคคลจากไฟล์และ metadata ก่อนนำเข้า training
3. แยกข้อมูลแบบ patient-level split ห้ามให้รูปของคนเดียวกันไปอยู่ทั้ง train และ validation
4. Fine-tune EfficientNet/ConvNeXt ด้วย PyTorch หรือ MONAI
5. วัดผลด้วย AUC, sensitivity, specificity, confusion matrix, calibration และ subgroup performance
6. Export เป็น ONNX แล้วต่อกับ backend inference
7. เก็บ model card, dataset version, threshold version, และ audit log ทุกครั้ง

## คำสั่งเริ่มต้นจาก script ที่มีอยู่

```powershell
cd backend/train
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-train.txt
python preflight.py
python train_dr.py --data-dir data/aptos2019 --epochs 30
```

ก่อนรันจริงต้องดาวน์โหลด dataset ที่มีสิทธิ์ใช้งาน, de-identify และจัดวางไว้ตามโครงสร้างใน `backend/train/README_TH.md` ถ้า `preflight.py` ขึ้น `[FAIL]` แปลว่ายังไม่มีข้อมูลพร้อมเทรน และห้ามใช้ fixture/synthetic images แทน dataset ผู้ป่วย

ผลจาก script นี้เป็น baseline ของ **Diabetic Retinopathy จาก APTOS เท่านั้น** ไม่ใช่ Alzheimer/OCTA และไม่ใช่ clinical validation โดย script จะบันทึก patient-level split (ถ้ามี patient id), AUROC, sensitivity, specificity, balanced accuracy, confusion matrix และ ONNX artifact เพื่อให้ตรวจสอบต่อได้

## สิ่งที่ไม่ควรทำ

- ไม่ควรใช้รูปคนไข้จริงโดยยังไม่ de-identify
- ไม่ควรใช้ accuracy อย่างเดียวในการตัดสินโมเดล
- ไม่ควรบอกว่าเป็น diagnosis หากยังไม่มี validation ทางคลินิก
- ไม่ควร train/validate โดยสุ่มระดับรูปภาพถ้าผู้ป่วยคนเดียวกันมีหลายรูป
