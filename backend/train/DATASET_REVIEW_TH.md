# รีวิว Dataset และแผนเพิ่มข้อมูล Thermoeye

เอกสารนี้รีวิวจากแหล่งอ้างอิงที่ให้มา และใช้กำหนดข้อมูลที่อนุญาตให้นำเข้า
training pipeline เท่านั้น ไม่ใช่หลักฐานว่าโมเดลสามารถวินิจฉัยโรคได้

## สรุปสั้น

ข้อมูลจำนวนมากไม่ได้แปลว่าเป็นข้อมูลชนิดเดียวกัน ภาพ OCTA, ภาพ structural OCT
และภาพ fundus ต้องแยกโมเดลหรืออย่างน้อยแยก preprocessing/label space ออกจากกัน
ห้ามนำ label จากบทความหรือชื่อโฟลเดอร์มาตีความเป็น AD/MCI โดยไม่มี patient-level
ground truth และสิทธิ์ใช้งานชัดเจน

## จัดกลุ่มแหล่งข้อมูล

| แหล่งข้อมูล | modality | ใช้ทำอะไรได้ | สถานะ/ข้อควรระวัง |
|---|---|---|---|
| ROSE / ROSE-O (Zenodo 12775880) | OCTA en-face, vessel/FAZ masks | vessel และ FAZ segmentation | ได้รับอนุญาตแล้ว; archive ที่ใช้ตอนนี้มี 39 eyes หรือ 117 layer images; ไม่มี AD/MCI classifier label ที่เพียงพอ |
| OCTA-500 | OCTA/volume และ annotations | pretraining vessel/layer segmentation | ต้องตรวจเงื่อนไขการดาวน์โหลดและ license ของ record/version ก่อนใช้; ห้ามสมมติว่าเป็น AD label |
| OCTDL / Kermany | structural OCT B-scan | แยกโรคตา เช่น AMD, DME, CNV, normal | ไม่ใช่ OCTA; ใช้กับโมเดล structural-OCT แยก branch เท่านั้น |
| MESSIDOR2 / APTOS | fundus photograph | DR classification | ไม่ใช่ OCT/OCTA; label และภาพใช้แทนกันไม่ได้ |
| DRIVE / STARE | fundus photograph + vessel masks | generic vessel pretraining/algorithm QA | ไม่ใช่ OCTA; domain gap สูง จึงไม่ควรใช้เป็น clinical OCTA metric |
| RIM-ONE | fundus/optic-disc image | glaucoma research | ไม่ใช่ OCTA; ตรวจ license และ subject split ก่อนใช้ |
| PALM / myopia sets | fundus photograph | high-myopia screening | ไม่ใช่ OCTA และ label ไม่ใช่ segmentation ของ OCTA |
| Kaggle/Mendeley mirrors | แล้วแต่ชุด | ใช้ได้เฉพาะเมื่อยืนยัน source/license | ห้ามนำ mirror ไปใช้เพียงเพราะดาวน์โหลดได้; ต้องเก็บ URL, version, license, checksum และ permission |

## รีวิวข้ออ้างทางการแพทย์

บทความที่อ้างถึงสนับสนุนว่ากลุ่ม AD/MCI อาจมี vessel density, FAZ และ retinal
layer thickness แตกต่างจากกลุ่มควบคุมในบาง cohort แต่เป็นหลักฐานระดับงานวิจัย
ไม่ใช่ label สำหรับสร้าง classifier จากภาพของ dataset อื่น ค่าที่รายงานยังขึ้นกับ
อุปกรณ์, scan size, segmentation protocol, อายุ, เบาหวาน, ความดัน, glaucoma,
สายตาสั้น และคุณภาพภาพด้วย

ดังนั้น:

- ROSE ใช้ฝึก “หาเส้นเลือด/FAZ” ได้ แต่ไม่ควรใช้ยืนยัน Alzheimer หรือ MCI
- ค่า VD/FAZ จากคนละเครื่องหรือคนละ scan protocol ห้ามนำมาเทียบตรง ๆ โดยไม่ทำ normalization
- ภาพตัวอย่างจาก ResearchGate, EyeWiki หรือบทความใช้เป็น reference/QA เท่านั้น ไม่ใช่ training data
- ห้ามสร้าง AD/MCI label จากข้อความในบทความ, ชื่อไฟล์, หรือค่า risk ที่คำนวณเอง

