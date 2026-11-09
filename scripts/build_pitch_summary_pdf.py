from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "thermoeye_pitch_summary_th.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Tahoma", "C:/Windows/Fonts/tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", "C:/Windows/Fonts/tahomabd.ttf"))

NAVY = colors.HexColor("#092A42")
BLUE = colors.HexColor("#0B78B5")
CYAN = colors.HexColor("#23A7C9")
INK = colors.HexColor("#1D2D3D")
MUTED = colors.HexColor("#53677C")
LINE = colors.HexColor("#D7E2EC")
PALE = colors.HexColor("#F3F8FC")
GREEN = colors.HexColor("#13795B")
ORANGE = colors.HexColor("#A85B00")
RED = colors.HexColor("#A33030")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Tahoma-Bold", fontSize=30, leading=37, textColor=colors.white, alignment=TA_LEFT, spaceAfter=9))
styles.add(ParagraphStyle(name="CoverSub", fontName="Tahoma", fontSize=13, leading=19, textColor=colors.HexColor("#D9F1FA")))
styles.add(ParagraphStyle(name="H1Thai", fontName="Tahoma-Bold", fontSize=19, leading=25, textColor=NAVY, spaceAfter=9))
styles.add(ParagraphStyle(name="H2Thai", fontName="Tahoma-Bold", fontSize=12.5, leading=17, textColor=BLUE, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyThai", fontName="Tahoma", fontSize=9.2, leading=14.2, textColor=INK, spaceAfter=5, wordWrap="CJK"))
styles.add(ParagraphStyle(name="SmallThai", fontName="Tahoma", fontSize=7.4, leading=10.5, textColor=MUTED, wordWrap="CJK"))
styles.add(ParagraphStyle(name="TinyThai", fontName="Tahoma", fontSize=6.4, leading=8.7, textColor=MUTED, wordWrap="CJK"))
styles.add(ParagraphStyle(name="CardTitle", fontName="Tahoma-Bold", fontSize=10.5, leading=14, textColor=NAVY, spaceAfter=3))
styles.add(ParagraphStyle(name="TableHeader", fontName="Tahoma-Bold", fontSize=8.2, leading=10.5, textColor=colors.white, wordWrap="CJK"))
styles.add(ParagraphStyle(name="Metric", fontName="Tahoma-Bold", fontSize=21, leading=24, textColor=BLUE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="MetricLabel", fontName="Tahoma", fontSize=7.4, leading=10, textColor=MUTED, alignment=TA_CENTER, wordWrap="CJK"))
styles.add(ParagraphStyle(name="Ref", fontName="Tahoma", fontSize=7, leading=9.7, textColor=INK, wordWrap="CJK", leftIndent=7, firstLineIndent=-7, spaceAfter=4))


def P(text, style="BodyThai"):
    return Paragraph(text, styles[style])


def bullet(text):
    return P(f"- {text}")


def card(title, body, accent=BLUE):
    t = Table([[P(title, "CardTitle")], [P(body, "SmallThai")]], colWidths=[53 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("LINEBEFORE", (0, 0), (0, -1), 3, accent), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t


def metric(value, label):
    t = Table([[P(value, "Metric")], [P(label, "MetricLabel")]], colWidths=[40 * mm], rowHeights=[11 * mm, 11 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    return t


def styled_table(rows, widths):
    converted = [[P(str(cell), "TableHeader" if r == 0 else "TinyThai") for cell in row] for r, row in enumerate(rows)]
    t = Table(converted, colWidths=widths, repeatRows=1)
    commands = [("GRID", (0, 0), (-1, -1), 0.45, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    for index in range(2, len(rows), 2):
        commands.append(("BACKGROUND", (0, index), (-1, index), PALE))
    t.setStyle(TableStyle(commands))
    return t


def shot(relative_path, width=82 * mm):
    with PILImage.open(ROOT / relative_path) as source:
        crop_height = min(source.height, 1100)
        cropped = source.crop((0, 0, source.width, crop_height)).convert("RGB")
        stream = BytesIO()
        cropped.save(stream, format="JPEG", quality=88, optimize=True)
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
        canvas.drawString(16 * mm, height - 8 * mm, "THERMOEYE")
        canvas.setStrokeColor(LINE)
        canvas.line(16 * mm, 13 * mm, width - 16 * mm, 13 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Tahoma", 7)
        canvas.drawRightString(width - 16 * mm, 9 * mm, f"Thermoeye pitch brief  |  {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=19 * mm, bottomMargin=18 * mm)
doc.addPageTemplates([PageTemplate(id="all", frames=Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal"), onPage=on_page)])
story = []

# Cover
story += [Spacer(1, 38 * mm), P("Thermoeye", "CoverTitle"), P("ระบบคัดกรองและวิเคราะห์ภาพ OCT/OCTA สำหรับงานวิจัยและ clinical workflow", "CoverSub"), Spacer(1, 13 * mm)]
cover = Table([[P("สรุปโครงการสำหรับ Pitch", "CardTitle"), P("ฉบับภาษาไทย | 30 สิงหาคม 2026", "SmallThai")], [P("Thermoeye เปลี่ยนภาพ OCT/OCTA ให้เป็น workflow ที่ตรวจสอบได้: รับภาพอย่างปลอดภัย, ตรวจคุณภาพ, วัด vessel/FAZ, ส่งให้แพทย์ทบทวน และสร้างรายงานที่มี audit trail", "BodyThai")]], colWidths=[105 * mm, 55 * mm])
cover.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")), ("SPAN", (0, 1), (-1, 1)), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
story += [cover, Spacer(1, 17 * mm), P("สถานะสำคัญ", "CoverSub"), Spacer(1, 3 * mm)]
status = Table([[P("เว็บ Demo/MVP", "Metric"), P("AI measurement", "Metric"), P("AD/MCI classifier", "Metric")], [P("พร้อมสาธิต", "MetricLabel"), P("ONNX vessel model", "MetricLabel"), P("ยังไม่เชื่อม", "MetricLabel")]], colWidths=[54 * mm] * 3)
status.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#8CCFE1")), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
story += [status, Spacer(1, 25 * mm), P("คำเตือนการใช้งาน: ผลปัจจุบันเป็น research/clinical decision-support demo ไม่ใช่การวินิจฉัย และยังไม่ควรใช้ตัดสินใจดูแลผู้ป่วยโดยลำพัง", "CoverSub"), PageBreak()]

# Overview
story += [P("1. เราสร้างอะไรขึ้นมา", "H1Thai"), P("Thermoeye คือ clinical console สำหรับจัดการภาพ OCT/OCTA ตั้งแต่รับไฟล์จนถึงรายงาน โดยออกแบบให้ทุกผลลัพธ์มีที่มา มี quality gate และมีแพทย์เป็นผู้อนุมัติก่อน release", "BodyThai")]
overview_cards = [[card("Upload & intake", "รับภาพ OCT/OCTA พร้อม metadata, consent และ quarantine state", CYAN), card("Analysis workspace", "แสดงภาพจริง, vessel segmentation, density/FAZ proxy และ research evidence", BLUE), card("Doctor review", "แพทย์เลือก decision, note, follow-up และ approval gate", GREEN)], [card("Reports", "สร้าง PDF report พร้อมภาพสแกนและ release control", ORANGE), card("Governance", "audit log, de-identification status, model registry และ data provenance", CYAN), card("Action workflow", "patient record, second review, DICOM metadata export และ delete confirmation", RED)]]
cards = Table(overview_cards, colWidths=[56 * mm] * 3)
cards.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [cards, Spacer(1, 8), P("ภาพหน้าจอระบบ", "H2Thai"), shot("output/playwright/thermoeye-dashboard.png"), P("Dashboard แสดง queue, metrics, risk summary และ doctor review workflow ในหน้าเดียว", "SmallThai"), PageBreak()]

# AI pipeline
story += [P("2. AI pipeline และสิ่งที่ทำงานอยู่จริง", "H1Thai"), P("สถาปัตยกรรมปัจจุบันแยก measurement ออกจาก disease classification เพื่อไม่ให้ระบบสร้างคำวินิจฉัยจากข้อมูลที่ยังไม่มี label เพียงพอ", "BodyThai")]
pipeline = styled_table([["1. Upload", "2. Modality gate", "3. Quality", "4. ONNX U-Net", "5. Review"], ["ภาพ + metadata", "กันภาพคน/สิว/ภาพสีทั่วไป", "contrast, artifact, resolution", "vessel mask + density", "แพทย์ตรวจและอนุมัติ"]], [35 * mm] * 5)
story += [pipeline, Spacer(1, 9), P("โหมดที่ระบบรองรับ", "H2Thai"), bullet("Local OCTA measurement: ใช้ ONNX vessel U-Net เมื่อมี artifact; ถ้าไม่มีจะใช้ research baseline ที่ติดป้ายชัดเจน"), bullet("Ruleset demo: คำนวณ risk proxy เพื่อแสดง workflow เท่านั้น ไม่ใช่ trained disease classifier"), bullet("External Vision provider: Claude/Gemini เป็น optional และปิดไว้เป็นค่าเริ่มต้น; Codex ไม่ได้ใช้เป็น inference backend"), Spacer(1, 5), styled_table([["ส่วนประกอบ", "สถานะ", "ความหมาย"], ["Vessel segmentation", "เชื่อมแล้ว", "ONNX model วัดโครงข่ายหลอดเลือด; model card ระบุ scope ชัดเจน"], ["FAZ / perfusion", "proxy", "ใช้เป็น research measurement จนกว่าจะ validate กับ expert mask"], ["Healthy/MCI/AD", "ยังไม่มี", "ผลต้องเป็น indeterminate จนกว่าจะมี patient-level labels"], ["OCT vs non-OCT", "preflight heuristic", "กันภาพผิดประเภทเบื้องต้น; ยังไม่ใช่ modality classifier ที่ผ่าน validation"]], [43 * mm, 34 * mm, 94 * mm]), PageBreak()]

# Data and training
story += [P("3. ข้อมูลและการฝึกโมเดล", "H1Thai"), P("เราเริ่มจากงานที่วัดได้และตรวจสอบได้ก่อน คือ vessel segmentation ของ OCTA ไม่ตีความ dataset segmentation ให้กลายเป็น label Alzheimer", "BodyThai"), Table([[metric("39", "ROSE-O image/mask pairs"), metric("0.7078", "baseline test Dice"), metric("9", "published test rows"), metric("1", "ONNX vessel artifact")]], colWidths=[43 * mm] * 4), Spacer(1, 7), P("สิ่งที่ ROSE-O ใช้ได้", "H2Thai"), bullet("ฝึกและประเมิน vessel segmentation จาก SVC/SCC masks; เก็บ official train/test split"), bullet("เตรียม metadata.csv และ preflight ตรวจ path, rows และ duplicate subjects แล้ว"), bullet("โมเดลมี model card และถูกเชื่อมกับ local backend เพื่อสร้าง mask preview"), P("สิ่งที่ยังใช้ไม่ได้", "H2Thai"), bullet("ROSE-O ไม่มี patient-level Healthy/MCI/AD diagnosis ที่ใช้สร้าง Alzheimer classifier"), bullet("ค่า vessel density/FAZ จากคนละ device หรือ scan protocol ห้ามเทียบตรง ๆ โดยไม่ทำ normalization"), bullet("ภาพจากบทความใช้เป็น reference/QA ไม่ใช่ training data โดยอัตโนมัติ"), PageBreak(), P("ภาพหน้าจอระบบและผลลัพธ์ที่นำเสนอได้", "H2Thai"), Table([[shot("output/playwright/thermoeye-analysis.png", 65 * mm), shot("output/playwright/thermoeye-insights.png", 65 * mm)]], colWidths=[86 * mm, 86 * mm]), P("Analysis แสดงภาพและ measurement workflow; Insights แสดง research evidence และ aggregate metrics", "SmallThai"), PageBreak()]

# Governance
story += [P("4. ความปลอดภัยและ clinical governance", "H1Thai"), P("หลักการสำคัญคือไม่ให้ UI ที่ดูสมจริงกลายเป็นการอ้างวินิจฉัย ระบบจึงมีคำเตือน, release gate และ audit trail ในทุกจุดสำคัญ", "BodyThai")]
gov_cards = [[card("Input safety", "รับเฉพาะ image types ที่กำหนด, จำกัด 8 MB และมี modality preflight", CYAN), card("Data privacy", "de-identified status, consent fields, quarantine workflow และไม่ใส่ patient data ใน git", GREEN), card("Clinical release", "PDF ถูกล็อกจนกว่า doctor จะอนุมัติ; quality-blocked case อนุมัติไม่ได้", ORANGE)], [card("Auditability", "login, upload, preview, review, export, download และ delete ถูกบันทึก", BLUE), card("Actions", "ลบต้อง confirm; DICOM export ระบุว่า metadata-only; second review เปลี่ยน review state", RED), card("Model transparency", "แสดง Ruleset, Local measurement หรือ External provider และข้อจำกัดทุกหน้า", CYAN)]]
gov = Table(gov_cards, colWidths=[56 * mm] * 3)
gov.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [gov, Spacer(1, 9), P("ข้อจำกัดที่ต้องพูดใน Pitch", "H2Thai"), bullet("ระบบปัจจุบันเป็น research/clinical decision-support demo ไม่ใช่ medical device ที่ผ่าน regulatory clearance"), bullet("ONNX model เป็น vessel segmentation เท่านั้น ไม่ใช่ AD/MCI disease classifier"), bullet("ต้องมี independent test set, calibration, subgroup analysis, external validation และ clinician review ก่อนใช้จริง"), bullet("Claude/GLM อาจช่วยอ่านข้อความหรือ second opinion ได้ แต่ไม่ควรเป็นตัวแทน validation ทางคลินิก"), PageBreak()]

# Roadmap
story += [P("5. สถานะความพร้อมและแผนต่อไป", "H1Thai"), P("จุดแข็งของโครงการคือ workflow และ safety boundary พร้อมสาธิตแล้ว ส่วนงานที่เหลือเป็นงาน validation และ infrastructure ที่จำเป็นต่อการใช้งานจริง", "BodyThai"), styled_table([["ด้าน", "สถานะตอนนี้", "เป้าหมายถัดไป"], ["Web Demo/MVP", "พร้อมสาธิต; responsive และมี API flow", "เชื่อม database และ user roles จริง"], ["Input gate", "preflight + automated test ผ่าน", "ทำ modality classifier ที่มี labeled OCT/non-OCT set"], ["Segmentation", "ONNX vessel U-Net; Dice 0.7078 baseline", "เพิ่มข้อมูล/validation และทำ FAZ model แยก"], ["AD/MCI classifier", "ยังเป็น indeterminate", "ขอข้อมูลที่มี diagnosis ระดับผู้ป่วยและสิทธิ์ใช้งาน"], ["Provider", "local-first; external ปิดค่าเริ่มต้น", "เปรียบเทียบ Claude/GLM บนชุดทดสอบเดียวกันหลัง de-ID"], ["Production", "in-memory mock state", "PostgreSQL, object storage, queue, MFA, tenant isolation, DICOMweb"]], [34 * mm, 62 * mm, 65 * mm]), Spacer(1, 9), P("Roadmap ที่เสนอ", "H2Thai"), bullet("Phase 1: เพิ่ม golden test set สำหรับ OCT, OCTA, ภาพสี, ภาพคน และภาพคุณภาพต่ำ"), bullet("Phase 2: ขยาย ROSE-O และเพิ่ม authorized OCTA dataset; รายงาน Dice/IoU แยก layer/device"), bullet("Phase 3: สร้าง AD/MCI research classifier เมื่อได้ cohort ที่มี ground truth และ external test"), bullet("Phase 4: production hardening, PACS/DICOMweb, security review และ regulatory documentation"), Spacer(1, 5), P("ข้อเสนอเชิงธุรกิจ", "H2Thai"), P("นำเสนอ Thermoeye เป็น platform สำหรับ standardized retinal imaging workflow และ research measurement ก่อน ขยายไปสู่ disease prediction เมื่อมีหลักฐานและ validation รองรับ จะน่าเชื่อถือและควบคุมความเสี่ยงได้มากกว่าการเคลมว่า AI วินิจฉัยได้ทันที", "BodyThai"), PageBreak()]

# References
story += [P("6. แหล่งอ้างอิงและเอกสารประกอบ", "H1Thai"), P("แหล่งอ้างอิงด้านล่างใช้เพื่ออธิบาย biomarker context, OCTA methodology และขอบเขตข้อมูล ไม่ใช่การยืนยันว่าโมเดลของ Thermoeye ผ่าน clinical validation แล้ว", "BodyThai")]
references = [
    "[1] ResearchGate, Retinal changes in brain disorders (OCTA): https://www.researchgate.net/figure/Retinal-changes-in-brain-disorders-Optical-coherence-tomography-angiography-OCT-A_fig3_382473153",
    "[2] ResearchGate, Retinovascular changes in AD patients: https://www.researchgate.net/figure/Retinovascular-changes-in-AD-patients-This-Image-shows-the-differences-between-the_fig2_370356486",
    "[3] Dementia Australia, Retinal imaging research sheet: https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf",
    "[4] Duke Eye Center, OCTA and Alzheimer research article: https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms",
    "[5] PMC, Retinal biomarkers review: https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/",
    "[6] ScienceDirect, systematic review of retinal changes in AD: https://www.sciencedirect.com/science/article/abs/pii/S0161642018302586",
    "[7] PubMed, preclinical AD retinal changes: https://pubmed.ncbi.nlm.nih.gov/39710907/",
    "[8] ResearchGate, deep segmentation of OCTA for AD/MCI research: https://www.researchgate.net/publication/366860049_Deep_segmentation_of_OCTA_for_evaluation_and_association_of_changes_of_retinal_microvasculature_with_Alzheimer's_disease_and_mild_cognitive_impairment",
    "[9] OpenMedLab, ROSE dataset reference: https://github.com/openmedlab/Awesome-Medical-Dataset/blob/main/resources/ROSE.md",
    "[10] OpenMedLab, OCTA-500 dataset reference: https://github.com/openmedlab/Awesome-Medical-Dataset/blob/main/resources/OCTA-500.md",
    "[11] EyeWiki, OCT-Angiography: https://eyewiki.org/Optical_Coherence_Tomography_Angiography",
    "[12] Thermoeye internal documents: DATASET_REVIEW_TH.md, OCTA_PIPELINE_TH.md, MVP_BACKEND_PLAN.md and WORKLIST.md",
]
for ref in references:
    story.append(P(ref, "Ref"))
story += [Spacer(1, 8), Table([[P("สรุปสำหรับผู้ฟัง", "CardTitle")], [P("Thermoeye พร้อมแสดง end-to-end workflow ที่รับภาพ, วัดผล, อธิบายที่มา, ให้แพทย์ review และสร้างรายงานได้แล้ว จุดที่ต้องลงทุนต่อคือข้อมูลที่มี ground truth, validation และ production security เพื่อเปลี่ยนจาก demo ที่น่าเชื่อถือไปสู่ clinical system ที่รับผิดชอบได้", "BodyThai")]], colWidths=[168 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))]

doc.build(story)
print(OUT)
