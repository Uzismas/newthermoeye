# Internet Reference Images

โฟลเดอร์นี้คือรูป reference ที่ดาวน์โหลดจากลิงก์อ้างอิงที่ให้ไว้ ใช้สำหรับดูตัวอย่างภาพจริง/ภาพจากบทความ ไม่ใช่ dataset สำหรับ train และไม่ใช่ patient data ของระบบเรา

## รูปที่มี

1. `01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg`
   - ควรจัดเป็น: Alzheimer Risk
   - คืออะไร: รูปเปรียบเทียบ OCTA จาก Duke Eye Center ระหว่าง cognitively healthy adult กับ adult with Alzheimer's disease
   - แหล่งที่มา: https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms

2. `02_diabetic-retinopathy_springer-fa-octa-comparison.png`
   - ควรจัดเป็น: Diabetic Retinopathy
   - คืออะไร: รูปจากบทความ Eye and Vision/Springer เปรียบเทียบ angiography/OCTA ใน diabetic retinopathy
   - แหล่งที่มา: https://eandv.biomedcentral.com/articles/10.1186/s40662-019-0160-3

3. `03_diabetic-retinopathy_springer-montaged-octa.png`
   - ควรจัดเป็น: Diabetic Retinopathy
   - คืออะไร: montaged OCTA/vascular non-perfusion reference จากบทความ diabetic retinopathy
   - แหล่งที่มา: https://eandv.biomedcentral.com/articles/10.1186/s40662-019-0160-3

4. `04_normal_eyewiki-healthy-octa-disc.png`
   - ควรจัดเป็น: Normal
   - คืออะไร: OCTA optic nerve/disc ตัวอย่าง healthy จาก EyeWiki
   - แหล่งที่มา: https://eyewiki.org/OCT-Angiography_and_Glaucoma

5. `05_glaucoma_eyewiki-glaucomatous-octa-disc.png`
   - ควรจัดเป็น: Glaucoma
   - คืออะไร: OCTA optic nerve/disc ตัวอย่าง glaucomatous จาก EyeWiki
   - แหล่งที่มา: https://eyewiki.org/OCT-Angiography_and_Glaucoma

6. `06_amd_amdbook-type1-cnv-octa.png`
   - ควรจัดเป็น: AMD
   - คืออะไร: multimodal/OCTA AMD case ที่มี CNV pattern จาก AMD Book
   - แหล่งที่มา: https://amdbook.org/content/optical-coherence-tomography-age-related-macular-degeneration

7. `07_amd_amdbook-type2-cnv-octa.png`
   - ควรจัดเป็น: AMD
   - คืออะไร: multimodal/OCTA AMD case อีก pattern จาก AMD Book
   - แหล่งที่มา: https://amdbook.org/content/optical-coherence-tomography-age-related-macular-degeneration

8. `08_pathologic-myopia_eyerounds-oct-cnvm-lacquer-crack.jpg`
   - ควรจัดเป็น: Pathologic Myopia
   - คืออะไร: OCT จาก EyeRounds case pathologic myopia ที่เกี่ยวกับ CNVM/lacquer crack
   - แหล่งที่มา: https://eyerounds.org/cases/310-pathologic-myopia.htm

9. `09_pathologic-myopia_eyerounds-fundus-lacquer-crack.jpg`
   - ควรจัดเป็น: Pathologic Myopia
   - คืออะไร: fundus image จาก EyeRounds case pathologic myopia/lacquer crack
   - แหล่งที่มา: https://eyerounds.org/cases/310-pathologic-myopia.htm

## หมายเหตุ

- รูปเหล่านี้ใช้เป็น reference/test review เท่านั้น
- ยังไม่ควรนำไปใช้เป็น train set เพราะจำนวนน้อยมากและสิทธิ์การใช้งานต้องตรวจละเอียดก่อนเผยแพร่
- ถ้าเอาไป upload ในเว็บตอนนี้ ผลอาจไม่ตรง 100% เพราะเว็บยังเป็น demo ruleset ไม่ใช่โมเดลที่ train จากภาพจริง
