import { formatPercent, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { analysisProvenance, hasUsableMeasurements } from "../analysis-presentation";
import type { CaseRecord, ClinicalClassification, ReviewRecord } from "../types";
import { createResearchPdf } from "./research-pdf";

export function buildReportPdf({ caseRecord, review }: {
  caseRecord: CaseRecord; classification: ClinicalClassification; review: ReviewRecord;
}) {
  const classification = getCaseClassification(caseRecord);
  const metrics = caseRecord.analysisMetrics;
  const measured = hasUsableMeasurements(caseRecord);
  const reportNumber = `TE-RPT-${caseRecord.id.replace(/[^A-Z0-9-]/gi, "")}`;
  const lines = [
    `Report number: ${reportNumber}`,
    "Purpose: research image measurements only; not a disease diagnosis",
    "Disease classification: Indeterminate",
    "Disease risk: N/A",
    "Disease confidence: N/A",
    `Acquisition status: ${getClinicalResultLabel(classification.kind)}`,
    `Review status: ${review.decision}`,
    "Reviewer approval does not establish clinical validity.",
    `Case: ${caseRecord.id}`,
    `Patient context: ${caseRecord.context}`,
    `Scan: ${caseRecord.scanType} / ${caseRecord.eye} / ${caseRecord.qualityLabel}`,
    `Image quality: ${formatPercent(metrics?.qualityScore)}`,
    `Vessel density proxy: ${formatPercent(measured ? metrics?.vesselDensity : null)}`,
    `Central non-vessel fraction (research proxy): ${formatPercent(measured ? metrics?.fazRiskProxy : null)}`,
    `Perfusion density proxy: ${formatPercent(measured ? metrics?.perfusionDensityProxy : null)}`,
    "",
    "Research interpretation",
    classification.finding,
    classification.recommendation,
    ...classification.evidence,
    "",
    "Analysis provenance",
    ...analysisProvenance(caseRecord).map(([key, value]) => `${key}: ${value}`),
    "",
    "Review record",
    `Reviewer: ${review.reviewer}`,
    `Follow-up: ${review.followUpWindow}`,
    `Updated: ${review.updatedAt}`,
    `Reviewer note (user entered): ${review.note}`,
    "",
    "De-identification and consent are not independently verified by this report.",
    "Synthetic fixtures have no patient disease ground truth.",
  ];
  return { bytes: createResearchPdf("Eyezheimer Research Measurement Report", lines), fileName: `${reportNumber}.pdf`, reportNumber };
}
