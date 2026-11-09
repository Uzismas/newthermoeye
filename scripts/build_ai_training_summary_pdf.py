from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "thermoeye_ai_training_summary_th.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Tahoma", "C:/Windows/Fonts/tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", "C:/Windows/Fonts/tahomabd.ttf"))

NAVY = colors.HexColor("#092F49")
BLUE = colors.HexColor("#087AAE")
CYAN = colors.HexColor("#18A7C5")
INK = colors.HexColor("#203442")
MUTED = colors.HexColor("#5D7180")
LINE = colors.HexColor("#D5E2E9")
PALE = colors.HexColor("#F1F7FA")
GREEN = colors.HexColor("#137C5B")
ORANGE = colors.HexColor("#A55A00")
RED = colors.HexColor("#A33232")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Tahoma-Bold", fontSize=26, leading=32, textColor=colors.white, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", fontName="Tahoma", fontSize=12, leading=17, textColor=colors.HexColor("#D9F3FA")))
styles.add(ParagraphStyle(name="H1TH", fontName="Tahoma-Bold", fontSize=17, leading=22, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="H2TH", fontName="Tahoma-Bold", fontSize=11.5, leading=15, textColor=BLUE, spaceBefore=5, spaceAfter=3))
styles.add(ParagraphStyle(name="BodyTH", fontName="Tahoma", fontSize=9, leading=13.6, textColor=INK, spaceAfter=5, wordWrap="CJK"))
styles.add(ParagraphStyle(name="SmallTH", fontName="Tahoma", fontSize=7.5, leading=10.5, textColor=MUTED, wordWrap="CJK"))
styles.add(ParagraphStyle(name="TinyTH", fontName="Tahoma", fontSize=6.8, leading=9.2, textColor=INK, wordWrap="CJK"))
styles.add(ParagraphStyle(name="TableHead", fontName="Tahoma-Bold", fontSize=7.6, leading=9.5, textColor=colors.white, wordWrap="CJK"))
styles.add(ParagraphStyle(name="Metric", fontName="Tahoma-Bold", fontSize=19, leading=22, textColor=BLUE, alignment=1))
styles.add(ParagraphStyle(name="MetricLabel", fontName="Tahoma", fontSize=7, leading=9.2, textColor=MUTED, alignment=1, wordWrap="CJK"))


def P(text, style="BodyTH"):
    return Paragraph(text, styles[style])


