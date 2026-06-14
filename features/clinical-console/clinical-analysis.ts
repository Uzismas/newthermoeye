import type { BaselineAnalysisMetrics, CaseRecord, ClinicalClassification, DifferentialSignal, DiseaseKind, RiskLevel, VisionResult } from "./types";

export const clinicalEvidenceSources = [
  { label: "ResearchGate OCTA brain-disorder figure", url: "https://www.researchgate.net/figure/Retinal-changes-in-brain-disorders-Optical-coherence-tomography-angiography-OCT-A_fig3_382473153" },
  { label: "ResearchGate AD retinovascular figure", url: "https://www.researchgate.net/figure/Retinovascular-changes-in-AD-patients-This-Image-shows-the-differences-between-the_fig2_370356486" },
  { label: "Dementia Australia retinal imaging research sheet", url: "https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf" },
  { label: "Duke Eye Center OCTA Alzheimer research article", url: "https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms" },
  { label: "PMC open-access retinal biomarker review", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/" },
  { label: "Springer DR OCTA review", url: "https://link.springer.com/content/pdf/10.1186/s40662-019-0160-3.pdf" },
  { label: "AMD OCT biomarkers – AMD Book", url: "https://amdbook.org/content/optical-coherence-tomography-age-related-macular-degeneration" },
  { label: "Glaucoma OCT optic-nerve evaluation", url: "https://glaucomatoday.com/articles/2015-mar-apr/evaluating-the-optic-nerve-for-glaucomatous-damage-with-oct" },
  { label: "Pathologic Myopia – MDPI Diagnostics", url: "https://www.mdpi.com/2075-4418/12/6/1418" },
  { label: "MDPI Sensors – Glaucoma OCTA", url: "https://www.mdpi.com/1424-8220/25/14/4337" },
];

export const clinicalModelVersion = "thermoeye-multidisease-ruleset-2026.06";

// ─── Disease metadata ────────────────────────────────────────────────────────

const DISEASE_META: Record<DiseaseKind, { label: string; shortLabel: string; riskLevel: RiskLevel }> = {
  normal:                  { label: "Normal screening pattern",             shortLabel: "Normal",                  riskLevel: "low" },
  alzheimer_risk:          { label: "Alzheimer-risk screening pattern",     shortLabel: "Alzheimer Risk",           riskLevel: "high" },
  diabetic_retinopathy:    { label: "Diabetic Retinopathy screening signal", shortLabel: "Diabetic Retinopathy",    riskLevel: "high" },
  glaucoma:                { label: "Glaucoma screening signal",             shortLabel: "Glaucoma",                riskLevel: "high" },
  amd:                     { label: "Age-Related Macular Degeneration signal", shortLabel: "AMD",                   riskLevel: "moderate" },
  hypertensive_retinopathy:{ label: "Hypertensive Retinopathy signal",      shortLabel: "Hypertensive Retinopathy", riskLevel: "moderate" },
  pathologic_myopia:       { label: "Pathologic Myopia signal",             shortLabel: "Pathologic Myopia",        riskLevel: "moderate" },
  quality_blocked:         { label: "Quality blocked",                      shortLabel: "Quality Blocked",          riskLevel: "blocked" },
};

const DISEASE_FINDING: Record<DiseaseKind, string> = {
  normal: "OCTA screening pattern within normal reference band: vessel-density proxy preserved, FAZ/perfusion-risk proxy not enlarged, image quality acceptable.",
  alzheimer_risk: "OCTA pattern consistent with Alzheimer-risk literature signals: reduced retinal vessel-density proxy with FAZ/perfusion-risk deviation. Referral-support result, not a diagnosis.",
  diabetic_retinopathy: "OCTA pattern consistent with diabetic retinopathy signals: significant FAZ enlargement proxy, capillary non-perfusion markers, and brightness consistent with exudate/microaneurysm deposits.",
  glaucoma: "OCTA pattern consistent with glaucoma signals: reduced peripapillary vessel density, decreased RNFL perfusion proxy, and contrast pattern associated with nerve-fiber dropout.",
  amd: "OCTA pattern consistent with AMD signals: elevated brightness proxy suggesting drusen or CNV, with RPE integrity changes and central vessel-density disruption.",
  hypertensive_retinopathy: "OCTA pattern consistent with hypertensive retinopathy: vascular irregularity proxy, AV ratio changes, and artifact pattern associated with flame hemorrhages.",
  pathologic_myopia: "OCTA pattern consistent with pathologic myopia: very low contrast and brightness consistent with chorioretinal atrophy, optic disc tilt proxy.",
  quality_blocked: "Image quality is blocked. Do not classify disease status from this scan; request a repeat OCTA/OCT acquisition before releasing a report.",
};

const DISEASE_RECOMMENDATION: Record<DiseaseKind, string> = {
  normal: "Continue routine eye/neurology care unless symptoms, family history, or clinician judgment require follow-up.",
  alzheimer_risk: "Recommend clinician review, cognitive screening correlation, and follow-up planning. Not a standalone diagnosis.",
  diabetic_retinopathy: "Refer to ophthalmologist for detailed fundus exam, OCTA grading, and HbA1c correlation. Anti-VEGF assessment if neovascularization suspected.",
  glaucoma: "Refer to glaucoma specialist for IOP measurement, visual field testing, and full optic disc assessment. RNFL imaging recommended.",
  amd: "Refer to retina specialist for Amsler grid assessment, vitamin supplementation review (AREDS2), and anti-VEGF evaluation if wet AMD suspected.",
  hypertensive_retinopathy: "Correlate with systemic blood pressure. Cardiology referral if accelerated hypertension suspected. Monitor optic disc for edema.",
  pathologic_myopia: "Monitor for myopic CNV, posterior staphyloma, and visual-field changes. Low-vision support if significant atrophy detected.",
  quality_blocked: "Repeat scan before AI screening, doctor release, or PDF generation.",
};

// ─── Metrics factory ─────────────────────────────────────────────────────────

export function createClinicalMetrics(input: {
  artifactScore: number; brightness: number; confidenceScore: number;
  contrast: number; imageHeight: number; imageWidth: number;
  qualityScore: number; sharpness: number; vesselDensity: number;
  visionResult?: import("./types").VisionResult;
}): BaselineAnalysisMetrics {
  const vesselDensityProxy = Math.round(input.vesselDensity);
  const perfusionDensityProxy = Math.round(Math.min(98, Math.max(18, vesselDensityProxy + input.contrast * 0.18 - input.artifactScore * 0.12)));
  const fazRiskProxy = Math.round(Math.min(95, Math.max(8, 70 - vesselDensityProxy + Math.max(0, input.artifactScore - 12) * 0.45)));
  return {
    artifactScore: Math.round(input.artifactScore),
    brightness: Math.round(input.brightness),
    confidenceScore: Math.round(input.confidenceScore),
    contrast: Math.round(input.contrast),
    demoEngineVersion: clinicalModelVersion,
    fazRiskProxy,
    imageHeight: input.imageHeight,
    imageWidth: input.imageWidth,
    perfusionDensityProxy,
    qualityScore: input.qualityScore,
    sharpness: Math.round(input.sharpness),
    vesselDensity: vesselDensityProxy,
    ...(input.visionResult ? { visionResult: input.visionResult } : {}),
  };
}

function visionResultToClassification(v: VisionResult): ClinicalClassification {
  const kind = (DISEASE_META[v.primaryDisease as DiseaseKind] ? v.primaryDisease : "normal") as DiseaseKind;
  return {
    kind,
    riskLevel: (v.riskLevel as RiskLevel) ?? DISEASE_META[kind].riskLevel,
    riskScore: v.riskScore,
    label: v.label || DISEASE_META[kind].label,
    finding: v.finding || DISEASE_FINDING[kind],
    recommendation: v.recommendation || DISEASE_RECOMMENDATION[kind],
    evidence: v.evidence ?? [],
    differentials: v.differentials?.map((d) => ({
      kind: d.kind,
      label: d.label,
      score: d.score,
      evidence: d.evidence,
    })),
  };
}

// ─── Per-disease scorers (0–100) ─────────────────────────────────────────────

function scoreAlzheimer(m: BaselineAnalysisMetrics, age: number): number {
  const ageW = Math.max(0, age - 58) * 0.4;
  const vd = Math.max(0, 50 - m.vesselDensity) * 1.05;
  const faz = Math.max(0, m.fazRiskProxy - 38) * 0.55;
  const perf = Math.max(0, 50 - m.perfusionDensityProxy) * 0.65;
  return Math.min(95, Math.max(0, 12 + ageW + vd + faz + perf));
}

function scoreDR(m: BaselineAnalysisMetrics): number {
  // Signature: high FAZ, low vessel density, high brightness (exudates), moderate artifact
  const faz = Math.max(0, m.fazRiskProxy - 45) * 1.2;
  const vd = Math.max(0, 42 - m.vesselDensity) * 0.9;
  const bright = Math.max(0, m.brightness - 140) * 0.3;
  const art = Math.max(0, m.artifactScore - 10) * 0.4;
  return Math.min(95, Math.max(0, faz + vd + bright + art));
}

function scoreGlaucoma(m: BaselineAnalysisMetrics): number {
  // Signature: low perfusion, moderate-low vessel density, low contrast (uniform RNFL dropout)
  const perf = Math.max(0, 46 - m.perfusionDensityProxy) * 1.1;
  const vd = Math.max(0, 50 - m.vesselDensity) * 0.55;
  const contrast = Math.max(0, 40 - m.contrast) * 0.6;
  return Math.min(95, Math.max(0, perf + vd + contrast));
}

function scoreAMD(m: BaselineAnalysisMetrics, age: number): number {
  // Signature: high brightness (drusen), moderate artifact (RPE changes), age-weighted
  const ageW = Math.max(0, age - 60) * 0.35;
  const bright = Math.max(0, m.brightness - 145) * 0.5;
  const art = Math.max(0, m.artifactScore - 15) * 0.55;
  const vd = Math.max(0, 52 - m.vesselDensity) * 0.35;
  return Math.min(95, Math.max(0, ageW + bright + art + vd));
}

function scoreHypertensive(m: BaselineAnalysisMetrics): number {
  // Signature: moderate artifact (flame hems), high contrast (AV nicking), vessel density maintained
  const art = Math.max(0, m.artifactScore - 18) * 0.9;
  const contrast = Math.max(0, m.contrast - 48) * 0.7;
  const vdPenalty = Math.max(0, m.vesselDensity - 35) * 0.2; // vessels present but abnormal
  return Math.min(95, Math.max(0, art + contrast + vdPenalty));
}

function scoreMyopia(m: BaselineAnalysisMetrics): number {
  // Signature: very low contrast, low brightness (chorioretinal atrophy), low vessel density
  const contrast = Math.max(0, 32 - m.contrast) * 1.0;
  const bright = Math.max(0, 118 - m.brightness) * 0.35;
  const vd = Math.max(0, 48 - m.vesselDensity) * 0.5;
  return Math.min(95, Math.max(0, contrast + bright + vd));
}

// ─── Multi-disease classifier ─────────────────────────────────────────────────

export function classifyClinicalMetrics(m: BaselineAnalysisMetrics, age: number): ClinicalClassification {
  // If Claude Vision analyzed this image, use that result directly
  if (m.visionResult) {
    return visionResultToClassification(m.visionResult);
  }

  if (m.qualityScore < 55 || m.artifactScore > 45) {
    return {
      kind: "quality_blocked", riskLevel: "blocked", riskScore: 0,
      label: DISEASE_META.quality_blocked.label,
      finding: DISEASE_FINDING.quality_blocked,
      recommendation: DISEASE_RECOMMENDATION.quality_blocked,
      evidence: [`Image quality ${Math.round(m.qualityScore)}%`, `Artifact estimate ${m.artifactScore}%`, "Classification withheld — quality gate failed"],
    };
  }

  const scores: Record<Exclude<DiseaseKind, "normal" | "quality_blocked">, number> = {
    alzheimer_risk: scoreAlzheimer(m, age),
    diabetic_retinopathy: scoreDR(m),
    glaucoma: scoreGlaucoma(m),
    amd: scoreAMD(m, age),
    hypertensive_retinopathy: scoreHypertensive(m),
    pathologic_myopia: scoreMyopia(m),
  };

  // Primary: highest scoring disease if any exceeds threshold
  const THRESHOLD = 28;
  let primaryKind: DiseaseKind = "normal";
  let primaryScore = 0;
  for (const [kind, score] of Object.entries(scores) as [Exclude<DiseaseKind, "normal" | "quality_blocked">, number][]) {
    if (score > primaryScore) { primaryScore = score; primaryKind = kind; }
  }
  if (primaryScore < THRESHOLD) { primaryKind = "normal"; }

  // Differentials: other diseases with score >= 18, sorted desc, excluding primary
  const differentials: DifferentialSignal[] = (Object.entries(scores) as [Exclude<DiseaseKind, "normal" | "quality_blocked">, number][])
    .filter(([kind, score]) => kind !== primaryKind && score >= 18)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind, score]) => ({
      kind,
      label: DISEASE_META[kind].shortLabel,
      score: Math.round(score),
      evidence: getDiseaseEvidence(kind, m),
    }));

  if (primaryKind === "normal") {
    return {
      kind: "normal", riskLevel: "low",
      riskScore: Math.min(Math.round(primaryScore), 28),
      label: DISEASE_META.normal.label,
      finding: DISEASE_FINDING.normal,
      recommendation: DISEASE_RECOMMENDATION.normal,
      evidence: [`Vessel-density proxy ${m.vesselDensity}% preserved`, `FAZ/perfusion-risk proxy ${m.fazRiskProxy}% within reference band`, `Image quality ${Math.round(m.qualityScore)}% passed`],
      differentials: differentials.length ? differentials : undefined,
    };
  }

  const riskLevel: RiskLevel = primaryScore >= 65 ? "high" : primaryScore >= 40 ? "moderate" : "low";
  return {
    kind: primaryKind,
    riskLevel,
    riskScore: Math.round(Math.min(92, Math.max(30, primaryScore))),
    label: DISEASE_META[primaryKind].label,
    finding: DISEASE_FINDING[primaryKind],
    recommendation: DISEASE_RECOMMENDATION[primaryKind],
    evidence: getDiseaseEvidence(primaryKind, m),
    differentials: differentials.length ? differentials : undefined,
  };
}

