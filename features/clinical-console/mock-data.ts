import type { AuditEvent, CaseRecord, ViewId } from "./types";
import { classifyClinicalMetrics, createClinicalMetrics } from "./clinical-analysis";
import { referenceCases } from "./reference-cases";

export const navigationItems: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "pulse-icon" },
  { id: "cases", label: "Upload New Scan", icon: "upload-icon" },
  { id: "patients", label: "Patients", icon: "patient-icon" },
  { id: "analysis", label: "Analysis Results", icon: "scan-icon" },
  { id: "report", label: "Reports", icon: "report-icon" },
  { id: "insights", label: "Data Insights", icon: "chart-icon" },
  { id: "performance", label: "Model Performance", icon: "model-icon" },
  { id: "governance", label: "Data Management", icon: "data-icon" },
  { id: "settings", label: "Settings", icon: "settings-icon" },
];

const highRiskMetrics = createClinicalMetrics({
  artifactScore: 18, brightness: 118, confidenceScore: 88,
  contrast: 44, imageHeight: 375, imageWidth: 666,
  qualityScore: 96, sharpness: 82, vesselDensity: 20,
});

const moderateRiskMetrics = createClinicalMetrics({
  artifactScore: 11, brightness: 123, confidenceScore: 84,
  contrast: 39, imageHeight: 375, imageWidth: 666,
  qualityScore: 91, sharpness: 74, vesselDensity: 39,
});

const normalMetrics = createClinicalMetrics({
  artifactScore: 4, brightness: 130, confidenceScore: 92,
  contrast: 36, imageHeight: 375, imageWidth: 666,
  qualityScore: 98, sharpness: 80, vesselDensity: 58,
});

const blockedMetrics = createClinicalMetrics({
  artifactScore: 58, brightness: 184, confidenceScore: 0,
  contrast: 18, imageHeight: 375, imageWidth: 666,
  qualityScore: 42, sharpness: 22, vesselDensity: 24,
});

// Disease-specific demo metrics
const drMetrics = createClinicalMetrics({
  artifactScore: 28, brightness: 162, confidenceScore: 82,
  contrast: 52, imageHeight: 375, imageWidth: 666,
  qualityScore: 88, sharpness: 76, vesselDensity: 26,
});

const glaucomaMetrics = createClinicalMetrics({
  artifactScore: 12, brightness: 122, confidenceScore: 86,
  contrast: 28, imageHeight: 375, imageWidth: 666,
  qualityScore: 93, sharpness: 71, vesselDensity: 34,
});

const amdMetrics = createClinicalMetrics({
  artifactScore: 22, brightness: 168, confidenceScore: 80,
  contrast: 45, imageHeight: 375, imageWidth: 666,
  qualityScore: 90, sharpness: 68, vesselDensity: 38,
});

const hypertensiveMetrics = createClinicalMetrics({
  artifactScore: 32, brightness: 138, confidenceScore: 78,
  contrast: 62, imageHeight: 375, imageWidth: 666,
  qualityScore: 85, sharpness: 72, vesselDensity: 44,
});

const myopiaMetrics = createClinicalMetrics({
  artifactScore: 8, brightness: 98, confidenceScore: 83,
  contrast: 22, imageHeight: 375, imageWidth: 666,
  qualityScore: 92, sharpness: 69, vesselDensity: 30,
});

