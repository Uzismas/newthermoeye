/** Real FastAPI + production Next regression using synthetic images only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { caseFromFixtureAnalysis } from "./integration-fixture.mjs";

const root = process.cwd();
const appUrl = "http://127.0.0.1:3015";
const backendPort = Number(process.env.OCTA_TEST_BACKEND_PORT ?? 8015);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const python = path.join(root, "backend", ".venv", ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));
const fixtureDir = await mkdtemp(path.join(os.tmpdir(), "thermoeye-octa-real-"));
const safeEnv = { ...process.env, ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "", THERMOEYE_ALLOW_EXTERNAL_VISION: "false", OCTA_SEGMENTATION_ENGINE: "onnx_vessel_unet", NEXT_TELEMETRY_DISABLED: "1" };
const outputs = new Map();
let backend, next, cookie;

try {
  await assertFree(`${appUrl}/login`);
  await assertFree(`${backendUrl}/health`);
  execFileSync(python, ["scripts/generate-octa-fixtures.py", fixtureDir], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const artifact = await readFile("backend/models/octa/octa_vessel_unet.onnx");
  const modelSha = createHash("sha256").update(artifact).digest("hex");
  const card = JSON.parse(await readFile("backend/models/octa/model_card.json", "utf8"));
  assert.equal(modelSha, card.artifact_sha256, "installed artifact must match its model card");
  backend = start(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)], path.join(root, "backend"));
  await ready(`${backendUrl}/health`, backend);
  next = start(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3015"], root, { THERMOEYE_LOCAL_INFERENCE_URL: backendUrl, NODE_ENV: "production" });
  await ready(`${appUrl}/login`, next);
  cookie = await login();

  const first = await upload("grayscale.png", "scan.bin", "image/png");
  const base = measured(first, "L", "PNG", "passed", modelSha);
  const raw = await upload("grayscale.png", "scan.bin", "image/png", true);
  assert.equal(raw.status, 200);
  assert.equal(raw.body.provenance.model_sha256, modelSha);
  assert.equal(base.vesselDensity, raw.body.measurements.vessel_density, "normalization must preserve 0–100 vessel values");
  assert.equal(base.fazRisk, raw.body.measurements.faz_risk_proxy, "normalization must preserve central non-vessel proxy");
  assert.equal(base.qualityScore, raw.body.quality.quality_score);
  assert.equal(base.perfusion, null);
  assert.equal(base.fileHash, createHash("sha256").update(await readFile(path.join(fixtureDir, "grayscale.png"))).digest("hex"));
  assert.equal(base.fileHash, raw.body.provenance.input_sha256);
  assert.equal(raw.body.filename, undefined, "raw response does not expose filenames");
  assert.equal(base.imageWidth, 128);
  assert.equal(base.imageHeight, 128);
  assert.match(base.previewDataUrl, /^data:image\/png;base64,/);
  assert.match(base.segmentationMaskDataUrl, /^data:image\/png;base64,/);

  // Carry an actual ONNX result through receipt verification, storage, review and PDF.
  const actualCase = caseFromFixtureAnalysis("TE-REAL-STACK", { ...base, receiptForTest: first.body.analysisReceipt });
  const saved = await fetch(`${appUrl}/api/uploads/queue`, {
    method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ caseRecord: actualCase }),
  });
  const savedBody = await saved.json();
  assert.equal(saved.status, 201, JSON.stringify(savedBody));
  assert.equal(savedBody.caseRecord.analysisMetrics.vesselDensity, base.vesselDensity);
  assert.equal(savedBody.caseRecord.analysisMetrics.visionResult.modelVersion, base.modelVersion);
  assert.equal(savedBody.caseRecord.analysisMetrics.visionResult.previewDataUrl, undefined);
  const review = await fetch(`${appUrl}/api/cases/TE-REAL-STACK/review`, {
    method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "Approved for release", followUpWindow: "Routine", note: "Synthetic ONNX research flow verified; not a diagnosis." }),
  });
  assert.equal(review.status, 200);
  const report = await fetch(`${appUrl}/api/cases/TE-REAL-STACK/report/download`, { method: "POST", headers: { Cookie: cookie } });
  assert.equal(report.status, 200);
  const reportText = Buffer.from(await report.arrayBuffer()).toString("latin1");
  assert.ok(reportText.startsWith("%PDF-"));
  assert.ok(reportText.includes(`${base.vesselDensity}%`));
  assert.ok(reportText.includes("Disease risk: N/A"));
  assert.ok(reportText.includes(modelSha));

  for (const [fixture, mode, gate] of [["false-color.png", "RGB", "passed_with_color_warning"], ["rgba.png", "RGBA", "passed_with_color_warning"], ["palette.png", "P", "passed"]]) {
    measured(await upload(fixture, "generic.png", "image/png"), mode, "PNG", gate, modelSha);
  }
  for (const mime of ["image/tiff", "image/tif", "image/x-tiff", "application/octet-stream", ""]) {
    const result = measured(await upload("uint16.tiff", "scan.TIFF", mime), "I;16", "TIFF", "passed", modelSha);
    assert.match(result.colorConversion, /65535/);
    assert.equal(result.vesselDensity, base.vesselDensity, "fixed uint16 normalization must reproduce equivalent 8-bit segmentation");
    assert.match(result.previewDataUrl, /^data:image\/png;base64,/);
  }
  const low = analysisOf(await upload("low-quality.png", "scan.png", "image/png"));
  safeDisease(low);
  assert.equal(low.analysisStatus, "quality_blocked");
  assert.equal(low.qualityStatus, "blocked");
  assert.equal(low.modalityGateStatus, "passed", "quality failure is separate from modality gate");
  assert.equal(low.engine, "none");
  assert.equal(low.vesselDensity, null);
  assert.equal(low.fazRisk, null);
  assert.equal(low.perfusion, null);
  assert.ok(!low.segmentationMaskDataUrl);

  for (const fixture of ["tiny.png", "corrupt.png"]) {
    const result = await upload(fixture, "scan.png", "image/png");
    assert.equal(result.status, 422, `${fixture} must be decoder rejection, never fallback`);
    assert.match(result.body.error, /decoder/i);
    assert.equal(result.body.analysis, undefined);
  }
  for (const filename of ["face-photo.png", "skin-photo.png", "acne-photo.png", "fundus-photo.png"]) {
    const result = await upload("grayscale.png", filename, "image/png");
    assert.equal(result.status, 422);
    assert.match(result.body.error, /non-OCT/i);
    const direct = await upload("grayscale.png", filename, "image/png", true);
    assert.equal(direct.body.analysis_status, "modality_blocked");
    assert.equal(direct.body.quality.status, "passed");
    assert.equal(direct.body.measurements, null);
    assert.equal(direct.body.classification.label, "indeterminate");
  }
  const mismatch = await upload("grayscale.png", "scan.jpg", "image/jpeg");
  assert.equal(mismatch.status, 415);
  const directMismatch = await upload("grayscale.png", "scan.jpg", "image/jpeg", true);
  assert.equal(directMismatch.status, 422);
  assert.match(directMismatch.body.detail, /MIME/);

  const example = structuredClone(first.body);
  delete example.analysisReceipt;
  delete example.analysis.previewDataUrl;
  delete example.analysis.segmentationMaskDataUrl;
  await mkdir(path.join(root, "docs", "examples"), { recursive: true });
  await writeFile(path.join(root, "docs", "examples", "octa-analysis.json"), JSON.stringify({
    synthetic: true,
    source: "Deterministic synthetic grayscale OCTA-like fixture generated by scripts/generate-octa-fixtures.py. No patient data or clinical ground truth.",
    omitted: ["analysisReceipt", "analysis.previewDataUrl", "analysis.segmentationMaskDataUrl"],
    response: example,
  }, null, 2) + "\n", "utf8");

  await stop(backend);
  backend = undefined;
  const unavailable = analysisOf(await upload("grayscale.png", "scan.png", "image/png"));
  safeDisease(unavailable);
  assert.equal(unavailable.analysisStatus, "unavailable");
  assert.equal(unavailable.engine, "none");
  assert.equal(unavailable.trainedModelConnected, false);
  for (const key of ["vesselDensity", "fazRisk", "perfusion", "qualityScore", "modelVersion"]) assert.equal(unavailable[key], null);
  assert.match(unavailable.failureReason, /could not be reached/);
  assert.ok(!unavailable.segmentationMaskDataUrl);
  assert.ok(!unavailable.previewDataUrl);
  console.log("Real-stack OCTA regression passed: ONNX + Next, grayscale/color/RGBA/palette/TIFF16, gates, MIME, exact normalization, provenance, receipt/save/review/PDF, and unavailable backend.");
  console.log("External providers explicitly disabled; synthetic fixtures only. Saved docs/examples/octa-analysis.json without image payloads or receipt.");
} catch (error) {
  console.error("Backend startup/runtime output:\n" + (outputs.get(backend) ?? ""));
  console.error("Next startup/runtime output:\n" + (outputs.get(next) ?? ""));
  throw error;
} finally {
  await stop(backend);
  await stop(next);
  // Delete only the unique temporary fixture directory created by this run.
  await rm(fixtureDir, { recursive: true, force: true });
}

function start(command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...safeEnv, ...extraEnv } });
  outputs.set(child, "");
  const collect = (chunk) => outputs.set(child, (outputs.get(child) + String(chunk)).slice(-20000));
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", collect);
  return child;
}
async function assertFree(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(1000) }); }
  catch { return; }
  throw new Error(`Refusing to reuse an existing service at ${url}; this test needs isolated services.`);
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(`Service exited: ${outputs.get(child)}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
async function login() {
  const response = await fetch(`${appUrl}/api/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }) });
  assert.equal(response.status, 200);
  const value = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(value);
  return value;
}
async function upload(fixture, filename, mime, direct = false) {
  const form = new FormData();
  form.append("image", new Blob([await readFile(path.join(fixtureDir, fixture))], { type: mime }), filename);
  const response = await fetch(direct ? `${backendUrl}/octa/analyze` : `${appUrl}/api/analyze`, { method: "POST", headers: direct ? {} : { Cookie: cookie }, body: form, signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
function analysisOf(result) {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok(result.body.analysis, "API analysis payload is required");
  assert.match(result.headers.get("cache-control"), /no-store/);
  return result.body.analysis;
}
function safeDisease(a) {
  assert.equal(a.primaryDisease, "indeterminate");
  assert.equal(a.riskLevel, "indeterminate");
  assert.equal(a.riskScore, null);
  assert.equal(a.confidence, null);
  assert.deepEqual(a.differentials, []);
  assert.equal(a.metricUnit, "percent_0_100");
}
function measured(response, mode, format, gate, sha) {
  const a = analysisOf(response);
  safeDisease(a);
  assert.equal(a.analysisStatus, "measured");
  assert.equal(a.engine, "onnx_vessel_unet");
  assert.equal(a.segmentationEngine, "onnx_vessel_unet");
  assert.equal(a.trainedModelConnected, true);
  assert.equal(a.modelVersion, `octa-vessel-unet-sha256:${sha}`);
  assert.equal(a.modelTask, "vessel_segmentation");
  assert.equal(a.preprocessingVersion, "octa-luma-u16-v2");
  assert.equal(a.threshold, 0.5);
  assert.equal(a.inputMode, mode);
  assert.equal(a.decodedFormat, format);
  assert.equal(a.modalityGateStatus, gate);
  assert.equal(a.qualityStatus, "passed");
  assert.equal(a.perfusion, null);
  assert.equal(a.failureReason, null);
  assert.ok(a.requestId && a.timestamp);
  for (const key of ["vesselDensity", "fazRisk", "qualityScore"]) assert.ok(typeof a[key] === "number" && a[key] >= 0 && a[key] <= 100, `${key} must be a measured percent`);
  return a;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
}