function getDiseaseEvidence(kind: DiseaseKind, m: BaselineAnalysisMetrics): string[] {
  switch (kind) {
    case "alzheimer_risk":      return [`Vessel-density proxy ${m.vesselDensity}% reduced`, `FAZ/perfusion-risk proxy ${m.fazRiskProxy}% elevated`, `Perfusion-density proxy ${m.perfusionDensityProxy}%`];
    case "diabetic_retinopathy":return [`FAZ enlargement proxy ${m.fazRiskProxy}% elevated`, `Vessel density ${m.vesselDensity}% — capillary dropout pattern`, `Brightness ${m.brightness} — exudate/microaneurysm signal`];
    case "glaucoma":            return [`Peripapillary perfusion proxy ${m.perfusionDensityProxy}% low`, `Contrast index ${m.contrast} — RNFL dropout pattern`, `Vessel-density proxy ${m.vesselDensity}%`];
    case "amd":                 return [`Brightness ${m.brightness} — drusen/CNV signal elevated`, `Artifact proxy ${m.artifactScore}% — RPE integrity change`, `Vessel-density proxy ${m.vesselDensity}%`];
    case "hypertensive_retinopathy": return [`Artifact proxy ${m.artifactScore}% — vascular irregularity`, `Contrast ${m.contrast} — AV nicking/flame hemorrhage pattern`, `Vessel density ${m.vesselDensity}% maintained with tortuosity`];
    case "pathologic_myopia":   return [`Contrast ${m.contrast} — chorioretinal atrophy pattern`, `Brightness ${m.brightness} — retinal thinning signal`, `Vessel-density proxy ${m.vesselDensity}%`];
    default: return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getCaseClassification(caseRecord: CaseRecord): ClinicalClassification {
  if (caseRecord.clinicalClassification) return caseRecord.clinicalClassification;
  const metrics = caseRecord.analysisMetrics ?? createClinicalMetrics({
    artifactScore: caseRecord.riskLevel === "blocked" ? 58 : caseRecord.riskLevel === "low" ? 6 : 18,
    brightness: 128, confidenceScore: Number(caseRecord.confidence.replace(/\D/g, "")) || 86,
    contrast: 42, imageHeight: 0, imageWidth: 0,
    qualityScore: Number(caseRecord.qualityLabel.replace(/\D/g, "")) || 92,
    sharpness: 72, vesselDensity: caseRecord.riskLevel === "low" ? 56 : caseRecord.riskLevel === "moderate" ? 39 : 32,
  });
  return classifyClinicalMetrics(metrics, caseRecord.age);
}

export function getClinicalResultLabel(kind: ClinicalClassification["kind"]): string {
  return DISEASE_META[kind]?.shortLabel ?? "Unknown";
}

export function getClinicalResultTone(kind: ClinicalClassification["kind"]): RiskLevel {
  return DISEASE_META[kind]?.riskLevel ?? "low";
}

export function createCaseFromClinicalInput(input: {
  age: number; caseCode: string; eye?: CaseRecord["eye"];
  fileName?: string; metrics: BaselineAnalysisMetrics;
  scanType: string; sex: CaseRecord["sex"]; uploadedImageUrl?: string;
}): CaseRecord {
  const classification = classifyClinicalMetrics(input.metrics, input.age);
  const normalizedCaseCode = input.caseCode.trim().toUpperCase().replace(/\s+/g, "-") || `TE-${Date.now()}`;
  const status = classification.kind === "quality_blocked" ? "Rescan needed" : "AI completed";
  const densityDelta = input.metrics.vesselDensity - 50;
  return {
    id: normalizedCaseCode,
    age: input.age, sex: input.sex,
    scanType: input.scanType.includes("OCT") ? "OCTA" : input.scanType,
    eye: input.eye ?? "OD",
    riskLevel: classification.riskLevel,
    riskScore: classification.riskScore,
    qualityLabel: `${classification.kind === "quality_blocked" ? "Fail" : "Pass"} ${Math.round(input.metrics.qualityScore)}`,
    status, context: `${input.age}${input.sex} · uploaded OCTA screening · ${input.scanType}`,
    confidence: classification.kind === "quality_blocked" ? "Confidence unavailable" : `Confidence ${Math.round(input.metrics.confidenceScore)}%`,
    density: `Vessel density ${densityDelta >= 0 ? "+" : ""}${densityDelta.toFixed(1)}%`,
    heatmap: getHeatmapLabel(classification.riskLevel, classification.kind),
    note: classification.finding,
    uploadedFileName: input.fileName, uploadedImageUrl: input.uploadedImageUrl,
    analysisMetrics: input.metrics, clinicalClassification: classification,
  };
}

function getHeatmapLabel(riskLevel: RiskLevel, kind: DiseaseKind): string {
  if (riskLevel === "blocked") return "Quality blocked";
  if (kind === "normal") return "Low attention";
  return `${DISEASE_META[kind]?.shortLabel ?? "Risk"} — ${riskLevel} signal`;
}