export const cases: CaseRecord[] = [
  ...referenceCases,
  {
    id: "TE-2405-0187", age: 67, sex: "F", scanType: "OCTA", eye: "OD",
    riskLevel: classifyClinicalMetrics(highRiskMetrics, 67).riskLevel,
    riskScore: classifyClinicalMetrics(highRiskMetrics, 67).riskScore,
    qualityLabel: "Pass 96", status: "Review pending",
    context: "67F · working senior · OCTA OD", confidence: "Confidence 88%",
    density: "Vessel density -30.0%", heatmap: "Alzheimer Risk — high signal",
    note: classifyClinicalMetrics(highRiskMetrics, 67).finding,
    analysisMetrics: highRiskMetrics, clinicalClassification: classifyClinicalMetrics(highRiskMetrics, 67),
  },
  {
    id: "TE-2405-0182", age: 73, sex: "M", scanType: "OCT", eye: "OS",
    riskLevel: classifyClinicalMetrics(moderateRiskMetrics, 73).riskLevel,
    riskScore: classifyClinicalMetrics(moderateRiskMetrics, 73).riskScore,
    qualityLabel: "Pass 91", status: "AI completed",
    context: "73M · follow-up case · OCT OS", confidence: "Confidence 81%",
    density: "Vessel density -7.6%", heatmap: "Alzheimer Risk — moderate signal",
    note: classifyClinicalMetrics(moderateRiskMetrics, 73).finding,
    analysisMetrics: moderateRiskMetrics, clinicalClassification: classifyClinicalMetrics(moderateRiskMetrics, 73),
  },
  {
    id: "TE-2405-0179", age: 61, sex: "F", scanType: "OCTA", eye: "OU",
    riskLevel: classifyClinicalMetrics(normalMetrics, 61).riskLevel,
    riskScore: classifyClinicalMetrics(normalMetrics, 61).riskScore,
    qualityLabel: "Pass 98", status: "Report ready",
    context: "61F · routine scan · OCTA OU", confidence: "Confidence 92%",
    density: "Vessel density -1.8%", heatmap: "Low attention",
    note: classifyClinicalMetrics(normalMetrics, 61).finding,
    analysisMetrics: normalMetrics, clinicalClassification: classifyClinicalMetrics(normalMetrics, 61),
  },
  {
    id: "TE-2405-0176", age: 70, sex: "F", scanType: "OCTA", eye: "OS",
    riskLevel: classifyClinicalMetrics(blockedMetrics, 70).riskLevel,
    riskScore: classifyClinicalMetrics(blockedMetrics, 70).riskScore,
    qualityLabel: "Fail 42", status: "Rescan needed",
    context: "70F · OCTA OS · quality failure", confidence: "Confidence unavailable",
    density: "Artifact detected", heatmap: "Quality blocked",
    note: classifyClinicalMetrics(blockedMetrics, 70).finding,
    analysisMetrics: blockedMetrics, clinicalClassification: classifyClinicalMetrics(blockedMetrics, 70),
  },
  {
    id: "TE-2405-0195", age: 55, sex: "M", scanType: "OCTA", eye: "OD",
    riskLevel: classifyClinicalMetrics(drMetrics, 55).riskLevel,
    riskScore: classifyClinicalMetrics(drMetrics, 55).riskScore,
    qualityLabel: "Pass 88", status: "Review pending",
    context: "55M · diabetes follow-up · OCTA OD", confidence: "Confidence 82%",
    density: "Vessel density -24.0%", heatmap: "Diabetic Retinopathy — high signal",
    note: classifyClinicalMetrics(drMetrics, 55).finding,
    analysisMetrics: drMetrics, clinicalClassification: classifyClinicalMetrics(drMetrics, 55),
  },
  {
    id: "TE-2405-0198", age: 62, sex: "F", scanType: "OCTA", eye: "OS",
    riskLevel: classifyClinicalMetrics(glaucomaMetrics, 62).riskLevel,
    riskScore: classifyClinicalMetrics(glaucomaMetrics, 62).riskScore,
    qualityLabel: "Pass 93", status: "AI completed",
    context: "62F · IOP elevated follow-up · OCTA OS", confidence: "Confidence 86%",
    density: "Vessel density -16.0%", heatmap: "Glaucoma — high signal",
    note: classifyClinicalMetrics(glaucomaMetrics, 62).finding,
    analysisMetrics: glaucomaMetrics, clinicalClassification: classifyClinicalMetrics(glaucomaMetrics, 62),
  },
  {
    id: "TE-2405-0201", age: 74, sex: "F", scanType: "OCTA", eye: "OD",
    riskLevel: classifyClinicalMetrics(amdMetrics, 74).riskLevel,
    riskScore: classifyClinicalMetrics(amdMetrics, 74).riskScore,
    qualityLabel: "Pass 90", status: "Review pending",
    context: "74F · AMD screening · OCTA OD", confidence: "Confidence 80%",
    density: "Vessel density -12.0%", heatmap: "AMD — moderate signal",
    note: classifyClinicalMetrics(amdMetrics, 74).finding,
    analysisMetrics: amdMetrics, clinicalClassification: classifyClinicalMetrics(amdMetrics, 74),
  },
  {
    id: "TE-2405-0204", age: 48, sex: "M", scanType: "OCT", eye: "OU",
    riskLevel: classifyClinicalMetrics(hypertensiveMetrics, 48).riskLevel,
    riskScore: classifyClinicalMetrics(hypertensiveMetrics, 48).riskScore,
    qualityLabel: "Pass 85", status: "AI completed",
    context: "48M · hypertension history · OCT OU", confidence: "Confidence 78%",
    density: "Vessel density -6.0%", heatmap: "Hypertensive Retinopathy — moderate signal",
    note: classifyClinicalMetrics(hypertensiveMetrics, 48).finding,
    analysisMetrics: hypertensiveMetrics, clinicalClassification: classifyClinicalMetrics(hypertensiveMetrics, 48),
  },
  {
    id: "TE-2405-0207", age: 35, sex: "F", scanType: "OCTA", eye: "OS",
    riskLevel: classifyClinicalMetrics(myopiaMetrics, 35).riskLevel,
    riskScore: classifyClinicalMetrics(myopiaMetrics, 35).riskScore,
    qualityLabel: "Pass 92", status: "AI completed",
    context: "35F · high myopia -12D · OCTA OS", confidence: "Confidence 83%",
    density: "Vessel density -20.0%", heatmap: "Pathologic Myopia — moderate signal",
    note: classifyClinicalMetrics(myopiaMetrics, 35).finding,
    analysisMetrics: myopiaMetrics, clinicalClassification: classifyClinicalMetrics(myopiaMetrics, 35),
  },
];

