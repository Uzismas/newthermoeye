import { createHash, createHmac } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { normalizeCaseRecord } from "../clinical-analysis";
import type { AuditEvent, CaseActionState, CaseRecord, ReviewRecord } from "../types";
import { getAnalysisSigningSecret, verifyAnalysis } from "./analysis-receipt";

const STORAGE_SCHEMA = "octa-analysis-v3-local-private" as const;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_MASK_BYTES = 2 * 1024 * 1024;
const globals = globalThis as typeof globalThis & {
  thermoeyeTransientAssets?: Map<string, TransientAsset>;
  thermoeyeDurableSnapshot?: PersistedSnapshot | null;
};

type TransientAsset = { source: Buffer; sourceMime: string; mask?: Buffer; maskMime?: string; expiresAt: number };
export type DurableRecord = {
  caseRecord: CaseRecord;
  review?: ReviewRecord;
  actionState?: CaseActionState;
  source: { sha256: string; mime: string; bytes: number };
  mask?: { sha256: string; mime: string; bytes: number };
  binding: string;
  updatedAt: string;
};
export type PersistedSnapshot = { schemaVersion: typeof STORAGE_SCHEMA; updatedAt: string; auditEvents: AuditEvent[]; records: Record<string, DurableRecord> };
export type RestoredDurableState = {
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  actionStates: Record<string, CaseActionState>;
  durableCaseIds: string[];
  auditEvents: AuditEvent[];
};

export class PersistenceError extends Error {
  readonly code: "STORAGE_WRITE_FAILED" | "ASSET_MISSING" | "ASSET_CORRUPT" | "APPROVAL_REQUIRED" | "ASSET_REQUIRED";
  constructor(code: PersistenceError["code"], message: string) { super(message); this.name = "PersistenceError"; this.code = code; }
}

function storageRoot() { return resolve(process.env.THERMOEYE_DEMO_STORAGE_DIR?.trim() || join(process.cwd(), ".thermoeye-private")); }
function snapshotPath() { return join(storageRoot(), "cases.json"); }
function backupPath() { return join(storageRoot(), "cases.json.bak"); }
function assetDir(caseId: string) { return join(storageRoot(), "assets", caseId); }
function backupAssetDir(caseId: string) { return join(storageRoot(), "backup-assets", caseId); }
function assetPath(caseId: string, asset: "source" | "mask") { return join(assetDir(caseId), `${asset}.bin`); }

export function isApprovedDemoCase(caseId: string) {
  return (process.env.THERMOEYE_APPROVED_DEMO_CASE_IDS ?? "").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean).includes(caseId.toUpperCase());
}
export function isDurableStorageConfigured() { return Boolean(process.env.THERMOEYE_DEMO_STORAGE_DIR?.trim()); }

export function rememberTransientAsset(input: { fileHash?: string | null; source: Buffer; sourceMime: string; maskDataUrl?: string }) {
  if (!input.fileHash || !/^[a-f0-9]{64}$/.test(input.fileHash) || input.source.length === 0 || input.source.length > MAX_ASSET_BYTES) return;
  const mask = input.maskDataUrl ? decodeDataUrl(input.maskDataUrl, MAX_MASK_BYTES) : null;
  const map = globals.thermoeyeTransientAssets ??= new Map<string, TransientAsset>();
  map.set(input.fileHash, { source: Buffer.from(input.source), sourceMime: input.sourceMime, mask: mask?.bytes, maskMime: mask?.mime, expiresAt: Date.now() + 15 * 60 * 1000 });
}
export function takeTransientAsset(fileHash: string | null | undefined) {
  if (!fileHash) return undefined;
  const map = globals.thermoeyeTransientAssets;
  if (!map) return undefined;
  const value = map.get(fileHash);
  if (!value) return undefined;
  map.delete(fileHash);
  return value.expiresAt > Date.now() ? value : undefined;
}

export function getDurableSnapshot() { return readSnapshotWithRecovery().snapshot; }
export function loadDurableState(): RestoredDurableState {
  if (globals.thermoeyeDurableSnapshot !== undefined) return materialize(globals.thermoeyeDurableSnapshot);
  const loaded = readSnapshotWithRecovery();
  globals.thermoeyeDurableSnapshot = loaded.snapshot;
  return materialize(loaded.snapshot, loaded.recovered);
}