## แผนเพิ่มข้อมูลแบบประหยัดและปลอดภัย

### Phase 1: เพิ่ม segmentation ก่อน

1. ใช้ ROSE-O ที่ได้รับอนุญาตแล้วเป็นชุดหลัก: SVC + SCC vessel mask และเก็บ official train/test split
2. ดาวน์โหลด ROSE.zip เพิ่มจาก record เดียวกัน แล้วเตรียม SVC/DVC/IVC และ annotation เป็น subset แยกกัน
3. ตรวจ OCTA-500 เฉพาะ version ที่มี license/permission ชัดเจน แล้วใช้เป็น external segmentation set หรือ pretraining
4. ห้ามรวมภาพจากคนละ protocol ใน metadata เดียวโดยไม่เก็บ `device`, `scan_size`, `layer` และ `source_split`
5. ประเมิน Dice, IoU, sensitivity, specificity และผลรายภาพ; test set ต้องไม่ถูกใช้เลือก threshold/epoch

### Phase 2: เพิ่ม structural-OCT eye disease branch

แยกโมเดลและ preprocessing สำหรับ OCTDL/Kermany โดยเริ่มจากโรคที่มี label ชัด เช่น
AMD, DME, CNV และ normal ไม่ใช้ผล branch นี้เป็นผล OCTA หรือ Alzheimer

### Phase 3: ทำ AD/MCI research classifier

ต้องหาชุดข้อมูลที่มี patient-level diagnosis หรือ biomarker ที่เชื่อถือได้ พร้อม subject ID,
อายุ, เพศ, device, scan protocol และสิทธิ์ใช้เพื่อ model training ก่อนเริ่ม phase นี้
ข้อมูล cohort เช่น UK Biobank/AlzEye มักต้องขอสิทธิ์และไม่ควรพยายามหลบข้อจำกัด

เกณฑ์ขั้นต่ำก่อน train classifier:

- มีอย่างน้อย Healthy/MCI/AD labels จากแหล่งเดียวกันหรือ protocol ที่ harmonize แล้ว
- แบ่ง train/validation/test ตาม subject ไม่ใช่สุ่มตามภาพหรือ eye
- มี external test set และ clinician review
- รายงาน AUROC, sensitivity, specificity, PPV/NPV, calibration และ subgroup analysis

## Metadata ที่ต้องเก็บทุกภาพ

```text
dataset,record_url,version,license,permission_status
subject_id,eye_id,image_id,modality,layer,device,scan_size
image_path,vessel_mask_path,faz_mask_path,disease_label,source_split
```

หากไม่มี `subject_id` จริง ให้ใส่ `subject_id_status=missing` และห้ามอ้างว่าเป็น
subject-grouped split (ROSE-O ที่เตรียมตอนนี้ใช้ image identifier เพื่อป้องกันการแต่งข้อมูล)

## เกณฑ์ตัดสินใจข้อมูลชุดใหม่

รับเข้า training pipeline เมื่อผ่านทุกข้อ:

1. ยืนยัน license/permission และเก็บ URL กับ version
2. ยืนยัน modality ว่าเป็น OCTA หรือ structural OCT ตรงกับ branch
3. ตรวจภาพและ mask จำนวนเท่ากัน, ขนาด/format อ่านได้ และไม่มีไฟล์เสีย
4. ตรวจ subject/eye duplicates และกำหนด split ก่อน train
5. สร้าง checksum/manifest และเก็บข้อมูลไว้ในโฟลเดอร์ที่ git ignore

## สถานะวันนี้

- ROSE-O: เตรียมแล้ว 39 image/mask pairs, preflight ผ่าน, test Dice ของ baseline `0.7078`
- โมเดลที่เชื่อม backend: vessel segmentation ONNX เท่านั้น
- AD/MCI classifier: ยังไม่มีข้อมูลที่มี label และยังคง `indeterminate`
- ข้อมูลชุดถัดไปที่คุ้มค่าที่สุด: ดาวน์โหลด ROSE.zip เพิ่ม แล้วทำ metadata แยก SVC/DVC/IVC ก่อนพิจารณา OCTA-500