def make_table(rows, widths):
    converted = []
    for row_index, row in enumerate(rows):
        style = "TableHead" if row_index == 0 else "TinyTH"
        converted.append([P(str(value), style) for value in row])
    result = Table(converted, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for index in range(2, len(rows), 2):
        commands.append(("BACKGROUND", (0, index), (-1, index), PALE))
    result.setStyle(TableStyle(commands))
    return result


def callout(title, text, accent=BLUE):
    result = Table([[P(title, "H2TH")], [P(text, "SmallTH")]], colWidths=[168 * mm])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return result


def metric(value, label):
    result = Table([[P(value, "Metric")], [P(label, "MetricLabel")]], colWidths=[41 * mm], rowHeights=[10 * mm, 11 * mm])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return result


def on_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, width, height, stroke=0, fill=1)
        canvas.setFillColor(CYAN)
        canvas.rect(0, height - 8 * mm, width, 8 * mm, stroke=0, fill=1)
    else:
        canvas.setFillColor(NAVY)
        canvas.rect(0, height - 12 * mm, width, 12 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Tahoma-Bold", 8)
        canvas.drawString(16 * mm, height - 8 * mm, "THERMOEYE AI | รายละเอียดการเทรนโมเดล")
        canvas.setStrokeColor(LINE)
        canvas.line(16 * mm, 13 * mm, width - 16 * mm, 13 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Tahoma", 7)
        canvas.drawRightString(width - 16 * mm, 9 * mm, f"ฉบับสรุป | {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=16 * mm,
    rightMargin=16 * mm,
    topMargin=19 * mm,
    bottomMargin=18 * mm,
)
doc.addPageTemplates([PageTemplate(id="all", frames=Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal"), onPage=on_page)])
story = []

# Page 1: scope and status
story += [Spacer(1, 42 * mm), P("AI Training Summary", "CoverTitle"), P("Thermoeye AI: วิธีเตรียมข้อมูลและฝึกโมเดล OCTA Vessel Segmentation", "CoverSub"), Spacer(1, 13 * mm)]
cover = Table([
    [P("เอกสารฉบับอ่านง่าย", "H2TH"), P("รายละเอียดการเทรน AI", "SmallTH")],
    [P("อธิบายลำดับงานตั้งแต่เลือกข้อมูล สร้าง metadata เตรียมภาพ แบ่งชุดข้อมูล ฝึกโมเดล ประเมินผล และ export เป็น ONNX", "BodyTH")],
], colWidths=[105 * mm, 55 * mm])
cover.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")),
    ("SPAN", (0, 1), (-1, 1)),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story += [cover, Spacer(1, 16 * mm), P("สถานะที่ยืนยันได้จาก pipeline ปัจจุบัน", "CoverSub"), Spacer(1, 3 * mm)]
status = Table([
    [P("ROSE-O", "Metric"), P("Vessel", "Metric"), P("ONNX", "Metric")],
    [P("ข้อมูล OCTA สำหรับฝึก", "MetricLabel"), P("โมเดลที่ฝึกแล้ว", "MetricLabel"), P("artifact ที่ export แล้ว", "MetricLabel")],
], colWidths=[54 * mm] * 3)
status.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")),
    ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story += [status, Spacer(1, 19 * mm), P("ข้อควรเข้าใจ: โมเดลที่ฝึกแล้วทำหน้าที่แยกหลอดเลือดจากภาพ OCTA เท่านั้น ไม่ใช่โมเดลวินิจฉัย Alzheimer’s หรือ MCI", "CoverSub"), PageBreak()]

# Page 2: data and metadata
story += [P("1. กำหนดงานและเลือกข้อมูล", "H1TH"), P("งานแรกถูกกำหนดให้เป็น image segmentation เพราะมีภาพ OCTA และ vessel mask ที่เป็น ground truth จับคู่กันชัดเจน ทำให้ตรวจสอบผลของโมเดลได้ตรงกว่าการเริ่มจากการทำนายโรคที่ยังไม่มี label ระดับผู้ป่วยในชุดข้อมูลนี้", "BodyTH"), callout("Dataset baseline", "ใช้ ROSE-O จาก Zenodo record 12775880 เป็นข้อมูลตั้งต้นสำหรับฝึกแยกหลอดเลือดฝอยบนภาพ OCTA en-face", CYAN), Spacer(1, 7), make_table([
    ["รายการ", "รายละเอียดที่ใช้ใน pipeline"],
    ["ภาพนำเข้า", "OCTA en-face จาก Optovue AngioVue ขนาดสแกน 3 x 3 mm"],
    ["Label", "vessel mask ที่จับคู่กับภาพ OCTA"],
    ["จำนวน baseline", "39 image/mask pairs"],
    ["published split", "train 30 ภาพ และ test 9 ภาพ"],
    ["สิ่งที่ยังไม่มี", "patient-level AD/MCI label และ FAZ ground truth สำหรับโมเดลโรค"],
], [48 * mm, 120 * mm]), Spacer(1, 7), P("ก่อนฝึกจะตรวจ source, version, license, permission, modality, device, scan size และความครบถ้วนของคู่ภาพกับ mask ข้อมูลที่เข้าระบบต้องถูก de-identify และ metadata ต้องไม่เปิดเผยข้อมูลระบุตัวบุคคล", "BodyTH"), PageBreak()]

# Page 3: preparation and split
story += [P("2. เตรียมไฟล์และแบ่งชุดข้อมูล", "H1TH"), P("สคริปต์เตรียมข้อมูลจะค้นหาโฟลเดอร์ train/test ของ ROSE-O แล้วจับคู่ภาพ SVC กับ vessel mask ตามชื่อไฟล์ จากนั้นคัดลอกเข้าสู่ training workspace และสร้าง metadata.csv เพื่อให้ทุกขั้นตอนตรวจสอบย้อนกลับได้", "BodyTH"), make_table([
    ["ขั้นตอน", "วิธีดำเนินการ"],
    ["ค้นหาและจับคู่", "อ่านโฟลเดอร์ภาพและ mask ตรวจชื่อไฟล์และตรวจจำนวนให้ตรงกัน"],
    ["สร้าง metadata", "บันทึก image_id, paths, device, scan size, source split และ source record"],
    ["preflight", "ตรวจ required columns, จำนวนแถว และ path ของไฟล์ก่อนอนุญาตให้ train"],
    ["เก็บ test", "รักษา published test 9 ภาพไว้เป็น held-out test ไม่ใช้เลือก checkpoint"],
    ["validation", "สุ่มประมาณ 20% จาก published train ด้วย GroupShuffleSplit และ seed 42"],
], [48 * mm, 120 * mm]), Spacer(1, 8), P("Preprocessing ที่ใช้จริง", "H2TH"), make_table([
    ["รายการ", "ค่า/เหตุผล"],
    ["สีภาพ", "แปลงเป็น grayscale 1 channel"],
    ["ขนาดเข้าโมเดล", "resize เป็น 256 x 256"],
    ["ภาพ input", "ใช้ Bilinear interpolation แล้ว normalize เป็นช่วง 0 ถึง 1"],
    ["mask", "ใช้ Nearest-neighbor เพื่อไม่สร้าง label กึ่งกลางที่ไม่มีความหมาย"],
    ["binary mask", "threshold มากกว่า 0.5"],
], [48 * mm, 120 * mm]), Spacer(1, 7), callout("ข้อจำกัดของ split", "ROSE-O archive ที่ใช้ไม่มี subject ID จริง ดังนั้น split นี้ยังไม่ใช่ patient-level split ที่สมบูรณ์ เมื่อได้ข้อมูลใหม่ต้องแบ่งตาม subject_id, eye_id และ visit จริง", ORANGE), PageBreak()]

# Page 4: model and training
story += [P("3. สถาปัตยกรรมและการฝึกโมเดล", "H1TH"), P("เลือกใช้ Small U-Net ซึ่งเหมาะกับ baseline ที่มีข้อมูลไม่มาก โดยให้โมเดลเรียนรู้ตำแหน่งและรูปร่างของ vessel จากภาพ OCTA แล้วคืนค่าเป็น vessel logits สำหรับสร้าง mask", "BodyTH")]
pipeline = Table([
    [P("ภาพ OCTA", "TableHead"), P("Encoder", "TableHead"), P("Bottleneck", "TableHead"), P("Decoder", "TableHead"), P("Vessel mask", "TableHead")],
    [P("1 x 256 x 256", "TinyTH"), P("32 -> 64 -> 128", "TinyTH"), P("256 channels", "TinyTH"), P("skip connections", "TinyTH"), P("1 channel logits", "TinyTH")],
], colWidths=[33 * mm] * 5)
pipeline.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("BACKGROUND", (0, 1), (-1, 1), PALE),
    ("GRID", (0, 0), (-1, -1), 0.4, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story += [pipeline, Spacer(1, 9), make_table([
    ["องค์ประกอบ", "ค่าที่ใช้จริง"],
    ["Loss", "BCEWithLogitsLoss + Soft Dice Loss เพื่อดูทั้ง pixel classification และพื้นที่ซ้อนทับของ vessel"],
    ["Optimizer", "AdamW, learning rate 2e-4 และ weight decay 1e-4"],
    ["Epoch", "ค่าเริ่มต้น 30 รอบ"],
    ["Seed", "42 เพื่อให้การสุ่มและการแบ่ง validation ทำซ้ำได้"],
    ["Device", "ใช้ CUDA เมื่อมี หากไม่มีให้รันด้วย CPU"],
    ["Checkpoint", "เก็บรุ่นที่มี validation Dice สูงสุด ไม่เลือกจาก test"],
], [48 * mm, 120 * mm]), Spacer(1, 8), P("ในแต่ละ epoch จะคำนวณ train loss/train Dice และประเมิน validation Dice โดยไม่อัปเดตน้ำหนัก หลังจบการฝึกจะโหลด checkpoint ที่ดีที่สุดแล้วประเมินบน held-out test เพียงครั้งเดียว", "BodyTH"), PageBreak()]

# Page 5: evaluation and limits
story += [P("4. ประเมินผลและส่งออกโมเดล", "H1TH"), P("ตัวชี้วัดหลักของ baseline คือ Dice coefficient ซึ่งวัดความซ้อนทับระหว่าง vessel mask ที่โมเดลทำนายกับ ground truth ยิ่งสูงหมายถึงตำแหน่งหลอดเลือดที่ทำนายซ้อนทับกับ label ได้ดีขึ้น", "BodyTH"), make_table([
    ["ผล/Artifact", "ความหมาย"],
    ["Test metric", "ประเมิน vessel segmentation บน published test split และบันทึกผลไว้ใน model card"],
    ["PyTorch checkpoint", "น้ำหนักโมเดลที่เลือกจาก validation Dice สูงสุด"],
    ["ONNX model", "artifact สำหรับ inference ใน backend โดยใช้ input shape [1, 1, 256, 256]"],
    ["model card", "บันทึก scope, metric, split, device และข้อจำกัด"],
    ["train history", "เก็บประวัติ train/validation และ metrics ของรอบที่ฝึก"],
], [58 * mm, 110 * mm]), Spacer(1, 8), callout("ความหมายของผลลัพธ์", "ค่า Dice ที่บันทึกใน model card ใช้ตอบคำถามว่าโมเดลแยก vessel ได้ดีเพียงใด ไม่สามารถตีความเป็นความแม่นยำในการตรวจ Alzheimer’s, MCI หรือโรคอื่น", RED), Spacer(1, 9), P("5. ข้อจำกัดและงานที่ต้องทำก่อนอ้างว่าใช้งานทางคลินิก", "H1TH"), make_table([
    ["ประเด็น", "สิ่งที่ต้องพัฒนาต่อ"],
    ["ข้อมูลน้อย", "เพิ่มภาพ OCTA ที่มีสิทธิ์ใช้งานและหลากหลายอุปกรณ์/ประชากร"],
    ["ไม่มี patient ID จริง", "ทำ subject-level split และป้องกัน data leakage"],
    ["FAZ", "สร้าง FAZ ground truth และฝึกโมเดลเฉพาะงาน"],
    ["AD/MCI", "รวบรวม cohort ที่มี diagnosis ระดับผู้ป่วย แล้วฝึก classifier แยกจาก segmentation"],
    ["ความน่าเชื่อถือ", "ทำ external validation, calibration, subgroup analysis และ clinician review"],
], [48 * mm, 120 * mm]), Spacer(1, 8), P("สรุป: สิ่งที่เทรนสำเร็จในปัจจุบันคือโมเดล OCTA vessel segmentation ที่ตรวจสอบและ export เป็น ONNX ได้ ส่วนการจำแนก Alzheimer’s/MCI ยังเป็นงานวิจัยระยะถัดไปและยังไม่ควรใช้ผลจากระบบแทนการวินิจฉัยของแพทย์", "BodyTH")]

doc.build(story)
print(OUT)
