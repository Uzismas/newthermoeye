// Regression coverage for the shared clinical-console display formatters.
// Node 24's type stripping lets this stay close to the production TypeScript.
const { formatConfidence, formatPercent, formatRiskScore } = await import("../features/clinical-console/clinical-analysis.ts");

const measuredCase = {
  riskLevel: "high",
  riskScore: 16,
  analysisMetrics: {},
  clinicalClassification: {},
};

assert(formatRiskScore(measuredCase) === "16%", "risk score 16 must render as 16%, not 0.16");
assert(formatRiskScore({ riskLevel: "blocked", riskScore: 16 }) === "N/A", "blocked risk must be unavailable");
assert(formatRiskScore({ riskLevel: "indeterminate", riskScore: 16 }) === "N/A", "indeterminate risk must be unavailable");
assert(formatRiskScore({ riskLevel: "high", riskScore: 16 }) === "N/A", "legacy cases without analysis must be unavailable");
assert(formatPercent(undefined) === "N/A", "missing metrics must render N/A");
assert(formatConfidence("Confidence unavailable") === "N/A", "unavailable confidence must render N/A");
assert(formatConfidence("Confidence 84%") === "N/A", "legacy confidence cannot be treated as calibrated evidence");
assert(formatPercent(null) === "N/A", "null must not become zero");
assert(formatPercent(0.16) === "0.16%", "canonical 0.16 percent must not be guessed to be a fraction");
assert(formatPercent(101) === "N/A", "out-of-range values must not be clamped");

console.log("Clinical formatter regression passed");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
