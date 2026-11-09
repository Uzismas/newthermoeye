import type { VisionResult } from "./types";

export const ANALYSIS_SCHEMA = "octa-analysis-v2" as const;
export type MetricUnit = "percent_0_100" | "fraction_0_1";
type Raw = Record<string, unknown>;
const record = (v: unknown): Raw => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Raw : {};
const str = (v: unknown): string | null => typeof v === "string" && v.length > 0 ? v.slice(0, 600) : null;

/** Never infer units from magnitude, parse strings, clamp invalid values, or replace null. */
export function normalizePercent(value: unknown, unit: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const upper = unit === "fraction_0_1" ? 1 : unit === "percent_0_100" ? 100 : null;
  if (upper === null || value < 0 || value > upper) return null;
  return unit === "fraction_0_1" ? value * 100 : value;
}

export function unavailableAnalysis(reason = "Local inference is unavailable."): VisionResult {
  return normalizeAnalysis({ analysisStatus: "unavailable", failureReason: reason, engine: "none" });
}

/** Canonical display object. Provider-authored diagnoses and unsupported measurements are discarded. */
export function normalizeAnalysis(value: unknown): VisionResult {
  const v = record(value);
  const engines = ["onnx_vessel_unet", "heuristic_research_baseline", "ruleset", "external_provider", "none"];
  let engine = (engines.includes(String(v.engine)) ? v.engine : "none") as NonNullable<VisionResult["engine"]>;
  const statuses = ["measured", "quality_blocked", "modality_blocked", "unavailable"];
  let analysisStatus = (statuses.includes(String(v.analysisStatus)) ? v.analysisStatus : "unavailable") as NonNullable<VisionResult["analysisStatus"]>;
  if (v.modalityGateStatus === "blocked") analysisStatus = "modality_blocked";
  else if (v.qualityStatus === "blocked") analysisStatus = "quality_blocked";
  if (analysisStatus === "measured" && !["onnx_vessel_unet", "heuristic_research_baseline"].includes(engine)) analysisStatus = "unavailable";
  if (analysisStatus === "quality_blocked" || analysisStatus === "modality_blocked" || (analysisStatus === "unavailable" && engine !== "external_provider")) engine = "none";
  const unit = v.metricUnit === "percent_0_100" || v.metricUnit === "fraction_0_1" ? v.metricUnit : null;
  const segmented = analysisStatus === "measured" && (engine === "onnx_vessel_unet" || engine === "heuristic_research_baseline");
  const metric = (key: string) => segmented ? normalizePercent(v[key], unit) : null;
  const dimension = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 16_000_000 ? n : null;
  const failureReason = str(v.failureReason);
  const label = analysisStatus === "quality_blocked" ? "Quality blocked" : analysisStatus === "modality_blocked" ? "Modality blocked" : analysisStatus === "unavailable" ? "Analysis unavailable" : "Indeterminate — research measurements";
  const result: VisionResult = {
    schemaVersion: ANALYSIS_SCHEMA, analysisStatus,
    primaryDisease: "indeterminate", riskLevel: "indeterminate", riskScore: null, confidence: null,
    differentials: [], label,
    finding: segmented ? "Vessel segmentation measurements are research proxies. No validated disease classifier is connected." : "Disease classification and segmentation measurements are unavailable for this result.",
    recommendation: "Research use only. Do not use for diagnosis or patient-care decisions.",
    evidence: [], vesselDensity: metric("vesselDensity"), fazRisk: metric("fazRisk"), perfusion: metric("perfusion"),
    qualityScore: normalizePercent(v.qualityScore, unit),
    brightness: normalizePercent(v.brightness, unit), contrast: normalizePercent(v.contrast, unit),
    sharpness: normalizePercent(v.sharpness, unit), artifactScore: normalizePercent(v.artifactScore, unit),
    engine, trainedModelConnected: segmented && engine === "onnx_vessel_unet" && v.trainedModelConnected === true,
    modelVersion: str(v.modelVersion), modelTask: str(v.modelTask), preprocessingVersion: str(v.preprocessingVersion),
    threshold: segmented ? normalizePercent(v.threshold, "fraction_0_1") === null ? null : v.threshold as number : null,
    inputMode: str(v.inputMode) ?? undefined, colorConversion: str(v.colorConversion) ?? undefined,
    modalityGateStatus: str(v.modalityGateStatus) ?? "not_evaluated", modalityGateReason: str(v.modalityGateReason) ?? "Not evaluated",
    qualityStatus: v.qualityStatus === "passed" || v.qualityStatus === "blocked" ? v.qualityStatus : "not_evaluated",
    metricUnit: "percent_0_100", sourceMetricUnit: v.schemaVersion === ANALYSIS_SCHEMA && v.sourceMetricUnit ? v.sourceMetricUnit as MetricUnit : unit,
    requestId: str(v.requestId), fileHash: str(v.fileHash), timestamp: str(v.timestamp),
    mimeType: str(v.mimeType), decodedFormat: str(v.decodedFormat), imageWidth: dimension(v.imageWidth), imageHeight: dimension(v.imageHeight), failureReason,
  };
  if (segmented) result.segmentationEngine = engine as VisionResult["segmentationEngine"];
  for (const key of ["segmentationMaskDataUrl", "previewDataUrl"] as const) {
    const url = v[key];
    if ((key === "previewDataUrl" || segmented) && typeof url === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url) && url.length < 2_000_000) result[key] = url;
  }
  return result;
}

export function normalizeLocalResult(value: unknown): VisionResult {
  const p = record(value), input = record(p.input), quality = record(p.quality), gate = record(p.modality_gate);
  const m = record(p.measurements), s = record(m.segmentation), provenance = record(p.provenance);
  return normalizeAnalysis({
    analysisStatus: p.analysis_status === "available" ? "measured" : p.analysis_status,
    engine: p.engine, metricUnit: p.metric_unit,
    vesselDensity: m.vessel_density, fazRisk: m.faz_risk_proxy, perfusion: m.perfusion_density,
    qualityScore: quality.quality_score, brightness: quality.brightness, contrast: quality.contrast,
    sharpness: quality.sharpness, artifactScore: quality.artifact_score,
    trainedModelConnected: p.trained_model_connected ?? s.trained_model_connected,
    modelVersion: p.model_version, modelTask: p.model_task, preprocessingVersion: p.preprocessing_version, threshold: p.threshold,
    inputMode: input.original_mode, colorConversion: input.grayscale_conversion,
    imageWidth: input.width, imageHeight: input.height, mimeType: input.mime_type, decodedFormat: input.decoded_format,
    modalityGateStatus: gate.status, modalityGateReason: gate.reason, qualityStatus: quality.status,
    failureReason: p.failure_reason ?? quality.failure_reason,
    requestId: p.request_id ?? provenance.request_id, fileHash: provenance.input_sha256,
    timestamp: provenance.timestamp ?? p.timestamp, segmentationMaskDataUrl: m.mask_data_url,
    previewDataUrl: p.preview_data_url ?? input.preview_data_url,
  });
}
