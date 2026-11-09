import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixturePng, startInferenceFixture, caseFromFixtureAnalysis } from "./integration-fixture.mjs";

const storage = mkdtempSync(join(tmpdir(), "thermoeye-phase3-live-"));
const appPort = 3037;
const appUrl = `http://127.0.0.1:${appPort}`;
const baseEnv = {
  ...process.env,
  THERMOEYE_DEMO_STORAGE_DIR: storage,
  THERMOEYE_APPROVED_DEMO_CASE_IDS: "TE-P3-LIVE",
  THERMOEYE_ANALYSIS_SIGNING_KEY: "phase3-live-signing-key-012345678901234567890123",
  THERMOEYE_SESSION_TOKEN: "phase3-live-session-token-012345678901234567890",
  THERMOEYE_DEMO_EMAIL: "doctor@thermoeye.demo",
  THERMOEYE_DEMO_PASSWORD: "pilot-access",
};
let fixture = await startInferenceFixture();
let server;
let cookie = "";

try {
  await startNext(fixture.env);
  await login();
  const analysisResponse = await analyze();
  const record = caseFromFixtureAnalysis("TE-P3-LIVE", { ...analysisResponse, receiptForTest: analysisResponse.analysisReceipt });
  const saved = await saveApproved(record);
  assert.equal(saved.storage.durable, true, "approved mode is durable");
  assert.equal((await request(`/api/uploads/queue`, { method: "POST", body: JSON.stringify({ caseRecord: record }) })).status, 409, "duplicate submission is rejected");
  const approval = { decision: "Approved for release", followUpWindow: "Routine", note: "Research measurements reviewed; no diagnosis is made." };
  assert.equal((await request(`/api/cases/${record.id}/review`, { method: "POST", body: JSON.stringify(approval), headers: { "Content-Type": "application/json" } })).status, 200);
  const before = await json("/api/console-state");
  const beforeCase = before.cases.find((item) => item.id === record.id);
  assert.equal(beforeCase.analysisMetrics.vesselDensity, 16);
  assert.match(beforeCase.uploadedImageUrl, /\/assets\/source$/);
  assert.equal(Buffer.from(await (await request(beforeCase.uploadedImageUrl)).arrayBuffer()).toString(), fixturePng.toString(), "private source route returns exact bytes");
  assert.equal((await request(`/api/cases/${record.id}/assets/mask`)).status, 200, "private mask route is available");
  assert.equal((await request(`/api/cases/..%2FTE-P3-LIVE/assets/source`)).status, 400, "traversal is rejected");

  await restartServices();
  const after = await json("/api/console-state");
  const afterCase = after.cases.find((item) => item.id === record.id);
  assert.equal(afterCase.analysisMetrics.vesselDensity, 16, "measurements survive both service restart");
  assert.equal(after.reviews[record.id].decision, "Approved for release", "review survives both service restart");
  assert.equal(Buffer.from(await (await request(afterCase.uploadedImageUrl)).arrayBuffer()).toString(), fixturePng.toString(), "source survives both service restart");
  assert.equal((await request(`/api/cases/${record.id}/assets/mask`)).status, 200, "mask survives both service restart");
  assert.equal((await request("/api/console-state", { headers: {} })).status, 200, "session cookie is retained for the authenticated request");
  console.log("Live persistence regression passed: approved source/mask/measurements/review survived Next.js and inference fixture restart; duplicate, traversal, and private-route checks passed.");
} finally {
  await stopNext();
  await fixture.close();
}

async function startNext(extraEnv) {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], { cwd: process.cwd(), env: { ...baseEnv, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
  await waitForHttp();
}
async function restartServices() {
  await stopNext();
  await fixture.close();
  fixture = await startInferenceFixture();
  await startNext(fixture.env);
  await login();
}
async function stopNext() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => { const timer = setTimeout(resolve, 3000); server.once("exit", () => { clearTimeout(timer); resolve(); }); });
}
async function waitForHttp() {
  const started = Date.now();
  while (Date.now() - started < 30_000) { try { if ((await fetch(`${appUrl}/login`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 200)); }
  throw new Error("Next.js did not start");
}
async function login() {
  const response = await request("/api/session", { method: "POST", body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }), headers: { "Content-Type": "application/json" } });
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
async function analyze() {
  const form = new FormData(); form.append("image", new Blob([fixturePng], { type: "image/png" }), "approved-octa.png");
  const response = await request("/api/analyze", { method: "POST", body: form });
  const body = await response.json(); assert.equal(response.status, 200); return { ...body.analysis, analysisReceipt: body.analysisReceipt };
}
async function saveApproved(record) {
  const response = await request("/api/uploads/queue", { method: "POST", body: JSON.stringify({ caseRecord: record, persistApprovedDemo: true, sourceBase64: fixturePng.toString("base64"), sourceMime: "image/png" }), headers: { "Content-Type": "application/json" } }); const body = await response.json(); assert.equal(response.status, 201, JSON.stringify(body)); return body;
}
async function request(path, init = {}) { return fetch(path.startsWith("http") ? path : `${appUrl}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) } }); }
async function json(path) { const response = await request(path); const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; }
