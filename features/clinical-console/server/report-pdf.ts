import { clinicalModelVersion, getClinicalResultLabel } from "../clinical-analysis";
import type { CaseRecord, ClinicalClassification, ReviewRecord } from "../types";

const encoder = new TextEncoder();

export function buildReportPdf({
  caseRecord,
  classification,
  review,
}: {
  caseRecord: CaseRecord;
  classification: ClinicalClassification;
  review: ReviewRecord;
}) {
  const reportNumber = `TE-RPT-${caseRecord.id.replace(/\D/g, "") || caseRecord.id.replace(/[^A-Z0-9]/g, "")}`;
  const releaseStatus = review.decision === "Approved for release" ? "Approved mock release" : "Draft mock - not clinically released";
  const lines = [
    "Thermoeye Clinical Screening Report",
    `Report number: ${reportNumber}`,
    `Release status: ${releaseStatus}`,
    `Case: ${caseRecord.id}`,
    `Patient context: ${caseRecord.context}`,
    `Scan: ${caseRecord.scanType} / ${caseRecord.eye} / ${caseRecord.qualityLabel}`,
    `Screening result: ${getClinicalResultLabel(classification.kind)} ${classification.kind === "quality_blocked" ? "" : `${classification.riskScore}%`}`.trim(),
    `AI confidence: ${caseRecord.confidence.replace("Confidence ", "")}`,
    `Doctor review: ${review.decision}`,
    `Reviewer: ${review.reviewer}`,
    `Follow-up: ${review.followUpWindow}`,
    `Updated: ${review.updatedAt}`,
    "",
    "Screening interpretation",
    classification.finding,
    "",
    "Clinical recommendation",
    classification.recommendation,
    "",
    "Doctor note",
    review.note,
    "",
    "Release controls",
    `Model: ${clinicalModelVersion}`,
    "Threshold: 2026.05",
    "Purpose: screening support only",
    "Raw identifiers: de-identified before analysis",
    "Report wording: locked to multi-disease screening support language",
  ];

  return {
    bytes: createSimplePdf(lines),
    fileName: `${reportNumber}.pdf`,
    reportNumber,
  };
}

function createSimplePdf(lines: string[]) {
  const objects: string[] = [];
  const pageContent = buildPageContent(wrapLines(lines, 92));

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(`<< /Length ${byteLength(pageContent)} >>\nstream\n${pageContent}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

function buildPageContent(lines: string[]) {
  const commands = ["BT", "/F2 18 Tf", "72 736 Td", "(Thermoeye Clinical Screening Report) Tj"];
  let y = 0;

  for (const line of lines.slice(1, 42)) {
    const isHeading = line !== "" && !line.includes(":") && line.length < 40;
    const font = isHeading ? "/F2 11 Tf" : "/F1 10 Tf";
    y -= line === "" ? 13 : isHeading ? 18 : 14;
    commands.push(font, `0 ${y} Td`, `(${escapePdfText(line)}) Tj`);
    y = 0;
  }

  commands.push("ET");
  return commands.join("\n");
}

function wrapLines(lines: string[], maxLength: number) {
  return lines.flatMap((line) => {
    if (line.length <= maxLength) return [line];

    const wrapped: string[] = [];
    let current = "";
    for (const word of line.split(" ")) {
      if (`${current} ${word}`.trim().length > maxLength) {
        wrapped.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) wrapped.push(current);
    return wrapped;
  });
}

function escapePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return encoder.encode(value).length;
}
