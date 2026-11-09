from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "thermoeye_ai_training_summary_th.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Tahoma", "C:/Windows/Fonts/tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", "C:/Windows/Fonts/tahomabd.ttf"))

NAVY = colors.HexColor("#082B45")
BLUE = colors.HexColor("#087AAE")
CYAN = colors.HexColor("#18A7C5")
INK = colors.HexColor("#1E3040")
MUTED = colors.HexColor("#526B7E")
LINE = colors.HexColor("#D4E1EA")
PALE = colors.HexColor("#F1F7FA")
GREEN = colors.HexColor("#137C5B")
ORANGE = colors.HexColor("#A55A00")
RED = colors.HexColor("#A33232")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Tahoma-Bold", fontSize=28, leading=35, textColor=colors.white, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", fontName="Tahoma", fontSize=12.5, leading=18, textColor=colors.HexColor("#D9F3FA")))
styles.add(ParagraphStyle(name="H1TH", fontName="Tahoma-Bold", fontSize=18, leading=24, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="H2TH", fontName="Tahoma-Bold", fontSize=12.2, leading=16, textColor=BLUE, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyTH", fontName="Tahoma", fontSize=9.1, leading=14.2, textColor=INK, spaceAfter=5, wordWrap="CJK"))
styles.add(ParagraphStyle(name="SmallTH", fontName="Tahoma", fontSize=7.5, leading=10.8, textColor=MUTED, wordWrap="CJK"))
styles.add(ParagraphStyle(name="TinyTH", fontName="Tahoma", fontSize=6.7, leading=9.3, textColor=INK, wordWrap="CJK"))
styles.add(ParagraphStyle(name="TableHead", fontName="Tahoma-Bold", fontSize=7.8, leading=10, textColor=colors.white, wordWrap="CJK"))
styles.add(ParagraphStyle(name="Metric", fontName="Tahoma-Bold", fontSize=20, leading=23, textColor=BLUE, alignment=1))
styles.add(ParagraphStyle(name="MetricLabel", fontName="Tahoma", fontSize=7.1, leading=9.5, textColor=MUTED, alignment=1, wordWrap="CJK"))
styles.add(ParagraphStyle(name="Ref", fontName="Tahoma", fontSize=6.8, leading=9.3, textColor=INK, wordWrap="CJK", leftIndent=7, firstLineIndent=-7, spaceAfter=3))


def P(text, style="BodyTH"):
    return Paragraph(text, styles[style])


def bullet(text):
    return P(f"- {text}")


def box(title, text, accent=BLUE, width=53 * mm):
    table = Table([[P(title, "H2TH")], [P(text, "SmallTH")]], colWidths=[width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def table(rows, widths):
    converted = [[P(str(value), "TableHead" if row_index == 0 else "TinyTH") for value in row] for row_index, row in enumerate(rows)]
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


def metric(value, label):
    result = Table([[P(value, "Metric")], [P(label, "MetricLabel")]], colWidths=[41 * mm], rowHeights=[11 * mm, 11 * mm])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return result


def screenshot(relative_path, width=82 * mm, crop_height=None):
    path = ROOT / relative_path
    with PILImage.open(path) as source:
        if crop_height:
            source = source.crop((0, 0, source.width, min(source.height, crop_height)))
        stream = BytesIO()
        source.convert("RGB").save(stream, format="JPEG", quality=87, optimize=True)
    stream.seek(0)
    image = Image(stream)
    image.drawWidth = width
    image.drawHeight = width * image.imageHeight / image.imageWidth
    image.hAlign = "CENTER"
    return image


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
        canvas.drawString(16 * mm, height - 8 * mm, "THERMOEYE | วิธีดำเนินโครงงาน")
        canvas.setStrokeColor(LINE)
        canvas.line(16 * mm, 13 * mm, width - 16 * mm, 13 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Tahoma", 7)
        canvas.drawRightString(width - 16 * mm, 9 * mm, f"ฉบับอ่านโครงงาน | {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=19 * mm, bottomMargin=18 * mm)
doc.addPageTemplates([PageTemplate(id="all", frames=Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal"), onPage=on_page)])
story = []

# Cover
story += [Spacer(1, 40 * mm), P("Thermoeye AI", "CoverTitle"), P("วิธีเตรียมข้อมูลและฝึกโมเดลวิเคราะห์ภาพ OCTA", "CoverSub"), Spacer(1, 14 * mm)]
cover = Table([
    [P("เอกสารสรุปวิธีทำโครงงาน", "H2TH"), P("ฉบับภาษาไทย | 10 กันยายน 2026", "SmallTH")],
    [P("เอกสารนี้อธิบายกระบวนการเทรน AI ตั้งแต่การกำหนดงาน การคัดเลือก dataset การเตรียมภาพ การแบ่งข้อมูล การฝึก Vessel Segmentation การประเมินผล และการ export โมเดล", "BodyTH")],
], colWidths=[105 * mm, 55 * mm])
cover.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")), ("SPAN", (0, 1), (-1, 1)), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
story += [cover, Spacer(1, 17 * mm), P("สถานะโมเดลที่ฝึกแล้ว", "CoverSub"), Spacer(1, 3 * mm)]
status = Table([[P("39", "Metric"), P("0.7078", "Metric"), P("1", "Metric")], [P("คู่ภาพ/mask ROSE-O", "MetricLabel"), P("test Dice vessel segmentation", "MetricLabel"), P("ONNX vessel model", "MetricLabel")]], colWidths=[54 * mm] * 3)
status.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
story += [status, Spacer(1, 23 * mm), P("ขอบเขต: โมเดลที่ฝึกแล้วเป็น OCTA vessel segmentation model สำหรับงานวิจัย ไม่ใช่โมเดลวินิจฉัย Alzheimer’s/MCI และยังไม่มี clinical validation", "CoverSub"), PageBreak()]

# 1
story += [P("1. การกำหนดปัญหาและขอบเขต", "H1TH"), P("โครงงานเริ่มจากการกำหนดปัญหาว่า ภาพ OCT/OCTA มีข้อมูลโครงสร้างและเครือข่ายหลอดเลือดที่สามารถใช้เป็นตัวชี้วัดทางการวิจัยได้ แต่กระบวนการตรวจภาพและจัดทำรายงานยังต้องอาศัยการตรวจสอบหลายขั้นตอน จึงออกแบบ Thermoeye ให้เป็นระบบช่วยวิเคราะห์และจัดการ workflow สำหรับแพทย์", "BodyTH"), P("ขอบเขตระยะแรกไม่ได้เริ่มจากการสร้างระบบวินิจฉัย Alzheimer โดยตรง แต่เริ่มจากงานที่มี ground truth ชัดกว่า คือการแยกหลอดเลือดจากภาพ OCTA และสร้าง measurement pipeline ที่ตรวจสอบย้อนกลับได้", "BodyTH"), table([["ส่วนงาน", "ขอบเขตที่ทำจริง", "สถานะ"], ["OCTA segmentation", "แยก vessel mask จากภาพ en-face OCTA", "ฝึกแล้วและเชื่อม ONNX"], ["Vessel measurement", "คำนวณ vessel density และ perfusion proxy", "ทำงานใน local backend"], ["FAZ", "ใช้ central-region proxy ใน baseline", "ยังไม่ใช่ FAZ model"], ["AD/MCI classification", "Healthy/MCI/AD classifier", "ยังไม่มี model/label"], ["Clinical workflow", "upload, analysis, review, report, audit", "ทำเป็น Web MVP"]], [43 * mm, 78 * mm, 47 * mm]), Spacer(1, 8), P("หลักการสำคัญคือแยก “การวัดจากภาพ” ออกจาก “การจำแนกโรค” เพื่อไม่ให้ระบบสรุปโรคจากข้อมูลที่ยังไม่พร้อม และทำให้ผู้ใช้เห็นว่าแต่ละค่ามาจากโมเดลหรือกฎประเภทใด", "BodyTH"), PageBreak()]

# 2
story += [P("2. การศึกษาเอกสารและกำหนดตัวชี้วัด", "H1TH"), P("ทีมศึกษาเอกสารเกี่ยวกับ retinal microvasculature และ OCTA biomarkers จาก ResearchGate, Duke Eye Center, Dementia Australia, PubMed Central, PubMed และ EyeWiki เพื่อกำหนดบริบททางวิชาการและตัวชี้วัดที่ควรแสดงในระบบ", "BodyTH"), box("ตัวชี้วัดที่ศึกษา", "Vessel Density ใน SCP/DCP, Perfusion Density, FAZ Area, capillary dropout และความหนาของ RNFL, GC-IPL และ GCC", CYAN), Spacer(1, 7), P("เอกสารวิจัยถูกใช้เพื่ออธิบายสมมติฐานและออกแบบหน้าจอ ไม่ได้ใช้ข้อความหรือภาพจากบทความเป็น label สำหรับฝึกโมเดล เพราะบทความส่วนใหญ่ไม่ได้ให้ข้อมูล patient-level ground truth ในรูปแบบที่ใช้ฝึกได้", "BodyTH"), table([["ประเภทข้อมูล", "บทบาทในโครงงาน", "ข้อควรระวัง"], ["OCTA research figures", "reference และ QA ของ UI", "ไม่ใช้ train โดยอัตโนมัติ"], ["งานวิจัย AD/MCI", "กำหนด biomarker context", "ไม่ใช่ label ของ ROSE-O"], ["Dataset documentation", "ตรวจ modality และ license", "ต้องเก็บ source/version"], ["Clinical guidance", "ออกแบบ review gate และคำเตือน", "ต้องให้แพทย์ตัดสินใจ"]], [48 * mm, 65 * mm, 55 * mm]), PageBreak()]

# 3
story += [P("3. การคัดเลือกและจัดการ Dataset", "H1TH"), P("Dataset หลักของ baseline คือ ROSE-O จาก Zenodo record 12775880 ซึ่งมีภาพ OCTA และ vessel ground truth เหมาะสำหรับเริ่มต้นฝึก segmentation", "BodyTH"), Table([[P("รายการ", "TableHead"), P("รายละเอียด", "TableHead")], [P("แหล่งข้อมูล", "TinyTH"), P("ROSE-O, Zenodo record 12775880", "TinyTH")], [P("Modality", "TinyTH"), P("OCTA en-face, SVC image และ SCC vessel mask", "TinyTH")], [P("Device / scan", "TinyTH"), P("Optovue AngioVue, 3 x 3 mm", "TinyTH")], [P("จำนวน", "TinyTH"), P("39 image/mask pairs", "TinyTH")], [P("Official split", "TinyTH"), P("train 30 ภาพ และ test 9 ภาพ", "TinyTH")], [P("Label ที่ใช้", "TinyTH"), P("vessel mask เท่านั้น", "TinyTH")]], colWidths=[45 * mm, 123 * mm])
story += [Spacer(1, 8), P("ข้อมูล OCTA, structural OCT และ fundus photograph ถูกแยกเป็นคนละ branch เพราะมี domain และ label space ต่างกัน เช่น APTOS ใช้กับ fundus Diabetic Retinopathy ส่วน Kermany ใช้กับ structural OCT ไม่ควรนำมาปนกับ OCTA/Alzheimer โดยตรง", "BodyTH"), P("ก่อนนำข้อมูลเข้าระบบ จะตรวจ source URL, version, license, permission, modality, device, scan size และความครบถ้วนของ image/mask โดยข้อมูลผู้ป่วยจริงต้อง de-identify และเก็บนอก public folder", "BodyTH"), PageBreak()]

# 4
story += [P("4. การเตรียมไฟล์และ Metadata", "H1TH"), P("ใช้สคริปต์ `prepare_rose_o_metadata.py` ค้นหาโฟลเดอร์ ROSE-O train/test แล้วเลือก SVC image ที่จับคู่กับ SCC vessel mask ตามชื่อไฟล์ จากนั้นคัดลอกเข้าสู่ training workspace และสร้าง `metadata.csv`", "BodyTH"), table([["ขั้นตอน", "สิ่งที่ทำ"], ["ค้นหาไฟล์", "อ่าน train/img/SVC และ train/gt/vessel/SCC รวมถึง test"], ["จับคู่", "ตรวจชื่อ image และ mask ให้ตรงกัน"], ["คัดลอก", "เก็บภาพใน images/ และ mask ใน vessel_masks/"], ["สร้าง metadata", "บันทึก image_id, paths, device, scan_size และ source_split"], ["preflight", "ตรวจ rows, required columns และ path ของไฟล์"], ["หยุดเมื่อผิด", "ห้ามเริ่ม train หากไฟล์หายหรือ metadata ไม่ครบ"]], [43 * mm, 125 * mm]), Spacer(1, 8), P("Metadata ที่ควรมีเมื่อขยาย dataset ได้แก่ dataset, record_url, version, license, permission_status, subject_id, eye_id, image_id, modality, layer, device, scan_size, image_path, vessel_mask_path, faz_mask_path, disease_label และ source_split", "BodyTH"), P("ข้อจำกัดของ ROSE-O คือ archive ที่ใช้ไม่มี subject mapping ระดับผู้ป่วยจริง ดังนั้น subject_id ที่สร้างขึ้นเป็น image identifier เพื่อความเสถียรของ pipeline ไม่ควรเรียกว่า patient-level split", "BodyTH"), PageBreak()]

# 5
story += [P("5. การ Preprocessing ภาพ", "H1TH"), P("ภาพและ mask ถูกอ่านด้วย Pillow และเตรียมเข้าสู่โมเดลด้วยขั้นตอนที่คงความหมายของ pixel label ไว้", "BodyTH"), table([["ขั้นตอน", "รายละเอียด"], ["แปลงสี", "แปลงภาพเป็น grayscale 1 channel"], ["Resize image", "ปรับเป็น 256 x 256 ด้วย Bilinear interpolation"], ["Resize mask", "ปรับเป็น 256 x 256 ด้วย Nearest-neighbor"], ["Normalize", "แปลงค่าพิกเซลให้อยู่ในช่วง 0 ถึง 1"], ["Binary mask", "ใช้ threshold มากกว่า 0.5"], ["DataLoader", "batch size เริ่มต้น 4, num_workers 0"]], [43 * mm, 125 * mm]), Spacer(1, 8), box("เหตุผลที่ mask ใช้ Nearest-neighbor", "Mask เป็น label แบบแบ่งพื้นที่ หากใช้ Bilinear จะสร้างค่ากึ่งกลางบริเวณขอบเส้นเลือด ทำให้ ground truth เปลี่ยนความหมาย", ORANGE), Spacer(1, 7), P("Baseline OCTA ยังใช้ augmentation อย่างระมัดระวัง เนื่องจากข้อมูลมีขนาดเล็กและต้องการรักษารูปแบบโครงสร้างหลอดเลือด การเพิ่ม augmentation และ normalization แบบอุปกรณ์จะพิจารณาหลังเพิ่มข้อมูลและออกแบบ validation แล้ว", "BodyTH"), PageBreak()]

# 6
story += [P("6. การแบ่งข้อมูล Train, Validation และ Test", "H1TH"), P("สคริปต์รักษา published test split ของ ROSE-O จำนวน 9 ภาพเป็น held-out test เพื่อไม่ให้ test ถูกใช้เลือกรุ่นโมเดล จาก published train split จำนวน 30 ภาพ จะสุ่ม validation ประมาณ 20% ด้วย GroupShuffleSplit และ seed 42", "BodyTH"), table([["ชุดข้อมูล", "จำนวน/วิธีใช้", "บทบาท"], ["Train", "มาจาก published train split", "อัปเดตน้ำหนักโมเดล"], ["Validation", "ประมาณ 20% ของ train split", "เลือก checkpoint ที่ Dice สูงสุด"], ["Test", "published test 9 ภาพ", "ประเมินหลังเลือกโมเดลแล้ว"], ["Group", "subject_id ที่มีใน metadata", "ลดการปนกันของ image identifier"]], [43 * mm, 65 * mm, 60 * mm]), Spacer(1, 8), P("หลักการของข้อมูลทางการแพทย์คือภาพจากผู้ป่วยคนเดียวกันไม่ควรอยู่ทั้ง train และ test เพราะจะทำให้ผลสูงเกินจริง สำหรับ ROSE-O ที่ไม่มี patient ID จริง จึงต้องรายงานข้อจำกัดนี้อย่างเปิดเผย และเมื่อได้ dataset ใหม่ต้องแบ่งตาม subject_id/eye_id/visit จริง", "BodyTH"), PageBreak()]

# 7
story += [P("7. สถาปัตยกรรมและการฝึกโมเดล", "H1TH"), P("ใช้ Small U-Net สำหรับ segmentation โดยรับภาพ grayscale 1 channel และคืนค่า vessel logits 1 channel", "BodyTH"), table([["องค์ประกอบ", "ค่าที่ใช้จริง"], ["Encoder", "Conv blocks 32, 64 และ 128 channels"], ["Bottleneck", "256 channels"], ["Decoder", "Transposed convolution และ skip connections"], ["Loss", "BCEWithLogitsLoss + Soft Dice Loss"], ["Optimizer", "AdamW, learning rate 2e-4"], ["Weight decay", "1e-4"], ["Epoch", "ค่าเริ่มต้น 30"], ["Seed", "42"], ["Device", "CUDA เมื่อมี, มิฉะนั้น CPU"]], [48 * mm, 120 * mm]), Spacer(1, 8), P("ในแต่ละ epoch ระบบคำนวณ train loss และ train Dice จากนั้นประเมิน validation Dice โดยไม่อัปเดตน้ำหนัก เลือก checkpoint ที่ validation Dice สูงสุด แล้วจึงโหลด checkpoint นั้นเพื่อคำนวณผลบน test set", "BodyTH"), PageBreak()]

# 8
story += [P("8. การประเมินผลและการ Export โมเดล", "H1TH"), P("ผล baseline ที่มีหลักฐานใน model card คือ test Dice 0.7078416745 หรือประมาณ 0.7078 บน published test split จำนวน 9 ภาพ", "BodyTH"), Table([[metric("0.7078", "test Dice"), metric("9", "published test rows"), metric("256", "input pixels"), metric("17", "ONNX opset")]], colWidths=[43 * mm] * 4), Spacer(1, 8), P("หลังเลือก checkpoint ระบบ export เป็น ONNX โดยกำหนด input shape [1, 1, 256, 256] และ output เป็น vessel_logits จากนั้นตรวจ ONNX graph และทดสอบ ONNX Runtime ด้วย CPU ก่อนนำ artifact ไปเชื่อม backend", "BodyTH"), table([["Artifact", "หน้าที่"], ["octa_vessel_unet.pt", "PyTorch checkpoint ที่เลือกจาก validation Dice"], ["octa_vessel_unet.onnx", "โมเดลสำหรับ inference ใน backend"], ["model_card.json", "scope, metric, split, device และข้อจำกัด"], ["train_history.json", "ประวัติ train/validation และ test metrics เมื่อมีการเทรนรอบนั้น"]], [58 * mm, 110 * mm]), Spacer(1, 8), P("Dice 0.7078 เป็นผลของ vessel segmentation เท่านั้น ไม่ใช่ความแม่นยำในการตรวจ Alzheimer’s, MCI หรือโรคอื่น", "BodyTH"), PageBreak()]

# 9
story += [P("9. การทำงานของ Local Inference Backend", "H1TH"), P("Local FastAPI backend มี endpoint `POST /octa/analyze` สำหรับรับภาพ OCTA และแยกขั้นตอน input safety, quality, segmentation และ measurement ออกจาก disease classification", "BodyTH"), table([["ลำดับ", "การทำงาน"], ["1", "รับไฟล์และตรวจชนิด/ขนาด/ความละเอียด"], ["2", "ตรวจชื่อไฟล์และสัดส่วนสีเพื่อกันภาพผิดประเภท"], ["3", "ประเมิน brightness, contrast, sharpness และ artifact"], ["4", "Resize เป็น 256 x 256 และโหลด ONNX model"], ["5", "รัน CPU inference และ threshold probability > 0.5"], ["6", "resize mask กลับขนาดเดิม"], ["7", "วัด vessel density, perfusion proxy และ FAZ proxy"], ["8", "ส่ง classification เป็น indeterminate หากไม่มี AD/MCI classifier"]], [28 * mm, 140 * mm]), Spacer(1, 8), P("หาก ONNX artifact ไม่พบหรือใช้งานไม่ได้ ระบบ fallback เป็น `heuristic_research_baseline` และส่งชื่อ engine ให้หน้า Analysis แสดง เพื่อไม่ให้ผู้ใช้เข้าใจว่า fallback เป็นโมเดลที่ผ่านการฝึก", "BodyTH"), PageBreak()]

# 10
story += [P("10. Modality Gate และ Quality Gate", "H1TH"), P("ก่อนวิเคราะห์ระบบมีด่านป้องกันภาพผิดประเภทและภาพคุณภาพต่ำ เพื่อให้ workflow ไม่รับภาพที่เห็นได้ชัดว่าไม่ใช่ retinal scan", "BodyTH"), box("Modality gate", "ตรวจ MIME, ขนาดไฟล์ไม่เกิน 8 MB, รูปอ่านได้, ชื่อไฟล์ที่มี acne/skin/face/selfie/person/fundus และสัดส่วนสีของภาพ", CYAN), Spacer(1, 7), box("Quality gate", "ตรวจ brightness, contrast, sharpness, dark fraction, clipped fraction และ artifact score ก่อนอนุญาตให้วัดผล", ORANGE), Spacer(1, 7), P("Automated modality test ยืนยันว่าภาพ OCT fixture ถูกยอมรับ และภาพที่ระบุเป็นภาพสิวหรือใบหน้าถูกปฏิเสธด้วย HTTP 422 ระบบนี้ยังเป็น heuristic preflight ไม่ใช่ trained OCT-vs-non-OCT classifier และต้องมี labeled modality dataset หากจะใช้ใน production", "BodyTH"), PageBreak()]

# 11 UI
story += [P("11. การสร้างหน้าจอสำหรับแพทย์", "H1TH"), P("Frontend สร้างด้วย Next.js, React และ TypeScript โดยแบ่งหน้าจอตาม workflow ของแพทย์ ตั้งแต่รับเคสจนถึงทบทวนและออกรายงาน", "BodyTH"), table([["หน้าจอ", "หน้าที่"], ["Login", "ตรวจ session และกำหนดผู้ใช้งาน Demo"], ["Dashboard", "ดู queue, metrics, risk summary และเคสที่รอ review"], ["Upload New Scan", "รับไฟล์ กรอก case metadata และ consent"], ["Analysis Results", "ดูภาพต้นฉบับ segmentation, quality และ measurement"], ["Patients / Cases", "เลือกเคสและดูสถานะ workflow"], ["Clinical Report", "ตรวจผล doctor note และ release gate"], ["Insights", "ดู aggregate metrics และ research evidence"], ["Data Management", "ดู audit, de-identification และ governance"]], [48 * mm, 120 * mm]), Spacer(1, 8), screenshot("output/playwright/thermoeye-dashboard.png", 142 * mm, 900), P("ภาพที่ 1 ตัวอย่าง Dashboard สำหรับจัดการคิวและการตรวจทาน", "SmallTH"), PageBreak()]

# 12 workflow visuals
story += [P("12. การใช้งานของแพทย์และการสร้างรายงาน", "H1TH"), P("เมื่อแพทย์อัปโหลดภาพ ระบบจะตรวจ gate และพาไปหน้า Analysis ซึ่งแสดงภาพจริงพร้อมผล segmentation และชื่อ analysis engine จากนั้นแพทย์สามารถบันทึก note และเลือกสถานะ review", "BodyTH"), Table([[box("1. Upload", "อัปโหลด OCT/OCTA และกรอกข้อมูลเคส", CYAN, 47 * mm), box("2. Analyze", "ตรวจ modality, quality และวัด vessel mask", BLUE, 47 * mm), box("3. Review", "แพทย์ทบทวนผลและเขียน clinical note", GREEN, 47 * mm)], [box("4. Approve", "เลือก Approved for release เมื่อเหมาะสม", ORANGE, 47 * mm), box("5. Report", "สร้าง PDF พร้อมภาพและข้อมูลเคส", RED, 47 * mm), box("6. Audit", "บันทึกกิจกรรมและ release history", CYAN, 47 * mm)]], colWidths=[55 * mm] * 3), PageBreak()]
story += [Spacer(1, 9), Table([[screenshot("output/playwright/thermoeye-analysis.png", 80 * mm, 900), screenshot("output/playwright/thermoeye-report.png", 80 * mm, 900)]], colWidths=[84 * mm, 84 * mm]), P("ภาพที่ 2 Analysis และ Clinical Report Preview ของระบบ", "SmallTH"), P("PDF จะถูกล็อกจนกว่าแพทย์จะเลือก Approved for release ส่วน quality-blocked case จะไม่สามารถอนุมัติให้ปล่อยรายงานได้ กิจกรรม login, upload, preview, review, download, DICOM export และ delete ถูกส่งเข้า audit trail", "BodyTH"), PageBreak()]

# 13 governance
story += [P("13. ความปลอดภัยและ Clinical Governance", "H1TH"), table([["กลไก", "วิธีดำเนินการใน MVP"], ["De-identification", "ใช้ case code และตัดข้อมูลระบุตัวบุคคลออกจาก workflow แสดงผล"], ["Consent", "มี screening, research และ model training purpose fields"], ["Quarantine concept", "อธิบายให้ raw files อยู่ใน intake/quarantine ก่อน quality และ de-id"], ["Doctor gate", "ต้องมีแพทย์ review ก่อน release PDF"], ["Audit trail", "บันทึกเหตุการณ์สำคัญของผู้ใช้และเคส"], ["Model transparency", "แสดง Ruleset, Local measurement หรือ External provider"], ["External provider", "Claude/Gemini ปิดไว้เป็นค่าเริ่มต้น"], ["DICOM", "export ปัจจุบันเป็น de-identified metadata ไม่ใช่ PACS integration"]], [48 * mm, 120 * mm]), Spacer(1, 8), P("ระบบยังเป็น MVP ที่ใช้ in-memory state ในส่วน web workflow จึงยังต้องเพิ่มฐานข้อมูล, secure session, object storage, worker queue, MFA, tenant isolation และ backup ก่อนใช้งาน production", "BodyTH"), PageBreak()]

# 14 tests and limitations
story += [P("14. การทดสอบและข้อจำกัด", "H1TH"), P("การทดสอบ software ล่าสุดครอบคลุม typecheck, lint, production build, API flow, smoke flow, accessibility, mobile UI health, local OCTA smoke และ modality gate โดยผลที่ผ่านเหล่านี้ยืนยันว่า workflow ทำงานตามที่ออกแบบ", "BodyTH"), table([["สิ่งที่ทดสอบ", "ผลที่ยืนยัน"], ["Dataset preflight", "39 rows และ image/mask paths ครบ"], ["OCTA pipeline smoke", "รัน pipeline ได้โดยไม่ล้ม"], ["Modality gate", "OCT ผ่านและภาพสิว/ใบหน้าถูกปฏิเสธ"], ["Model artifact", "ONNX checker และ CPU inference ผ่าน"], ["Web workflow", "upload -> analysis -> review -> report -> audit"], ["Clinical performance", "ยังไม่มี external validation"]], [58 * mm, 110 * mm]), Spacer(1, 8), P("ข้อจำกัดที่ต้องระบุในเอกสารทุกครั้ง ได้แก่ dataset ขนาดเล็ก, ROSE-O ไม่มี patient ID จริง, FAZ ยังเป็น proxy, ไม่มี AD/MCI classifier, ยังไม่มี external validation และ Dice 0.7078 ไม่ใช่ Alzheimer accuracy", "BodyTH"), PageBreak()]

# 15 roadmap/references
story += [P("15. งานที่ต้องทำต่อและแหล่งอ้างอิง", "H1TH"), P("ลำดับการพัฒนาต่อที่เหมาะสมคือเพิ่มข้อมูลที่มีสิทธิ์ใช้งานและ subject ID จริง, ทำ FAZ segmentation, สร้าง modality classifier, ขอ cohort Healthy/MCI/AD ที่มี diagnosis ระดับผู้ป่วย, แบ่งข้อมูลแบบ subject-level และทำ external validation ก่อนเชื่อมผล disease classification", "BodyTH"), table([["ระยะ", "เป้าหมาย"], ["Phase 1", "เพิ่ม OCTA data และ validation ของ vessel/FAZ segmentation"], ["Phase 2", "สร้าง metadata ที่มี subject, eye, device และ scan protocol"], ["Phase 3", "ฝึก research classifier Healthy/MCI/AD ด้วย ground truth"], ["Phase 4", "external validation, calibration, subgroup analysis และ clinician review"], ["Phase 5", "production database, security, PACS/DICOMweb และ regulatory documentation"]], [35 * mm, 133 * mm]), Spacer(1, 8), P("แหล่งอ้างอิงหลัก", "H2TH")]
refs = [
    "[1] ROSE Dataset: https://github.com/openmedlab/Awesome-Medical-Dataset/blob/main/resources/ROSE.md",
    "[2] OCTA-500: https://github.com/openmedlab/Awesome-Medical-Dataset/blob/main/resources/OCTA-500.md",
    "[3] PMC retinal biomarkers review: https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/",
    "[4] Duke Eye Center: https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms",
    "[5] Preclinical AD retinal changes: https://pubmed.ncbi.nlm.nih.gov/39710907/",
    "[6] EyeWiki OCT Angiography: https://eyewiki.org/Optical_Coherence_Tomography_Angiography",
    "[7] Dementia Australia research sheet: https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf",
    "[8] เอกสารภายใน: DATASET_REVIEW_TH.md, OCTA_PIPELINE_TH.md, AI_TRAINING_GUIDE_TH.md, MVP_BACKEND_PLAN.md และ WORKLIST.md",
]
for ref in refs:
    story.append(P(ref, "Ref"))
story += [Spacer(1, 7), Table([[P("ข้อความสรุปสำหรับโครงงาน", "H2TH")], [P("Thermoeye ใช้แนวทางพัฒนาแบบเป็นขั้นตอน เริ่มจากข้อมูล OCTA ที่มี vessel mask ชัดเจน ฝึก segmentation model ที่ตรวจสอบได้ แล้วจึงเชื่อมผล measurement เข้ากับ workflow สำหรับแพทย์ ระบบปัจจุบันพร้อมสาธิตการรับภาพ วิเคราะห์ ตรวจทาน และสร้างรายงาน แต่ยังต้องเพิ่มข้อมูลระดับผู้ป่วยและ clinical validation ก่อนพัฒนาเป็นระบบช่วยวินิจฉัยโรค", "BodyTH")]], colWidths=[168 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))]

doc.build(story)
print(OUT)