export const initialAuditEvents: AuditEvent[] = [
  { time: "19:14", message: "Dr. K approved report for TE-2405-0179" },
  { time: "19:09", message: "Quality worker passed TE-2405-0187 with score 96" },
  { time: "18:57", message: "De-identification service removed direct identifiers from upload batch" },
  { time: "18:43", message: "Hospital staff downloaded released PDF report TE-2405-0171" },
];

export const dashboardMetrics = [
  { label: "OCTA Scans Reviewed", value: "1,248", caption: "3x3 macula protocol", tone: "purple" },
  { label: "Diseases Screened", value: "6", caption: "AD · DR · Glaucoma · AMD · HTN · PM", tone: "blue" },
  { label: "Mean Risk Score", value: "0.38", caption: "Screening support only", tone: "orange" },
  { label: "Positive Signals", value: "317", caption: "Across all disease modules", tone: "green" },
];

export const researchEvidence = [
  // ── Alzheimer’s ───────────────────────────────────────────────────────────
  {
    title: "Retinal changes in brain disorders (OCTA)",
    source: "ResearchGate",
    type: "Alzheimer’s",
    summary: "OCT-A figure showing retinal microvascular changes associated with brain disorders including Alzheimer’s disease.",
    url: "https://www.researchgate.net/figure/Retinal-changes-in-brain-disorders-Optical-coherence-tomography-angiography-OCT-A_fig3_382473153",
  },
  {
    title: "Retinovascular changes in AD patients",
    source: "ResearchGate",
    type: "Alzheimer’s",
    summary: "Reference image comparing retinovascular patterns — vessel density and FAZ — between AD patients and normal controls.",
    url: "https://www.researchgate.net/figure/Retinovascular-changes-in-AD-patients-This-Image-shows-the-differences-between-the_fig2_370356486",
  },
  {
    title: "Dementia Australia retinal imaging brief",
    source: "Dementia Australia",
    type: "Alzheimer’s",
    summary: "Research communication on retinal imaging and dementia-related biomarkers: vessel density, FAZ, and perfusion density.",
    url: "https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf",
  },
  {
    title: "Duke Eye Center — OCTA Alzheimer screening",
    source: "Duke Eye Center",
    type: "Alzheimer’s",
    summary: "Clinical news on OCTA retinal biomarkers as early Alzheimer’s risk signals before cognitive symptoms appear.",
    url: "https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms",
  },
  {
    title: "Retinal biomarkers in neurodegeneration",
    source: "PubMed Central",
    type: "Alzheimer’s",
    summary: "Open-access review of OCT/OCTA vascular biomarkers (vessel density, FAZ, perfusion) for neurodegenerative disease screening.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/",
  },
  // ── Diabetic Retinopathy ──────────────────────────────────────────────────
  {
    title: "OCTA in Diabetic Retinopathy management",
    source: "Retina Specialist",
    type: "Diabetic Retinopathy",
    summary: "OCTA metrics for DR: FAZ enlargement, capillary non-perfusion, microaneurysm detection, and neovascularization mapping.",
    url: "https://www.retina-specialist.com/article/optical-coherence-tomography-in-the-management-of-diabetic-retinopathy",
  },
  {
    title: "DR retinal imaging overview",
    source: "MDPI J. Clin. Med.",
    type: "Diabetic Retinopathy",
    summary: "Comprehensive review of retinal imaging modalities for diabetic retinopathy including OCTA vessel density and IRF metrics.",
    url: "https://www.mdpi.com/2077-0383/9/6/1723",
  },
  {
    title: "Fundus photo — diabetic retinopathy",
    source: "ResearchGate",
    type: "Diabetic Retinopathy",
    summary: "Reference fundus photograph showing characteristic DR features: microaneurysms, hemorrhages, and hard exudates.",
    url: "https://www.researchgate.net/figure/Fundus-photograph-50-degree-view-of-a-patient-with-diabetic-retinopathy-shows-a-large_fig4_344343216",
  },
  // ── Glaucoma ─────────────────────────────────────────────────────────────
  {
    title: "OCTA-Angiography and Glaucoma",
    source: "EyeWiki / AAO",
    type: "Glaucoma",
    summary: "OCTA in glaucoma: vessel density reduction in optic nerve head, peripapillary RNFL thinning, and BMO rim width.",
    url: "https://eyewiki.org/OCT-Angiography_and_Glaucoma",
  },
  {
    title: "OCT optic nerve evaluation for glaucoma",
    source: "Glaucoma Today",
    type: "Glaucoma",
    summary: "OCT biomarkers for glaucoma: RNFL thickness, BMO minimal rim width, and ganglion cell complex metrics.",
    url: "https://glaucomatoday.com/articles/2015-mar-apr/evaluating-the-optic-nerve-for-glaucomatous-damage-with-oct",
  },
  {
    title: "MDPI Sensors — Glaucoma detection OCTA",
    source: "MDPI Sensors",
    type: "Glaucoma",
    summary: "Machine learning approach for glaucoma screening using OCTA vessel density and optic disc parameters.",
    url: "https://www.mdpi.com/1424-8220/25/14/4337",
  },
  // ── AMD ───────────────────────────────────────────────────────────────────
  {
    title: "OCT in Age-Related Macular Degeneration",
    source: "AMD Book",
    type: "AMD",
    summary: "OCT/OCTA biomarkers for AMD: drusen characterization, CNV detection (lacy-wheel/sea-fan pattern), fluid biomarkers, and RPE integrity.",
    url: "https://amdbook.org/content/optical-coherence-tomography-age-related-macular-degeneration",
  },
  {
    title: "AMD clinical features — late stage",
    source: "ResearchGate",
    type: "AMD",
    summary: "Reference image of late-stage AMD: geographic atrophy and choroidal neovascularization features on fundus and OCT.",
    url: "https://www.researchgate.net/figure/Clinical-features-of-late-stages-of-age-related-macular-degeneration-Funduscopy_fig1_354353017",
  },
  // ── Hypertensive Retinopathy / RVO ───────────────────────────────────────
  {
    title: "Retinal Vein Occlusion — Waterloo Eye",
    source: "Waterloo Eye",
    type: "Hypertensive Retinopathy",
    summary: "RVO features: dilated/tortuous veins, flame hemorrhages, cotton wool spots, and macular edema on OCT.",
    url: "https://www.waterlooeye.ca/diseases/retinal-vein-occlusion",
  },
  {
    title: "OCTA in accelerated hypertension",
    source: "Cureus",
    type: "Hypertensive Retinopathy",
    summary: "OCTA findings in accelerated hypertension: AV nicking, arterial narrowing, capillary rarefaction, and disc edema.",
    url: "https://www.cureus.com/articles/247792-optical-coherence-tomography-angiography-findings-associated-with-accelerated-hypertension",
  },
  // ── Pathologic Myopia ────────────────────────────────────────────────────
  {
    title: "Pathologic Myopia — MDPI Diagnostics",
    source: "MDPI Diagnostics",
    type: "Pathologic Myopia",
    summary: "OCT features of pathologic myopia: chorioretinal atrophy, lacquer cracks, optic disc tilt, and myopic CNV.",
    url: "https://www.mdpi.com/2075-4418/12/6/1418",
  },
  {
    title: "Managing Pathologic Myopia",
    source: "Review of Ophthalmology",
    type: "Pathologic Myopia",
    summary: "Clinical management of pathologic myopia: OCTA biomarkers for chorioretinal atrophy and posterior staphyloma.",
    url: "https://www.reviewofophthalmology.com/article/how-to-manage-pathologic-myopia",
  },
];

export const pipelineSteps = [
  { label: "Upload", caption: "OCTA + metadata", state: "done" },
  { label: "Quarantine", caption: "Raw encrypted", state: "done" },
  { label: "Consent", caption: "Screening allowed", state: "done" },
  { label: "De-ID", caption: "PHI removed", state: "done" },
  { label: "Quality", caption: "Pass 96", state: "done" },
  { label: "AI analysis", caption: "Mock result ready", state: "active" },
  { label: "Doctor review", caption: "Pending", state: "pending" },
  { label: "Report", caption: "Locked", state: "pending" },
];
