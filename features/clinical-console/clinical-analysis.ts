import type { BaselineAnalysisMetrics, CaseRecord, ClinicalClassification, RiskLevel, VisionResult } from "./types";
import { normalizeAnalysis, normalizePercent, unavailableAnalysis } from "./analysis-contract";

export const clinicalModelVersion = "octa-analysis-v2";
export const clinicalEvidenceSources = [
  { label: "Retinal biomarker research review (not product validation)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/" },
  { label: "OCTA retinal research", url: "https://link.springer.com/content/pdf/10.1186/s40662-019-0160-3.pdf" },
];

/** Only canonical percentages. Display retains small percentages such as 0.16%. */
export function formatPercent(value: number | null | undefined): string {
  const n = normalizePercent(value, "percent_0_100");
  return n === null ? "N/A" : `${Number(n.toFixed(2))}%`;
}
export function formatRiskScore(c: Pick<CaseRecord, "riskLevel" | "riskScore" | "analysisMetrics" | "clinicalClassification">): string {
  if (!c.analysisMetrics && !c.clinicalClassification) return "N/A";
  if (c.riskLevel === "blocked" || c.riskLevel === "indeterminate") return "N/A";
  return formatPercent(c.riskScore);
}
export function formatConfidence(_value: string | number | null | undefined): string {
  void _value;
  // No calibrated disease classifier exists. Legacy confidence strings are never parsed.
  return "N/A";
}

/** Existing seed callers are retained, but legacy synthetic numbers are not analysis evidence. */
export function createClinicalMetrics(input: Partial<BaselineAnalysisMetrics>): BaselineAnalysisMetrics {
  const v = input.visionResult ? normalizeAnalysis(input.visionResult) : unavailableAnalysis("Legacy or synthetic fixture; no measured result attached.");
  return metricsFromAnalysis(v);
}

export function metricsFromAnalysis(input: VisionResult): BaselineAnalysisMetrics {
  const v = normalizeAnalysis(input);
  return {
    brightness: v.brightness ?? null, contrast: v.contrast ?? null, sharpness: v.sharpness ?? null,
    vesselDensity: v.vesselDensity, qualityScore: v.qualityScore, confidenceScore: null,
    fazRiskProxy: v.fazRisk, perfusionDensityProxy: v.perfusion, artifactScore: v.artifactScore ?? null,
    imageWidth: v.imageWidth ?? null, imageHeight: v.imageHeight ?? null,
    demoEngineVersion: clinicalModelVersion, visionResult: v,
  };
}

export function classifyClinicalMetrics(m: BaselineAnalysisMetrics, _age?: number): ClinicalClassification {
  void _age;
  const v = m.visionResult ? normalizeAnalysis(m.visionResult) : unavailableAnalysis();
  // quality_blocked is a workflow status retained for release guards, never a disease.
  const blocked = v.analysisStatus === "quality_blocked" || v.analysisStatus === "modality_blocked";
  return {
    kind: blocked ? "quality_blocked" : "indeterminate", riskLevel: "indeterminate", riskScore: null,
    label: v.label, finding: v.finding, recommendation: v.recommendation,
    evidence: v.failureReason ? [v.failureReason] : [], differentials: [],
  };
}
export function getCaseClassification(c: CaseRecord): ClinicalClassification {
  return classifyClinicalMetrics(c.analysisMetrics ?? metricsFromAnalysis(unavailableAnalysis()), c.age);
}
export function getClinicalResultLabel(kind: ClinicalClassification["kind"]): string {
  return kind === "quality_blocked" ? "Analysis blocked" : "Indeterminate";
}
export function getClinicalResultTone(kind: ClinicalClassification["kind"]): RiskLevel {
  return kind === "quality_blocked" ? "blocked" : "indeterminate";
}
export function normalizeCaseRecord(c: CaseRecord): CaseRecord {
  const metrics = createClinicalMetrics(c.analysisMetrics ?? {});
  const classification = classifyClinicalMetrics(metrics);
  const v = metrics.visionResult!;
  return {
    ...c, analysisMetrics: metrics, clinicalClassification: classification,
    riskLevel: "indeterminate", riskScore: null, confidence: null,
    qualityLabel: `${v.qualityStatus ?? "not_evaluated"} ${formatPercent(v.qualityScore)}`,
    status: v.analysisStatus === "measured" ? "Research measurement completed" : classification.kind === "quality_blocked" ? "Rescan needed" : "Analysis unavailable",
    density: `Vessel segmentation measurement ${formatPercent(v.vesselDensity)}`,
    heatmap: "Disease heatmap unavailable", note: classification.finding,
  };
}
export function createCaseFromClinicalInput(input: {
  age: number; caseCode: string; eye?: CaseRecord["eye"]; fileName?: string;
  metrics: BaselineAnalysisMetrics; scanType: string; sex: CaseRecord["sex"]; uploadedImageUrl?: string;
}): CaseRecord {
  const id = input.caseCode.trim().toUpperCase().replace(/\s+/g, "-") || `TE-${crypto.randomUUID().toUpperCase()}`;
  return normalizeCaseRecord({
    id, age: input.age, sex: input.sex, scanType: input.scanType, eye: input.eye ?? "OD",
    riskLevel: "indeterminate", riskScore: null, confidence: null, qualityLabel: "N/A",
    status: "Analysis unavailable", context: `${input.age}${input.sex} · ${input.scanType}`,
    density: "N/A", heatmap: "Unavailable", note: "Indeterminate",
    uploadedFileName: input.fileName, uploadedImageUrl: input.uploadedImageUrl, analysisMetrics: input.metrics,
  });
}
