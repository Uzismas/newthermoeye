import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { normalizeAnalysis } from "../analysis-contract";
import type { VisionResult } from "../types";

const shared = globalThis as typeof globalThis & { thermoeyeReceiptSecret?: string };
export function getAnalysisSigningSecret() {
  const configured = process.env.THERMOEYE_ANALYSIS_SIGNING_KEY?.trim();
  if (configured) return configured;

  // Durable demo mode keeps this private key beside its private manifest. It is
  // never returned to the browser or checked into the repository.
  const storageDir = process.env.THERMOEYE_DEMO_STORAGE_DIR?.trim();
  if (storageDir) {
    const path = join(resolve(storageDir), "analysis-signing.key");
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) return readFileSync(path, "utf8").trim();
    const generated = randomBytes(32).toString("hex");
    const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(temporary, `${generated}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    try { renameSync(temporary, path); } catch { if (existsSync(path)) return readFileSync(path, "utf8").trim(); throw new Error("Could not initialize the private analysis signing key."); }
    return generated;
  }

  return shared.thermoeyeReceiptSecret ??= randomBytes(32).toString("hex");
}
const secret = getAnalysisSigningSecret;
function canonicalPayload(result: VisionResult) {
  const safe = normalizeAnalysis(result);
  delete safe.previewDataUrl;
  delete safe.segmentationMaskDataUrl;
  return JSON.stringify(safe);
}
export function signAnalysis(result: VisionResult): string {
  return createHmac("sha256", secret()).update(canonicalPayload(result)).digest("hex");
}
export function verifyAnalysis(result: VisionResult, receipt: unknown): boolean {
  if (typeof receipt !== "string" || !/^[a-f0-9]{64}$/.test(receipt)) return false;
  const expected = signAnalysis(result);
  return timingSafeEqual(Buffer.from(receipt, "hex"), Buffer.from(expected, "hex"));
}
