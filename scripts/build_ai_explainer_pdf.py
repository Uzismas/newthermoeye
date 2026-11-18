"""Thai explainer PDF: how the Eyezheimer AI works, what every number means, and the formulas.
Run: backend/.venv/Scripts/python.exe scripts/build_ai_explainer_pdf.py  ->  D:/Themoeye/Eyezheimer_AI_Explained_TH.pdf
Numbers come from backend/app/octa_pipeline.py and features/clinical-console/{alzheimer-risk,model-evaluation}.ts.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUT = Path("D:/Themoeye/Eyezheimer_AI_Explained_TH.pdf")
pdfmetrics.registerFont(TTFont("Tahoma", "C:/Windows/Fonts/tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", "C:/Windows/Fonts/tahomabd.ttf"))
NAVY, BLUE, INK, MUTED, LINE, PALE = (colors.HexColor(c) for c in ("#082B45", "#087AAE", "#1E3040", "#526B7E", "#D4E1EA", "#F1F7FA"))
S = {
    "title": ParagraphStyle("t", fontName="Tahoma-Bold", fontSize=20, leading=28, textColor=NAVY, spaceAfter=4),
    "sub": ParagraphStyle("s", fontName="Tahoma", fontSize=10, leading=15, textColor=MUTED, spaceAfter=10),
    "h1": ParagraphStyle("h1", fontName="Tahoma-Bold", fontSize=14, leading=20, textColor=NAVY, spaceBefore=12, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Tahoma-Bold", fontSize=11, leading=16, textColor=BLUE, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="Tahoma", fontSize=9.5, leading=15, textColor=INK, spaceAfter=4, wordWrap="CJK"),
    "f": ParagraphStyle("f", fontName="Tahoma-Bold", fontSize=9.5, leading=15, textColor=NAVY, backColor=PALE, borderPadding=5, spaceBefore=3, spaceAfter=7, wordWrap="CJK"),
    "cell": ParagraphStyle("c", fontName="Tahoma", fontSize=8.3, leading=12, textColor=INK, wordWrap="CJK"),
    "head": ParagraphStyle("hd", fontName="Tahoma-Bold", fontSize=8.3, leading=12, textColor=colors.white, wordWrap="CJK"),
}
story = []
h1 = lambda t: story.append(Paragraph(t, S["h1"]))
h2 = lambda t: story.append(Paragraph(t, S["h2"]))
p = lambda t: story.append(Paragraph(t, S["p"]))
f = lambda t: story.append(Paragraph(t, S["f"]))


def table(rows, widths):
    data = [[Paragraph(str(c), S["head"] if i == 0 else S["cell"]) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), BLUE), ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    story.extend([t, Spacer(1, 6)])


story.append(Paragraph("Eyezheimer: AI ทำงานอย่างไร และตัวเลขแต่ละค่าหมายถึงอะไร", S["title"]))
story.append(Paragraph("เอกสารสรุปสำหรับทีม · อ้างอิงจากโค้ดจริงของระบบ (พฤศจิกายน 2569) · ใช้เพื่อการวิจัย ไม่ใช่เครื่องมือวินิจฉัยโรค", S["sub"]))

h1("1. ภาพรวม: ระบบทำอะไรบ้าง")
p("ผู้ใช้อัปโหลดภาพ OCTA ของจอประสาทตา (ภาพหน้าตรง ชั้นผิว ขนาด 3×3 มม.) ระบบจะทำงาน 6 ขั้นตามลำดับ:")
table([
    ["ขั้น", "ระบบทำอะไร", "ใช้อะไรทำ"],
    ["1. รับภาพ", "ตรวจชนิดไฟล์ (PNG, JPEG, TIFF, WebP) ขนาดไม่เกิน 8 MB แล้วแปลงเป็นภาพขาวดำ", "Python + Pillow"],
    ["2. ด่านคัดกรองภาพ", "ปฏิเสธภาพที่ไม่ใช่ OCTA เช่น ภาพถ่าย ภาพวาด ภาพหน้าจอ และภาพคุณภาพต่ำ", "สูตรสถิติของภาพ (ไม่ใช่ AI)"],
    ["3. แยกเส้นเลือด", "AI ทำนายทีละพิกเซลว่าเป็นเส้นเลือดหรือไม่ ได้ภาพเส้นเลือดขาวบนพื้นดำ", "โมเดล U-Net (Deep Learning)"],
    ["4. หา FAZ", "หาบริเวณมืดกลางภาพที่ไม่มีเส้นเลือด แล้ววัดพื้นที่เป็น mm²", "อัลกอริทึมประมวลผลภาพ"],
    ["5. คำนวณค่า", "ความหนาแน่นเส้นเลือด, Perfusion, FAZ, ดัชนี Alzheimer, % ความเสี่ยง", "สูตรคณิตศาสตร์ (หัวข้อ 4–5)"],
    ["6. แสดงผล", "หน้า Analysis Result, รายงาน PDF, ไฟล์ DICOM", "เว็บแอป Next.js"],
], [27, 95, 48])

h1("2. เทคโนโลยีที่ใช้")
table([
    ["ส่วน", "เทคโนโลยี", "หน้าที่"],
    ["หน้าเว็บ (Front-end)", "Next.js 16, React 19, TypeScript", "หน้าจอ 5 โมดูล กราฟ รายงาน"],
    ["ส่วนหลัง (Back-end)", "FastAPI (Python)", "รับภาพ เรียกโมเดล ส่งผลกลับ"],
    ["เทรนโมเดล", "PyTorch", "สอนโมเดล U-Net จากภาพที่ผู้เชี่ยวชาญวาดเส้นเลือดไว้"],
    ["รันโมเดลจริง", "ONNX Runtime (บน CPU)", "ใช้โมเดลที่เทรนเสร็จแล้วทำนายภาพใหม่"],
    ["คำนวณภาพ", "NumPy, Pillow", "หา FAZ, Perfusion, คุณภาพภาพ"],
    ["ความปลอดภัยของผล", "HMAC-SHA256", "เซ็นผลการวิเคราะห์ ป้องกันการแก้ตัวเลขระหว่างทาง"],
    ["ข้อมูลที่ใช้", "ROSE-O (ROSE-1): 117 ภาพ จาก 39 คน", "ใช้ชั้น SVC: เทรน 30 คน, ทดสอบ 9 คน"],
], [38, 55, 77])

h1("3. หลักการทำงานของ AI (U-Net)")
p("U-Net เป็นโครงข่ายประสาทเทียมแบบคอนโวลูชัน (CNN) ที่ออกแบบมาเพื่อแบ่งส่วนภาพทางการแพทย์ "
  "หน้าที่ของมันคือดูภาพทีละพิกเซลแล้วตอบว่า “พิกเซลนี้เป็นเส้นเลือดหรือไม่” โครงสร้างเป็นรูปตัว U:")
table([
    ["ส่วน", "ทำอะไร"],
    ["Encoder (ขาลง)", "ย่อภาพลงทีละครึ่ง 3 ครั้ง (256 → 128 → 64 → 32 พิกเซล) เพื่อเข้าใจภาพรวม เช่น ทิศทางของเส้นเลือด จำนวนตัวกรอง 32 → 64 → 128 → 256"],
    ["Decoder (ขาขึ้น)", "ขยายภาพกลับทีละสองเท่าจนเท่าเดิม เพื่อระบุตำแหน่งเส้นเลือดให้แม่นยำ"],
    ["Skip connection", "ส่งรายละเอียดจากขาลงข้ามไปขาขึ้นโดยตรง ทำให้เส้นเลือดฝอยเล็กๆ ไม่หาย"],
    ["Output", "ตัวเลข 1 ค่าต่อพิกเซล แปลงเป็นความน่าจะเป็นด้วย sigmoid"],
], [35, 135])
h2("ขั้นตอนตอนใช้งานจริง")
f("ภาพขาวดำ → ย่อเป็น 256×256 → หารด้วย 255 (ให้ค่าอยู่ระหว่าง 0–1) → U-Net → ความน่าจะเป็น p = 1 / (1 + e^(−logit)) → ถ้า p &gt; 0.5 ถือเป็นเส้นเลือด → ขยายกลับเป็นขนาดเดิม")
h2("ตอนเทรน")
p("โมเดลเรียนจากภาพ 30 คนในชุดฝึกที่ผู้เชี่ยวชาญวาดเส้นเลือดไว้ ใช้ loss = BCE + Soft Dice "
  "(BCE วัดความผิดทีละพิกเซล, Dice วัดความซ้อนทับของทั้งภาพ) และ optimizer AdamW (learning rate 0.0002) 30 รอบ (epoch) "
  "โมเดลไม่เคยเห็นภาพ 9 คนในชุดทดสอบ ผลความแม่นยำทั้งหมดจึงวัดจาก 9 คนนี้")

h1("4. ตัวเลขบนหน้าผลวิเคราะห์ หมายถึงอะไร")
h2("4.1 ค่าจากภาพเส้นเลือด")
table([
    ["ค่า", "ความหมาย", "สูตร"],
    ["Vessel density proxy (%)", "สัดส่วนพื้นที่ภาพที่เป็นเส้นเลือด ผู้ป่วยอัลไซเมอร์มักมีค่านี้ลดลง", "จำนวนพิกเซลเส้นเลือด ÷ จำนวนพิกเซลทั้งภาพ × 100"],
    ["Central non-vessel fraction (%)", "สัดส่วนที่ไม่มีเส้นเลือดในกรอบกลางภาพ (กว้าง 30% ของภาพ) เป็นค่าประมาณคร่าวๆ ไม่ใช่ FAZ จริง", "(1 − สัดส่วนเส้นเลือดในกรอบกลาง) × 100"],
    ["Perfusion density proxy (%)", "สัดส่วนพื้นที่ที่มีสัญญาณการไหลเวียนเลือด ใช้ FAZ เป็นตัวอ้างอิงเพราะ FAZ ไม่มีเลือดไหล สัญญาณใน FAZ จึงเป็น noise ของเครื่อง", "% ของพิกเซลที่สว่างกว่า (ค่าเฉลี่ยใน FAZ + 3 × SD ใน FAZ)"],
], [40, 75, 55])
h2("4.2 ค่าคุณภาพภาพ (Image quality)")
table([
    ["ค่า", "สูตร (g = ความสว่างพิกเซล 0–1)"],
    ["Brightness", "ค่าเฉลี่ยของ g × 100"],
    ["Contrast index", "ส่วนเบี่ยงเบนมาตรฐานของ g × 100"],
    ["Sharpness", "(ค่าเฉลี่ยผลต่างพิกเซลข้างเคียงแนวนอน + แนวตั้ง) × 900 (สูงสุด 100)"],
    ["Artifact estimate (%)", "(สัดส่วนพิกเซลดำสนิท g &lt; 0.03 + สัดส่วนพิกเซลขาวจ้า g &gt; 0.98) × 120"],
    ["Image quality (%)", "42 + 0.52 × Contrast + 0.22 × Sharpness − 0.35 × Artifact (จำกัด 0–99) ถ้าต่ำกว่า 45 ระบบไม่วิเคราะห์ภาพนี้"],
], [40, 130])
h2("4.3 FAZ (Foveal Avascular Zone)")
p("FAZ คือบริเวณกลางจุดรับภาพชัดที่ไม่มีเส้นเลือดฝอย งานวิจัยพบว่าผู้ป่วยอัลไซเมอร์มี FAZ ใหญ่กว่าคนปกติโดยเฉลี่ย ระบบหา FAZ ดังนี้:")
table([
    ["ขั้น", "รายละเอียด"],
    ["1", "ย่อภาพเป็น 304×304 พิกเซล แล้วเบลอเล็กน้อย (เฉลี่ยกรอบ 5×5) เพื่อลด noise"],
    ["2", "พิกเซลที่ “มืด” คือพิกเซลที่สว่างน้อยกว่า 40% ของค่ามัธยฐานทั้งภาพ"],
    ["3", "หาจุดที่มืดที่สุดในวงกลมกลางภาพ (รัศมี 15% ของภาพ) เป็นจุดเริ่ม"],
    ["4", "ขยายพื้นที่จากจุดเริ่มไปยังพิกเซลมืดที่ติดกัน (flood fill) จนขยายต่อไม่ได้ พื้นที่ที่ได้คือ FAZ"],
], [12, 158])
f("พื้นที่ FAZ (mm²) = จำนวนพิกเซลใน FAZ × (3 มม. ÷ 304)²   ·   รายงานเฉพาะเมื่อได้ค่า 0.02–1.5 mm²")
f("เส้นผ่านศูนย์กลางวงกลมสีน้ำเงิน (วงกลมที่มีพื้นที่เท่ากับ FAZ) d = 2 × √(พื้นที่ ÷ π)")
p("ในภาพ FAZ บนเว็บ: <b>เส้นสีแดง</b> = ขอบ FAZ ที่ AI หาได้, <b>วงกลมสีน้ำเงิน</b> = วงกลมพื้นที่เท่ากัน, <b>เส้นสีน้ำเงิน 2 เส้น</b> = แกนยาวและแกนสั้นของ FAZ")

h1("5. ดัชนี Alzheimer และ % ความเสี่ยง (คำนวณอย่างไร)")
p("ส่วนนี้<b>ไม่ใช่ AI ที่เทรนจากผู้ป่วย</b> แต่เป็นสูตรที่ใช้ตัวเลขจากงานวิจัยที่ตีพิมพ์แล้ว เพราะเรายังไม่มีข้อมูลว่าภาพไหนเป็นของผู้ป่วยหรือคนปกติ")
h2("5.1 ค่ามาตรฐาน z (FAZ ต่างจากคนปกติกี่ SD)")
f("z = (FAZ − 0.275) ÷ 0.10   (จำกัดไว้ที่ −3 ถึง +3)")
p("0.275 mm² คือ FAZ เฉลี่ยของคนปกติ และ 0.10 คือส่วนเบี่ยงเบนมาตรฐาน (O’Bryhim et al., JAMA Ophthalmology 2018) "
  "z = +1.5 หมายถึง FAZ ใหญ่กว่าคนปกติ 1.5 SD บนเว็บแสดงค่านี้ในช่อง “Difference from controls”")
h2("5.2 Likelihood ratio (FAZ ขนาดนี้พบในผู้ป่วยบ่อยกว่าคนปกติกี่เท่า)")
f("LR = e^(0.54 × z − 0.54² ÷ 2)")
p("0.54 คือขนาดความต่างของ FAZ ระหว่างผู้ป่วยอัลไซเมอร์กับคนปกติ (SMD) จาก meta-analysis (Frontiers in Aging Neuroscience 2022) "
  "LR &gt; 1 แปลว่า FAZ ขนาดนี้พบในผู้ป่วยมากกว่า, LR &lt; 1 แปลว่าพบในคนปกติมากกว่า, LR = 1 แปลว่าไม่บอกอะไร")
h2("5.3 Alzheimer FAZ index (0–1)")
f("Index = LR ÷ (1 + LR)   ·   ระดับ: Low &lt; 0.35 · Moderate 0.35–0.65 · High &gt; 0.65")
p("Index สมมติว่าก่อนดูภาพ โอกาสเป็นผู้ป่วยหรือคนปกติเท่ากัน 50/50 จึงบอกได้แค่ว่า FAZ ชี้ไปทางไหน <b>ไม่ใช่เปอร์เซ็นต์ความเสี่ยงจริง</b> (0.50 = FAZ ไม่ได้ชี้ไปทางใดเลย)")
h2("5.4 % ความเสี่ยงโดยประมาณ (Estimated Alzheimer Risk)")
p("ใช้หลักของ Bayes: เริ่มจากความเสี่ยงตามอายุ (ค่าพื้นฐาน) แล้วปรับด้วย LR ของ FAZ")
table([
    ["อายุ", "ความเสี่ยงพื้นฐาน (คนทั่วไปในวัยนั้น)"],
    ["ต่ำกว่า 60", "ไม่คำนวณ (ไม่มีค่าอ้างอิงที่ตีพิมพ์)"],
    ["60–64", "≈ 0.23% (ภาวะสมองเสื่อมก่อน 65 ปี 663.9 ต่อแสนคน × สัดส่วนอัลไซเมอร์ 41.1/119.0, Hendriks et al., JAMA Neurology 2021)"],
    ["65–74", "5.0%"],
    ["75–84", "13.1%"],
    ["85 ขึ้นไป", "33.3%"],
], [40, 130])
p("ที่มา: อายุ 65 ขึ้นไปจาก Alzheimer’s Association, 2024 Alzheimer’s Disease Facts and Figures (ข้อมูลสหรัฐอเมริกา); อายุ 60–64 คำนวณต่อจาก Hendriks et al. (2021)")
f("odds พื้นฐาน = p ÷ (1 − p)   →   odds ใหม่ = odds พื้นฐาน × LR   →   ความเสี่ยง = odds ใหม่ ÷ (1 + odds ใหม่)")
p("ตาราง “Compared with people of the same age” ใช้สูตรเดียวกันกับทุกช่วงอายุ: คอลัมน์ “Average person” คือค่าพื้นฐาน, "
  "“Normal FAZ” คือคนที่มี FAZ 0.275 mm² (z = 0, LR ≈ 0.86) และ “This scan’s FAZ” คือใช้ FAZ ของภาพนี้ที่ AI วัดได้")

h2("ตัวอย่างคำนวณจริง: ภาพ test_08 ผู้ป่วยอายุ 68 ปี")
table([
    ["ขั้น", "คำนวณ", "ผล"],
    ["FAZ ที่ AI วัด", "—", "0.422 mm²"],
    ["z", "(0.422 − 0.275) ÷ 0.10", "+1.47"],
    ["LR", "e^(0.54 × 1.47 − 0.1458) = e^0.648", "1.91"],
    ["Index", "1.91 ÷ (1 + 1.91)", "0.66 (High)"],
    ["ค่าพื้นฐาน อายุ 68", "ช่วง 65–74", "5.0%"],
    ["odds พื้นฐาน", "0.05 ÷ 0.95", "0.0526"],
    ["odds ใหม่", "0.0526 × 1.91", "0.1006"],
    ["ความเสี่ยง", "0.1006 ÷ 1.1006", "9.1% (1.8 เท่าของคนวัยเดียวกัน)"],
    ["เส้นผ่านศูนย์กลางวงกลม", "2 × √(0.422 ÷ π)", "0.73 mm"],
], [42, 78, 50])

h1("6. ตัวเลขในหน้า Model Performance หมายถึงอะไร")
p("ทุกค่าวัดจาก 9 ภาพทดสอบ (ชั้น SVC) เทียบกับคำตอบที่ผู้เชี่ยวชาญวาดไว้ "
  "<b>เป็นความแม่นยำของการหาเส้นเลือดและ FAZ ไม่ใช่ความแม่นยำในการวินิจฉัยอัลไซเมอร์</b> "
  "TP = พิกเซลเส้นเลือดที่ AI ทายถูก, TN = พื้นหลังที่ทายถูก, FP = พื้นหลังที่ AI ทายผิดว่าเป็นเส้นเลือด, FN = เส้นเลือดที่ AI พลาด")
table([
    ["ค่า", "สูตร", "ความหมาย", "ผลของเรา"],
    ["Accuracy", "(TP + TN) ÷ ทั้งหมด", "พิกเซลที่ทายถูกทั้งหมด", "87.8%"],
    ["Sensitivity", "TP ÷ (TP + FN)", "หาเส้นเลือดเจอกี่ %", "76.9%"],
    ["Specificity", "TN ÷ (TN + FP)", "พื้นหลังถูกปล่อยว่างกี่ %", "90.4%"],
    ["Precision", "TP ÷ (TP + FP)", "ที่ AI บอกว่าเป็นเส้นเลือด ถูกกี่ %", "64.8%"],
    ["Dice (F1)", "2TP ÷ (2TP + FP + FN)", "ความซ้อนทับกับคำตอบ 0–1 (1 = ตรงเป๊ะ)", "0.701"],
    ["AUC", "พื้นที่ใต้กราฟ ROC", "แยกเส้นเลือดกับพื้นหลังได้ดีแค่ไหน 0.5 = เดาสุ่ม, 1 = สมบูรณ์", "0.908"],
    ["FAZ Dice", "เหมือน Dice แต่เทียบขอบ FAZ", "FAZ ที่ AI หาซ้อนกับของผู้เชี่ยวชาญแค่ไหน", "0.87"],
    ["FAZ area error", "ค่าเฉลี่ย |AI − ผู้เชี่ยวชาญ|", "วัดพื้นที่ FAZ คลาดเฉลี่ยเท่าไร", "0.037 mm²"],
    ["Correlation r", "สหสัมพันธ์ Pearson", "AI กับผู้เชี่ยวชาญไปในทางเดียวกันแค่ไหน (1 = ตรงกันสนิท)", "0.92"],
    ["Repeatability", "ส่งภาพเดิมซ้ำ 5 ครั้ง × 9 ภาพ", "ผลเปลี่ยนไหมเมื่อทำซ้ำ", "เหมือนเดิมทั้ง 45 ครั้ง"],
], [26, 42, 70, 32])
p("ทำไม Precision ต่ำกว่าค่าอื่น: AI มักวาดเส้นเลือดหนากว่าที่ผู้เชี่ยวชาญวาด ขอบเส้นเลือดจึงนับเป็น FP")

h1("7. ข้อจำกัดที่ต้องบอกเสมอ")
for t in [
    "ระบบเป็นงานวิจัย <b>ไม่ใช่เครื่องมือวินิจฉัย</b> และยังไม่ผ่านการทดสอบทางคลินิก",
    "% ความเสี่ยงยังไม่เคยตรวจสอบกับผู้ป่วยที่รู้ผลวินิจฉัยจริง เพราะยังไม่มีข้อมูลกลุ่มผู้ป่วย/คนปกติของแต่ละภาพ (ขออีเมลไปแล้ว)",
    "ทดสอบกับ 9 คนเท่านั้น และทุกภาพมาจากเครื่อง Optovue ชุดเดียว ภาพจากเครื่องอื่นอาจได้ผลต่างออกไป",
    "ระบบถือว่าทุกภาพกว้าง 3 มม. ถ้าใส่ภาพ 6×6 มม. ค่า FAZ และความเสี่ยงจะต่ำกว่าความจริงมาก",
    "ค่าความเสี่ยงตามอายุมาจากประชากรสหรัฐฯ อาจต่างจากคนไทย",
    "ยังไม่มีการลบข้อมูลระบุตัวตนอัตโนมัติ ต้องลบเองก่อนอัปโหลด",
]:
    p("• " + t)


def footer(canvas, doc):
    canvas.setFont("Tahoma", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "Eyezheimer · เอกสารอธิบาย AI สำหรับทีม · Research only")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"หน้า {doc.page}")


SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
                  title="Eyezheimer AI Explained (TH)").build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
