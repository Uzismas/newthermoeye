import type { CaseRecord } from "./types";

export function isSyntheticCase(caseRecord: CaseRecord) {
  return caseRecord.id.startsWith("TE-REF-") || caseRecord.context.toLowerCase().includes("synthetic");
}

export function hasUsableMeasurements(caseRecord: CaseRecord) {
  const result = caseRecord.analysisMetrics?.visionResult;
  return result?.analysisStatus === "measured";
}

export function analysisProvenance(caseRecord: CaseRecord): Array<[string, string]> {
  const result = caseRecord.analysisMetrics?.visionResult;
  return [
    ["Data source", isSyntheticCase(caseRecord) ? "Synthetic demonstration / research only" : "Uploaded image / research only"],
    ["Analysis status", result?.analysisStatus ?? "Unavailable"],
    ["Engine", result?.engine ?? (isSyntheticCase(caseRecord) ? "ruleset (synthetic fixture)" : "none")],
    ["Model version", result?.modelVersion ?? "N/A"],
    ["Model task", result?.modelTask ?? "N/A"],
    ["Trained segmentation connected", result?.trainedModelConnected === true ? "Yes (vessel segmentation only)" : "No"],
    ["Disease classifier", "Unavailable"],
    ["Preprocessing version", result?.preprocessingVersion ?? "N/A"],
    ["Input mode", result?.inputMode ?? "N/A"],
    ["Input dimensions", result?.imageWidth && result?.imageHeight ? `${result.imageWidth} x ${result.imageHeight}` : "N/A"],
    ["Color conversion", result?.colorConversion ?? "N/A"],
    ["Segmentation threshold", result?.threshold == null ? "N/A" : String(result.threshold)],
    ["Metric unit", result?.metricUnit ?? "percent_0_100"],
    ["Quality gate", result?.qualityStatus ?? "Not evaluated"],
    ["Modality gate", result?.modalityGateStatus ?? "Not evaluated"],
    ["Modality reason", result?.modalityGateReason ?? "N/A"],
    ["Failure reason", result?.failureReason ?? "N/A"],
    ["Request ID", result?.requestId ?? "N/A"],
    ["File SHA-256", result?.fileHash ?? "N/A"],
    ["Analysis timestamp", result?.timestamp ?? "N/A"],
  ];
}
