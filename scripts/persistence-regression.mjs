import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const storage = mkdtempSync(join(tmpdir(), "thermoeye-phase3-"));
process.env.THERMOEYE_DEMO_STORAGE_DIR = storage;
process.env.THERMOEYE_APPROVED_DEMO_CASE_IDS = "TE-P3-APPROVED,TE-P3-FAILURE";
process.env.THERMOEYE_ANALYSIS_SIGNING_KEY = "phase3-test-signing-key-012345678901234567890123";

const { normalizeAnalysis } = await import("../features/clinical-console/analysis-contract.ts");
const { createCaseFromClinicalInput, metricsFromAnalysis } = await import("../features/clinical-console/clinical-analysis.ts");
const { signAnalysis } = await import("../features/clinical-console/server/analysis-receipt.ts");
const persistence = await import("../features/clinical-console/server/persistence.ts");

const source = Buffer.from("source bytes retained exactly");
const sourceHash = createHash("sha256").update(source).digest("hex");
const mask = Buffer.from("mask bytes retained exactly");
const analysis = normalizeAnalysis({
  analysisStatus: "measured", engine: "heuristic_research_baseline", metricUnit: "percent_0_100",
  vesselDensity: 16, fazRisk: 38, perfusion: null, qualityScore: 80,
  qualityStatus: "passed", modalityGateStatus: "passed", fileHash: sourceHash,
  modelVersion: "phase3-test", modelTask: "vessel_segmentation", preprocessingVersion: "phase3-test",
});
const caseRecord = createCaseFromClinicalInput({ age: 68, caseCode: "TE-P3-APPROVED", scanType: "OCTA macula", sex: "F", metrics: metricsFromAnalysis(analysis) });
caseRecord.analysisReceipt = signAnalysis(analysis);

const first = persistence.persistApprovedCase({ caseRecord, source, sourceMime: "image/png", mask, maskMime: "image/png", auditEvents: [], existing: null });
assert.equal(first.source.sha256, sourceHash, "source hash is recorded");
assert.deepEqual(persistence.getPrivateAsset("TE-P3-APPROVED", "source").bytes, source, "source bytes are exact");
assert.deepEqual(persistence.getPrivateAsset("TE-P3-APPROVED", "mask").bytes, mask, "mask bytes are exact");
assert.equal(persistence.persistApprovedCase({ caseRecord, source, sourceMime: "image/png", mask, existing: persistence.getDurableSnapshot(), auditEvents: [], }).caseRecord.id, caseRecord.id, "adapter can update an approved record");
assert.equal(persistence.loadDurableState().cases[0].analysisMetrics.visionResult.vesselDensity, 16, "measurements survive reload");

// Simulate a fresh service module by clearing the adapter's process cache.
globalThis.thermoeyeDurableSnapshot = undefined;
const restarted = persistence.loadDurableState();
assert.deepEqual(restarted.durableCaseIds, ["TE-P3-APPROVED"], "approved case survives restart");
assert.equal(restarted.reviews["TE-P3-APPROVED"], undefined, "review is absent until explicitly recorded");

const snapshotPath = join(storage, "cases.json");
const originalSnapshot = readFileSync(snapshotPath, "utf8");
const tampered = JSON.parse(originalSnapshot);
tampered.records["TE-P3-APPROVED"].caseRecord.analysisMetrics.visionResult.vesselDensity = 99;
writeFileSync(snapshotPath, JSON.stringify(tampered));
globalThis.thermoeyeDurableSnapshot = undefined;
assert.equal(persistence.loadDurableState().durableCaseIds.length, 0, "stale integrity binding quarantines changed measurements");
writeFileSync(snapshotPath, originalSnapshot);
globalThis.thermoeyeDurableSnapshot = undefined;

const sourcePath = join(storage, "assets", "TE-P3-APPROVED", "source.bin");
const originalSource = readFileSync(sourcePath);
writeFileSync(sourcePath, Buffer.from("corrupt"));
globalThis.thermoeyeDurableSnapshot = undefined;
assert.equal(persistence.loadDurableState().durableCaseIds.length, 0, "corrupt assets are quarantined");
writeFileSync(sourcePath, originalSource);
assert.equal(persistence.getPrivateAsset("../TE-P3-APPROVED", "source").ok, false, "traversal cannot address private assets");

process.env.THERMOEYE_TEST_STORAGE_WRITE_FAILURE = "1";
const failedId = { ...caseRecord, id: "TE-P3-FAILURE" };
assert.throws(() => persistence.persistApprovedCase({ caseRecord: failedId, source, sourceMime: "image/png", mask, existing: persistence.getDurableSnapshot(), auditEvents: [] }), /storage failure/i, "write failure is surfaced");
delete process.env.THERMOEYE_TEST_STORAGE_WRITE_FAILURE;
assert.equal(persistence.getDurableSnapshot().records["TE-P3-FAILURE"], undefined, "write failure does not create a partial record");

assert.throws(() => persistence.persistApprovedCase({ caseRecord: { ...caseRecord, id: "TE-P3-NOT-APPROVED" }, source, sourceMime: "image/png", mask, existing: persistence.getDurableSnapshot(), auditEvents: [] }), /approved demo allowlist/i, "ordinary cases remain transient");
rmSync(storage, { recursive: true, force: true });
console.log("Persistence regression passed: exact source/mask, restart recovery, duplicate-safe update, stale/corrupt quarantine, write failure, traversal rejection, and approved-demo allowlist.");