function materialize(snapshot: PersistedSnapshot | null, recovered = false): RestoredDurableState {
  if (!snapshot) return { cases: [], reviews: {}, actionStates: {}, durableCaseIds: [], auditEvents: recovered ? [{ time: new Date().toISOString(), message: "Durable demo storage was recovered with no usable snapshot." }] : [] };
  const cases: CaseRecord[] = [], durableCaseIds: string[] = [], recoveryEvents: AuditEvent[] = [];
  const reviews: Record<string, ReviewRecord> = {}, actionStates: Record<string, CaseActionState> = {};
  for (const [caseId, record] of Object.entries(snapshot.records)) {
    if (!isSafeCaseId(caseId) || !isApprovedDemoCase(caseId) || record?.caseRecord?.id !== caseId || !isRecordUsable(record)) {
      recoveryEvents.push({ time: new Date().toISOString(), message: `Durable demo case ${caseId} was quarantined after an integrity check failed.` });
      continue;
    }
    cases.push(normalizeCaseRecord(record.caseRecord));
    if (record.review) reviews[caseId] = record.review;
    if (record.actionState) actionStates[caseId] = record.actionState;
    durableCaseIds.push(caseId);
  }
  return { cases, reviews, actionStates, durableCaseIds, auditEvents: [...recoveryEvents, ...snapshot.auditEvents] };
}

export function persistApprovedCase(input: {
  caseRecord: CaseRecord;
  source: Buffer;
  sourceMime: string;
  mask?: Buffer;
  maskMime?: string;
  review?: ReviewRecord;
  actionState?: CaseActionState;
  auditEvents: AuditEvent[];
  existing: PersistedSnapshot | null;
}) {
  if (!isApprovedDemoCase(input.caseRecord.id)) throw new PersistenceError("APPROVAL_REQUIRED", "This case is not on the approved demo allowlist.");
  if (input.source.length === 0 || input.source.length > MAX_ASSET_BYTES) throw new PersistenceError("ASSET_REQUIRED", "The original source asset is required for approved demo persistence.");
  const analysis = input.caseRecord.analysisMetrics?.visionResult;
  const sourceSha256 = sha256(input.source);
  if (!analysis?.fileHash || analysis.fileHash !== sourceSha256) throw new PersistenceError("ASSET_CORRUPT", "The source asset hash does not match the canonical analysis result.");
  if (analysis.analysisStatus === "measured" && !input.mask?.length) throw new PersistenceError("ASSET_REQUIRED", "A measured approved demo case must include its segmentation mask.");
  const maskSha256 = input.mask?.length ? sha256(input.mask) : undefined;
  const record: DurableRecord = {
    caseRecord: normalizeCaseRecord(input.caseRecord), review: input.review, actionState: input.actionState,
    source: { sha256: sourceSha256, mime: input.sourceMime, bytes: input.source.length },
    mask: input.mask?.length ? { sha256: maskSha256!, mime: input.maskMime ?? "image/png", bytes: input.mask.length } : undefined,
    binding: "", updatedAt: new Date().toISOString(),
  };
  record.binding = makeBinding(record);
  const snapshot: PersistedSnapshot = { schemaVersion: STORAGE_SCHEMA, updatedAt: new Date().toISOString(), auditEvents: input.auditEvents, records: { ...(input.existing?.records ?? {}), [input.caseRecord.id]: record } };
  writeAsset(input.caseRecord.id, "source", input.source);
  if (input.mask?.length) writeAsset(input.caseRecord.id, "mask", input.mask);
  writeSnapshot(snapshot);
  globals.thermoeyeDurableSnapshot = snapshot;
  return record;
}

export function persistState(input: { cases: CaseRecord[]; reviews: Record<string, ReviewRecord>; actionStates: Record<string, CaseActionState>; durableCaseIds: string[]; auditEvents: AuditEvent[] }) {
  if (!input.durableCaseIds.length) return;
  const current = readSnapshotWithRecovery().snapshot;
  if (!current) return;
  const records = { ...current.records };
  for (const caseId of input.durableCaseIds) {
    const old = records[caseId], caseRecord = input.cases.find((item) => item.id === caseId);
    if (!old || !caseRecord || !isRecordUsable(old)) continue;
    const next: DurableRecord = { ...old, caseRecord: normalizeCaseRecord(caseRecord), review: input.reviews[caseId], actionState: input.actionStates[caseId], updatedAt: new Date().toISOString(), binding: "" };
    next.binding = makeBinding(next); records[caseId] = next;
  }
  const snapshot: PersistedSnapshot = { schemaVersion: STORAGE_SCHEMA, updatedAt: new Date().toISOString(), auditEvents: input.auditEvents, records };
  writeSnapshot(snapshot); globals.thermoeyeDurableSnapshot = snapshot;
}

