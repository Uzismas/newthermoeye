import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import ts from "typescript";

// Compile production modules in memory so Node does not need a custom TS loader.
const cache = new Map();
const require = createRequire(import.meta.url);
function loadTs(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const compiledModule = { exports: {} }; cache.set(path, compiledModule);
  const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", output)((specifier) => specifier.startsWith(".") ? loadTs(resolve(dirname(path), `${specifier}.ts`)) : require(specifier), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const root = resolve("features/clinical-console");
const { normalizeAnalysis, unavailableAnalysis } = loadTs(resolve(root, "analysis-contract.ts"));
const { createCaseFromClinicalInput, metricsFromAnalysis } = loadTs(resolve(root, "clinical-analysis.ts"));
const { validateUploadedCase, mergeServerCases, canReleaseResearchReport, withTransientPreview } = loadTs(resolve(root, "case-state.ts"));
const makeCase = (id, value, status = "measured") => createCaseFromClinicalInput({
  caseCode: id, age: 68, sex: "F", scanType: "OCTA macula", fileName: "private-file.png", uploadedImageUrl: "data:image/png;base64,YQ==",
  metrics: metricsFromAnalysis(normalizeAnalysis({ analysisStatus: status, engine: "heuristic_research_baseline", metricUnit: "percent_0_100", vesselDensity: value, fazRisk: 38, perfusion: 42, qualityScore: 80 })),
});
const first = makeCase("TE-FIRST", 16);
const second = makeCase("TE-SECOND", 42);
const validation = validateUploadedCase(first);
assert.equal(validation.ok, true, validation.message);
assert.equal(validation.caseRecord.analysisMetrics.vesselDensity, 16);
assert.equal(validation.caseRecord.riskScore, null);
assert.equal(validation.caseRecord.uploadedImageUrl, undefined);
assert.equal(validation.caseRecord.uploadedFileName, undefined);
assert.equal(first.uploadedFileName, "private-file.png", "validation must not mutate caller");
assert.equal(canReleaseResearchReport(validation.caseRecord), true);
for (const state of ["quality_blocked", "modality_blocked", "unavailable"]) {
  const blocked = makeCase(`TE-${state.toUpperCase().replaceAll("_", "-")}`, null, state);
  assert.equal(validateUploadedCase(blocked).ok, true, `${state} nullable case can save`);
  assert.equal(canReleaseResearchReport(blocked), false, `${state} cannot release`);
}
assert.equal(validateUploadedCase(null).ok, false);
assert.equal(validateUploadedCase({}).ok, false);
for (const bad of ["16", Number.NaN, Infinity, -1, 101, undefined]) {
  const c = structuredClone(first); c.analysisMetrics.vesselDensity = bad;
  assert.equal(validateUploadedCase(c).ok, false, `invalid percent ${bad}`);
}
const pending = createCaseFromClinicalInput({ caseCode: "TE-NONE", age: 68, sex: "F", scanType: "OCTA", metrics: metricsFromAnalysis(unavailableAnalysis()) });
assert.equal(validateUploadedCase(pending).ok, true, "nullable unavailable case accepted");
const staleFirst = makeCase("TE-FIRST", 88);
assert.deepEqual(mergeServerCases([second, first], [staleFirst], true).map((item) => item.analysisMetrics.vesselDensity), [42, 16], "delayed snapshot cannot replace successful upload");
assert.equal(mergeServerCases([first], [second], false)[0].id, "TE-SECOND");
const preview = withTransientPreview(validation.caseRecord, first);
assert.equal(preview.uploadedFileName, first.uploadedFileName);
assert.equal(preview.analysisMetrics.vesselDensity, 16);
console.log("State regression passed: strict nullable validation, transient preview, unavailable release gates, and delayed snapshot protection.");
