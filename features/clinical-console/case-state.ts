import { normalizeCaseRecord } from "./clinical-analysis";
import type { CaseRecord, ReviewRecord } from "./types";

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nullablePercent = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const nullableDimension = (value: unknown) => value === null || (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 16_000_000);

/** Validate before normalization: malformed supplied cases must never appear to save. */
export function validateUploadedCase(value: unknown): { ok: true; caseRecord: CaseRecord } | { ok: false; message: string } {
  if (!object(value)) return { ok: false, message: "A complete caseRecord is required." };
  if (typeof value.id !== "string" || !/^[A-Z0-9-]{4,64}$/.test(value.id)) return { ok: false, message: "Case id is invalid." };
  if (typeof value.age !== "number" || !Number.isInteger(value.age) || value.age < 0 || value.age > 120 || !["F", "M"].includes(String(value.sex)) || !["OD", "OS", "OU"].includes(String(value.eye))) {
    return { ok: false, message: "Case demographics are invalid." };
  }
  for (const key of ["scanType", "qualityLabel", "status", "context", "density", "heatmap", "note"]) {
    if (typeof value[key] !== "string" || (value[key] as string).length > 600) return { ok: false, message: `Case ${key} is invalid.` };
  }
  if (!["OCT", "OCTA", "OCT/OCTA", "OCTA macula", "OCT retinal layer", "OCTA widefield"].includes(String(value.scanType))) return { ok: false, message: "Scan type must be OCT or OCTA." };
  if (value.riskLevel !== "indeterminate" || value.riskScore !== null || value.confidence !== null) return { ok: false, message: "Disease risk must remain indeterminate with null risk and confidence." };
  if (!object(value.analysisMetrics)) return { ok: false, message: "Canonical analysis metrics are required." };
  const metrics = value.analysisMetrics;
  for (const key of ["brightness", "contrast", "sharpness", "vesselDensity", "qualityScore", "confidenceScore", "fazRiskProxy", "artifactScore", "perfusionDensityProxy"]) {
    if (!nullablePercent(metrics[key])) return { ok: false, message: `Analysis metric ${key} must be null or a finite percentage.` };
  }
  if (!nullableDimension(metrics.imageWidth) || !nullableDimension(metrics.imageHeight)) return { ok: false, message: "Analysis dimensions are invalid." };
  if (typeof metrics.demoEngineVersion !== "string" || !object(metrics.visionResult)) return { ok: false, message: "Canonical analysis result is required." };
  const result = metrics.visionResult;
  if (result.schemaVersion !== "octa-analysis-v2" || result.metricUnit !== "percent_0_100" || !["measured", "quality_blocked", "modality_blocked", "unavailable"].includes(String(result.analysisStatus))) {
    return { ok: false, message: "Analysis schema, status, or units are invalid." };
  }
  for (const key of ["vesselDensity", "fazRisk", "perfusion", "qualityScore"]) {
    if (!nullablePercent(result[key])) return { ok: false, message: `Analysis result ${key} must be null or a finite percentage.` };
  }
  if (result.primaryDisease !== "indeterminate" || result.riskLevel !== "indeterminate" || result.riskScore !== null || result.confidence !== null || !Array.isArray(result.differentials) || result.differentials.length > 0) {
    return { ok: false, message: "Unsupported disease predictions cannot be saved." };
  }
  return { ok: true, caseRecord: metadataOnlyCase(value as unknown as CaseRecord) };
}

/** An explicit metadata whitelist prevents raw images or unknown payload fields entering the store. */
export function metadataOnlyCase(value: CaseRecord): CaseRecord {
  const normalized = normalizeCaseRecord({
    id: value.id, age: value.age, sex: value.sex, scanType: value.scanType, eye: value.eye,
    riskLevel: "indeterminate", riskScore: null, confidence: null,
    qualityLabel: value.qualityLabel, status: value.status, context: value.context,
    density: value.density, heatmap: value.heatmap, note: value.note,
    analysisMetrics: value.analysisMetrics,
    analysisReceipt: value.analysisReceipt,
  });
  if (normalized.analysisMetrics?.visionResult) {
    delete normalized.analysisMetrics.visionResult.previewDataUrl;
    delete normalized.analysisMetrics.visionResult.segmentationMaskDataUrl;
  }
  return normalized;
}

export function canReleaseResearchReport(caseRecord: CaseRecord): boolean {
  const result = caseRecord.analysisMetrics?.visionResult;
  return result?.analysisStatus === "measured"
    && (result.engine === "onnx_vessel_unet" || result.engine === "heuristic_research_baseline")
    && [result.vesselDensity, result.fazRisk, result.perfusion].some((value) => typeof value === "number" && Number.isFinite(value));
}

export function defaultCaseReview(caseRecord: CaseRecord, reviewer = "Unassigned"): ReviewRecord {
  const status = caseRecord.analysisMetrics?.visionResult?.analysisStatus;
  const blocked = status === "quality_blocked" || status === "modality_blocked";
  return {
    decision: blocked ? "Rescan requested" : "Pending review",
    note: blocked ? "Analysis is blocked. Request a suitable rescan before research report release."
      : canReleaseResearchReport(caseRecord) ? "Research measurements only. Awaiting review; disease classification is unavailable."
        : "Analysis is unavailable. A measured result is required before research report release.",
    reviewer, followUpWindow: blocked ? "Rescan first" : "Routine", updatedAt: "Not reviewed",
  };
}

/** New successful mutations win over a delayed initial snapshot. */
export function mergeServerCases(current: CaseRecord[], incoming: CaseRecord[], preserveCurrent: boolean): CaseRecord[] {
  if (!preserveCurrent) return incoming.map(normalizeCaseRecord);
  const currentIds = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !currentIds.has(item.id)).map(normalizeCaseRecord)];
}

export function withTransientPreview(saved: CaseRecord, original: CaseRecord): CaseRecord {
  const result = normalizeCaseRecord(saved);
  if (result.id !== original.id) return result;
  result.uploadedImageUrl = original.uploadedImageUrl;
  result.uploadedFileName = original.uploadedFileName;
  if (result.analysisMetrics?.visionResult && original.analysisMetrics?.visionResult) {
    result.analysisMetrics.visionResult.previewDataUrl = original.analysisMetrics.visionResult.previewDataUrl;
    result.analysisMetrics.visionResult.segmentationMaskDataUrl = original.analysisMetrics.visionResult.segmentationMaskDataUrl;
  }
  return result;
}