export function removeApprovedCase(caseId: string, auditEvents: AuditEvent[]) {
  if (!isSafeCaseId(caseId) || !isApprovedDemoCase(caseId)) throw new PersistenceError("APPROVAL_REQUIRED", "Only an explicitly approved demo case can be reset.");
  const current = readSnapshotWithRecovery().snapshot;
  if (!current?.records[caseId]) return false;
  for (const asset of ["source", "mask"] as const) { const from = assetPath(caseId, asset); if (existsSync(from)) { mkdirSync(backupAssetDir(caseId), { recursive: true }); copyFileSync(from, join(backupAssetDir(caseId), `${asset}.bin`)); } }
  const records = { ...current.records }; delete records[caseId];
  writeSnapshot({ schemaVersion: STORAGE_SCHEMA, updatedAt: new Date().toISOString(), auditEvents, records });
  rmSync(assetDir(caseId), { recursive: true, force: true }); globals.thermoeyeDurableSnapshot = readSnapshotWithRecovery().snapshot; return true;
}

export function restoreBackup() {
  if (!existsSync(backupPath())) throw new PersistenceError("STORAGE_WRITE_FAILED", "No durable demo backup is available to restore.");
  const snapshot = parseSnapshot(readFileSync(backupPath(), "utf8"));
  for (const [caseId, record] of Object.entries(snapshot.records)) for (const asset of ["source", "mask"] as const) {
    if (!record[asset]) continue;
    const from = join(backupAssetDir(caseId), `${asset}.bin`);
    if (!existsSync(from)) throw new PersistenceError("ASSET_MISSING", `Backup asset ${caseId}/${asset} is missing.`);
    mkdirSync(assetDir(caseId), { recursive: true }); copyFileSync(from, assetPath(caseId, asset));
  }
  writeSnapshot(snapshot); globals.thermoeyeDurableSnapshot = snapshot; return materialize(snapshot);
}

export function getPrivateAsset(caseId: string, asset: "source" | "mask"):
  | { ok: true; bytes: Buffer; mime: string }
  | { ok: false; code: "MISSING" | "CORRUPT" | "NOT_FOUND"; message: string } {
  if (!isSafeCaseId(caseId) || !isApprovedDemoCase(caseId)) return { ok: false, code: "NOT_FOUND", message: "Private demo asset was not found." };
  const record = readSnapshotWithRecovery().snapshot?.records[caseId], expected = asset === "source" ? record?.source : record?.mask;
  if (!record || !expected) return { ok: false, code: "MISSING", message: "Private demo asset is missing." };
  const path = assetPath(caseId, asset); if (!existsSync(path)) return { ok: false, code: "MISSING", message: "Private demo asset is missing." };
  let bytes: Buffer; try { bytes = readFileSync(path); } catch { return { ok: false, code: "MISSING", message: "Private demo asset is unreadable." }; }
  if (sha256(bytes) !== expected.sha256 || makeBinding(record) !== record.binding) return { ok: false, code: "CORRUPT", message: "Private demo asset integrity check failed." };
  return { ok: true, bytes, mime: expected.mime };
}
export function hasPrivateAssets(caseId: string) { return isApprovedDemoCase(caseId) && Boolean(readSnapshotWithRecovery().snapshot?.records[caseId]); }
export function privateAssetUrl(caseId: string, asset: "source" | "mask") { return `/api/cases/${encodeURIComponent(caseId)}/assets/${asset}`; }
export function decoratePrivateCase(caseRecord: CaseRecord) {
  if (!hasPrivateAssets(caseRecord.id) || !getPrivateAsset(caseRecord.id, "source").ok) return caseRecord;
  const result = { ...caseRecord, uploadedImageUrl: privateAssetUrl(caseRecord.id, "source") };
  if (caseRecord.analysisMetrics?.visionResult) { const mask = getPrivateAsset(caseRecord.id, "mask"); result.analysisMetrics = { ...caseRecord.analysisMetrics, visionResult: { ...caseRecord.analysisMetrics.visionResult, segmentationMaskDataUrl: mask.ok ? privateAssetUrl(caseRecord.id, "mask") : undefined } }; }
  return result;
}
export function previewReset(caseId: string) {
  if (!isSafeCaseId(caseId) || !isApprovedDemoCase(caseId)) throw new PersistenceError("APPROVAL_REQUIRED", "Only an explicitly approved demo case can be reset.");
  const record = readSnapshotWithRecovery().snapshot?.records[caseId]; return record ? { caseId, sourceBytes: record.source.bytes, maskBytes: record.mask?.bytes ?? 0, updatedAt: record.updatedAt } : null;
}

