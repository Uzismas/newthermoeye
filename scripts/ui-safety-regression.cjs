/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader compiles production TSX in memory for SSR regression checks. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Compile production components in memory so assertions exercise rendered output.
for (const ext of [".ts", ".tsx"]) {
  require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}
const base = "../features/clinical-console/";
const { normalizeAnalysis } = require(base + "analysis-contract.ts");
const { metricsFromAnalysis, normalizeCaseRecord } = require(base + "clinical-analysis.ts");
const { AnalysisView } = require(base + "components/analysis-view.tsx");
const { ReportView } = require(base + "components/report-view.tsx");
const { DashboardView } = require(base + "components/dashboard-view.tsx");
const { InsightsView } = require(base + "components/insights-view.tsx");
const { PerformanceView } = require(base + "components/performance-view.tsx");
const { GovernanceView } = require(base + "components/governance-view.tsx");
const { buildReportPdf } = require(base + "server/report-pdf.ts");
const { buildInsightsPdf } = require(base + "server/insights-pdf.ts");
const { cases } = require(base + "mock-data.ts");
const review = { decision: "Approved for release", note: "Research review only", reviewer: "Test reviewer", followUpWindow: "Routine", updatedAt: "2026-09-19" };
const mask = "data:image/png;base64,iVBORw0KGgo=";
const result = normalizeAnalysis({
  analysisStatus: "measured", engine: "heuristic_research_baseline", metricUnit: "percent_0_100",
  vesselDensity: 16, fazRisk: 0.16, perfusion: null, qualityScore: 85,
  primaryDisease: "alzheimer_risk", riskScore: 92, confidence: 88,
  modelVersion: "baseline-1", modelTask: "vessel_segmentation", preprocessingVersion: "prep-2", threshold: 0.5,
  inputMode: "RGB", colorConversion: "luminance", qualityStatus: "passed", modalityGateStatus: "passed",
  imageWidth: 256, imageHeight: 256, segmentationMaskDataUrl: mask,
});
const measured = normalizeCaseRecord({ id: "TE-TEST-1", age: 60, sex: "F", scanType: "OCTA", eye: "OD", riskLevel: "high", riskScore: 92, confidence: 88, context: "Test upload", density: "High risk", heatmap: "Risk region", qualityLabel: "N/A", status: "Review pending", note: "old diagnosis", uploadedImageUrl: "data:image/png;base64,AAAA", analysisMetrics: metricsFromAnalysis(result) });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const analysis = render(AnalysisView, { selectedCase: measured });
const report = render(ReportView, { selectedCase: measured, selectedReview: review, isDownloading: false, onBack() {}, onDownload() {} });
for (const html of [analysis, report]) {
  assert.match(html, /16%/);
  assert.match(html, /0\.16%/);
  assert.match(html, /N\/A/);
  assert.match(html, /Central non-vessel fraction/);
  assert.doesNotMatch(html, /arc-gauge|risk-meter|scan-hotspot|scan-density|Confidence 88|92%/);
  assert.match(html, /baseline-1/);
  assert.match(html, /prep-2/);
  assert.match(html, /data:image\/png;base64,iVBORw0KGgo=/);
}
for (const status of ["quality_blocked", "modality_blocked", "unavailable"]) {
  const blocked = normalizeCaseRecord({ ...measured, analysisMetrics: metricsFromAnalysis(normalizeAnalysis({ ...result, analysisStatus: status })) });
  for (const html of [render(AnalysisView, { selectedCase: blocked }), render(ReportView, { selectedCase: blocked, selectedReview: review, isDownloading: false, onBack() {}, onDownload() {} })]) {
    assert.doesNotMatch(html, /16%|scan-hotspot|arc-gauge|iVBORw0KGgo=/);
    assert.match(html, /N\/A/);
  }
}
const dashboard = render(DashboardView, { cases: [measured], reviews: {}, selectedCase: measured, selectedReview: review, reviewer: "Test", onCaseSelect() {}, onNavigate() {}, onReviewSubmit() {}, onPreviewReport() {} });
assert.doesNotMatch(dashboard, /risk-meter|1,248|High Risk|Confidence 88|92%/);
assert.match(dashboard, /Measured cases<\/span><strong>1<\/strong>/);
for (const html of [render(InsightsView, {}), render(PerformanceView, {}), render(GovernanceView, { auditEvents: [] })]) {
  assert.match(html, /N\/A/);
  assert.doesNotMatch(html, /28,541|0\.82|0\.47|0\.85|3,214|11\.3%/);
}
for (const fixture of cases) {
  assert.equal(fixture.riskScore, null);
  assert.equal(fixture.confidence, null);
  assert.equal(fixture.riskLevel, "indeterminate");
  assert.equal(fixture.analysisMetrics.vesselDensity, null);
  assert.match(fixture.context, /synthetic/i);
  assert.doesNotMatch(fixture.qualityLabel, /Pass 9|Fail 42/);
}
const longReview = { ...review, note: "Long research note. ".repeat(400) + "PAGINATION_END_MARKER" };
const generated = buildReportPdf({ caseRecord: measured, classification: { kind: "alzheimer_risk", finding: "FORGED_DIAGNOSIS" }, review: longReview });
const insight = buildInsightsPdf({ caseRecord: measured });
for (const bytes of [generated.bytes, insight.bytes]) {
  const pdf = Buffer.from(bytes).toString("utf8");
  assert.match(pdf, /Disease risk: N\/A/);
  assert.match(pdf, /Vessel density proxy: 16%/);
  assert.match(pdf, /Central non-vessel fraction \\\(research proxy\\\): 0\.16%/);
  assert.match(pdf, /baseline-1/);
  assert.doesNotMatch(pdf, /FORGED_DIAGNOSIS|28,541|11\.3%|Threshold: 2026\.05/);
}
assert.match(Buffer.from(generated.bytes).toString("utf8"), /PAGINATION_END_MARKER/);
if (process.argv.includes("--artifacts")) {
  const dir = path.resolve("tmp/pdfs");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "research-report-qa.pdf"), generated.bytes);
  fs.writeFileSync(path.join(dir, "research-insights-qa.pdf"), insight.bytes);
}
console.log("UI safety regression passed: rendered measured/blocked/unavailable states, synthetic fixtures, canonical units, provenance, and paginated PDFs.");
