import assert from "node:assert/strict";
import { normalizePercent, normalizeLocalResult, normalizeAnalysis, unavailableAnalysis } from "../features/clinical-console/analysis-contract.ts";
import { createCaseFromClinicalInput, metricsFromAnalysis, normalizeCaseRecord, getCaseClassification } from "../features/clinical-console/clinical-analysis.ts";
import { estimateAlzheimerRisk } from "../features/clinical-console/alzheimer-risk.ts";
import { detectImageMime, mimeMatches, NON_OCT_FILENAME } from "../features/clinical-console/image-input.ts";

assert.equal(normalizePercent(0.16, "fraction_0_1"), 16);
assert.equal(normalizePercent(0.16, "percent_0_100"), 0.16);
for (const v of [null, undefined, "16", NaN, Infinity, -1, 101]) assert.equal(normalizePercent(v, "percent_0_100"), null);
assert.equal(normalizePercent(16, undefined), null);
assert.equal(normalizePercent(16, "fraction_0_1"), null);
const payload = {
  analysis_status: "measured", engine: "onnx_vessel_unet", metric_unit: "fraction_0_1",
  trained_model_connected: true, model_version: "test-model", model_task: "vessel_segmentation", preprocessing_version: "test-preprocessing", threshold: 0.5,
  classification: { label: "alzheimer_risk", risk_score: 0.9, confidence: 0.99, differentials: [{ kind: "glaucoma" }] },
  input: { width: 128, height: 256, original_mode: "RGB", grayscale_conversion: "luma", decoded_format: "PNG" },
  quality: { quality_score: 0.82, status: "passed" }, modality_gate: { status: "passed_with_color_warning", reason: "color overlay" },
  measurements: { vessel_density: 0.16, faz_risk_proxy: 0.38, perfusion_density: null },
  provenance: { request_id: "test-request", input_sha256: "a".repeat(64), timestamp: "2026-09-19T00:00:00Z" },
};
const normalized = normalizeLocalResult(payload);
assert.equal(normalized.vesselDensity, 16);
assert.equal(normalized.fazRisk, 38);
assert.equal(normalized.perfusion, null);
assert.equal(normalized.qualityScore, 82);
assert.equal(normalized.trainedModelConnected, true);
assert.equal(normalized.modalityGateStatus, "passed_with_color_warning");
assert.deepEqual(normalizeAnalysis(normalized), normalized, "normalization must be idempotent");
const c = createCaseFromClinicalInput({ age: 68, sex: "F", caseCode: "TE-CONTRACT-1", scanType: "OCTA", metrics: metricsFromAnalysis(normalized) });
assert.equal(c.analysisMetrics.vesselDensity, 16);
assert.equal(c.analysisMetrics.fazRiskProxy, 38);
assert.equal(c.analysisMetrics.perfusionDensityProxy, null);
assert.equal(c.confidence, null);
assert.equal(c.riskScore, null);
assert.equal(c.riskLevel, "indeterminate");
assert.deepEqual(getCaseClassification(c).differentials, []);
for (const status of ["quality_blocked", "modality_blocked", "unavailable"]) {
  const blocked = normalizeLocalResult({ ...payload, analysis_status: status, engine: "none" });
  assert.equal(blocked.vesselDensity, null);
  assert.equal(blocked.primaryDisease, "indeterminate");
  assert.equal(blocked.confidence, null);
  assert.equal(blocked.riskScore, null);
  assert.deepEqual(blocked.differentials, []);
}
const heuristic = normalizeLocalResult({ ...payload, engine: "heuristic_research_baseline", trained_model_connected: false });
assert.equal(heuristic.segmentationEngine, "heuristic_research_baseline");
assert.equal(heuristic.trainedModelConnected, false);
const external = normalizeAnalysis({ ...normalized, engine: "external_provider", finding: "High confidence Alzheimer diagnosis", riskScore: 90, confidence: 99 });
assert.equal(external.vesselDensity, null);
assert.equal(external.confidence, null);
assert.equal(external.finding.includes("diagnosis"), false);
assert.equal(unavailableAnalysis().vesselDensity, null);
const migrated = normalizeCaseRecord({ ...c, analysisMetrics: { vesselDensity: 0.16 }, clinicalClassification: { kind: "alzheimer_risk" }, confidence: "Confidence 88%" });
assert.equal(migrated.analysisMetrics.vesselDensity, null);
assert.equal(migrated.confidence, null);
assert.equal(migrated.clinicalClassification.kind, "indeterminate");
assert.equal(detectImageMime(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])), "image/png");
assert.equal(detectImageMime(new Uint8Array(20)), null);
assert.equal(mimeMatches("application/octet-stream", "image/tiff"), true);
assert.equal(mimeMatches("image/jpeg", "image/png"), false);
assert.equal(NON_OCT_FILENAME.test("surface-octa.png"), false);
assert.equal(NON_OCT_FILENAME.test("face-photo.png"), true);
// FAZ area and the literature-based Alzheimer FAZ index pass through; the disease classifier stays indeterminate.
const fazPayload = { ...payload, measurements: { ...payload.measurements, faz_area_mm2: 0.424, alzheimer_faz_index: 0.658, alzheimer_faz_z: 1.49 } };
const withFaz = normalizeLocalResult(fazPayload);
assert.equal(withFaz.fazAreaMm2, 0.424);
assert.equal(withFaz.alzheimerFazIndex, 0.658);
assert.equal(withFaz.riskScore, null);
assert.deepEqual(normalizeAnalysis(withFaz), withFaz, "FAZ normalization must be idempotent");
assert.equal(normalizeLocalResult({ ...fazPayload, measurements: { ...fazPayload.measurements, faz_area_mm2: null } }).alzheimerFazIndex, null, "index without FAZ is dropped");
assert.equal(normalizeLocalResult({ ...fazPayload, measurements: { ...fazPayload.measurements, alzheimer_faz_index: 7 } }).alzheimerFazIndex, null, "out-of-range index is dropped");
assert.equal(normalizeLocalResult({ ...fazPayload, analysis_status: "quality_blocked", engine: "none" }).alzheimerFazIndex, undefined, "blocked results carry no index");
// FAZ outline: digits-only SVG path, kept only next to a measured FAZ.
const outline = "M350 250 L450 250 L650 450 L350 450 Z";
const withOutline = (path, extra = {}) => normalizeLocalResult({ ...fazPayload, measurements: { ...fazPayload.measurements, faz_outline_path: path, ...extra } }).fazOutlinePath;
assert.equal(withOutline(outline), outline);
for (const bad of ["M1 1 Z", "M1 1 L2 2 Z\"/><script>", "<svg/>", 7, "M1 1 L2 2 L3 3 Z".repeat(4000)]) assert.equal(withOutline(bad), null, "invalid outline is dropped");
assert.equal(withOutline(outline, { faz_area_mm2: null }), null, "outline without FAZ is dropped");
assert.deepEqual(normalizeAnalysis(normalizeLocalResult({ ...fazPayload, measurements: { ...fazPayload.measurements, faz_outline_path: outline } })).fazOutlinePath, outline, "outline survives re-normalization");
// Alzheimer risk estimate: age baseline x FAZ likelihood ratio.
const neutral = estimateAlzheimerRisk(70, 0.27);
assert.ok(Math.abs(neutral.likelihoodRatio - 1) < 1e-9 && Math.abs(neutral.risk - 0.05) < 1e-9, "z = SMD/2 gives LR 1, risk = age baseline");
assert.equal(estimateAlzheimerRisk(59, 1), null, "under 60 has no published baseline");
assert.equal(estimateAlzheimerRisk(64, 1).ageGroup, "60–64");
assert.equal(estimateAlzheimerRisk(64, 1).baseline, 0.0023);
assert.equal(estimateAlzheimerRisk(65, 1).ageGroup, "65–74", "65 starts the next group");
assert.equal(estimateAlzheimerRisk(70, null), null, "no FAZ, no estimate");
assert.equal(estimateAlzheimerRisk(90, 1).baseline, 0.333);
assert.equal(estimateAlzheimerRisk(80, 1).baseline, 0.131);
assert.ok(estimateAlzheimerRisk(70, 2).risk > estimateAlzheimerRisk(70, 0).risk, "bigger FAZ, higher risk");
assert.ok(estimateAlzheimerRisk(80, 0).risk > estimateAlzheimerRisk(70, 0).risk, "older, higher risk");
assert.equal(estimateAlzheimerRisk(70, 99).risk, estimateAlzheimerRisk(70, 3).risk, "z is clipped to +/-3");
assert.ok(Math.abs(estimateAlzheimerRisk(68, 1.47).risk - 0.0915) < 0.001, "test_08 example");
console.log("Analysis contract regression passed: units, nulls, provenance, gates, legacy migration, medical safety, signatures.");
