import { formatPercent, getCaseClassification } from "../clinical-analysis";
import { analysisProvenance, hasUsableMeasurements } from "../analysis-presentation";
import { SUMMARY_AGE, testScanSummary } from "../model-evaluation";
import type { CaseRecord } from "../types";
import { createResearchPdf, parseJpegDataUrl } from "./research-pdf";

export function buildInsightsPdf({ caseRecord, imageDataUrl }: { caseRecord: CaseRecord; imageDataUrl?: string }) {
  const classification = getCaseClassification(caseRecord);
  const metrics = caseRecord.analysisMetrics;
  const measured = hasUsableMeasurements(caseRecord);
  const reportNumber = `TE-INS-${caseRecord.id.replace(/[^A-Z0-9-]/gi, "")}`;
  const t = testScanSummary();
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const lines = [
    `Report number: ${reportNumber}`,
    `Generated: ${new Date().toISOString()}`,
    "Scope: selected case research measurements; no population aggregate source",
    "Disease classification: Indeterminate",
    "Disease risk: N/A",
    "Disease confidence: N/A",
    "",
    "Selected scan",
    `Case: ${caseRecord.id}`,
    `Scan: ${caseRecord.scanType} / ${caseRecord.eye}`,
    `Patient context: ${caseRecord.context}`,
    `Uploaded file: ${caseRecord.uploadedFileName ?? "N/A"}`,
    `Image quality: ${formatPercent(metrics?.qualityScore)}`,
    `Vessel density proxy: ${formatPercent(measured ? metrics?.vesselDensity : null)}`,
    `Central non-vessel fraction (research proxy): ${formatPercent(measured ? metrics?.fazRiskProxy : null)}`,
    `Perfusion density proxy: ${formatPercent(measured ? metrics?.perfusionDensityProxy : null)}`,
    "",
    `Real test scans (${t.scans.length} ROSE-O test images, age ${SUMMARY_AGE} assumed; literature-based, not validated)`,
    `Alzheimer FAZ index bands: Low ${t.bands.low} / Moderate ${t.bands.moderate} / High ${t.bands.high}`,
    `Average estimated Alzheimer risk: ${pct(t.meanRisk)} (age ${t.ageGroup} population average ${pct(t.baseline)})`,
    `Mean FAZ area: ${t.meanFaz.toFixed(3)} mm2 (published control average 0.275 mm2)`,
    ...t.scans.map((s) => `test_${s.id}: FAZ ${s.faz.toFixed(3)} mm2, estimated risk ${pct(s.risk)}`),
    "Hospital comparison: N/A (single public dataset)",
    "",
    "Research interpretation",
    classification.finding,
    classification.recommendation,
    "",
    "Analysis provenance",
    ...analysisProvenance(caseRecord).map(([key, value]) => `${key}: ${value}`),
    "",
    "Research only. Synthetic fixtures have no patient disease ground truth.",
    "De-identification and consent are not independently verified by this report.",
  ];
  return { bytes: createResearchPdf("Thermoeye Research Insights Report", lines, parseJpegDataUrl(imageDataUrl)), fileName: `${reportNumber}.pdf`, reportNumber };
}