function readSnapshotWithRecovery(): { snapshot: PersistedSnapshot | null; recovered: boolean } {
  for (const [path, recovered] of [[snapshotPath(), false], [backupPath(), true]] as const) { if (!existsSync(path)) continue; try { return { snapshot: parseSnapshot(readFileSync(path, "utf8")), recovered }; } catch { /* Try backup, then fail closed. */ } }
  return { snapshot: null, recovered: existsSync(snapshotPath()) || existsSync(backupPath()) };
}
function parseSnapshot(value: string): PersistedSnapshot { const parsed = JSON.parse(value) as PersistedSnapshot; if (parsed.schemaVersion !== STORAGE_SCHEMA || !parsed.records || typeof parsed.records !== "object") throw new Error("Unsupported durable storage snapshot"); return parsed; }
function isRecordUsable(record: DurableRecord) {
  if (!record?.caseRecord || !record.source || !/^[a-f0-9]{64}$/.test(record.source.sha256) || !record.binding) return false;
  if (!record.caseRecord.analysisMetrics?.visionResult || !verifyAnalysis(record.caseRecord.analysisMetrics.visionResult, record.caseRecord.analysisReceipt)) return false;
  if (!getPrivateAssetFromRecord(record.caseRecord.id, record, "source").ok) return false;
  if (record.mask && !getPrivateAssetFromRecord(record.caseRecord.id, record, "mask").ok) return false;
  return makeBinding(record) === record.binding;
}
function getPrivateAssetFromRecord(caseId: string, record: DurableRecord, asset: "source" | "mask") { const expected = record[asset]; if (!expected) return { ok: false as const }; const path = assetPath(caseId, asset); if (!existsSync(path)) return { ok: false as const }; try { return sha256(readFileSync(path)) === expected.sha256 ? { ok: true as const } : { ok: false as const }; } catch { return { ok: false as const }; } }
function makeBinding(record: DurableRecord) { const payload = JSON.stringify({ caseRecord: record.caseRecord, review: record.review ?? null, actionState: record.actionState ?? null, source: record.source, mask: record.mask ?? null }); return createHmac("sha256", getAnalysisSigningSecret()).update(payload).digest("hex"); }
function writeAsset(caseId: string, asset: "source" | "mask", bytes: Buffer) { if (process.env.THERMOEYE_TEST_STORAGE_WRITE_FAILURE === "1") throw new PersistenceError("STORAGE_WRITE_FAILED", "Configured storage failure prevented a durable write."); mkdirSync(assetDir(caseId), { recursive: true }); atomicWrite(assetPath(caseId, asset), bytes); }
function writeSnapshot(snapshot: PersistedSnapshot) { if (process.env.THERMOEYE_TEST_STORAGE_WRITE_FAILURE === "1") throw new PersistenceError("STORAGE_WRITE_FAILED", "Configured storage failure prevented a durable write."); mkdirSync(storageRoot(), { recursive: true }); atomicWrite(snapshotPath(), Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`, "utf8"), true); }
function atomicWrite(path: string, bytes: Buffer, keepBackup = false) { const temporary = `${path}.tmp-${process.pid}-${Date.now()}`; mkdirSync(dirname(path), { recursive: true }); const fd = openSync(temporary, "w", 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } try { if (keepBackup && existsSync(path)) copyFileSync(path, backupPath()); if (existsSync(path)) unlinkSync(path); renameSync(temporary, path); } catch (error) { try { unlinkSync(temporary); } catch { /* best effort cleanup */ } throw new PersistenceError("STORAGE_WRITE_FAILED", `Durable storage write failed: ${error instanceof Error ? error.message : "unknown error"}`); } }
function decodeDataUrl(value: string, maxBytes: number) { const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(value); if (!match) return null; const bytes = Buffer.from(match[2], "base64"); return bytes.length > 0 && bytes.length <= maxBytes ? { bytes, mime: match[1] } : null; }
function sha256(value: Buffer) { return createHash("sha256").update(value).digest("hex"); }
function isSafeCaseId(value: string) { return /^[A-Z0-9-]{4,64}$/.test(value); }
