import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { startInferenceFixture, fixturePng, caseFromFixtureAnalysis } from "./integration-fixture.mjs";

const appPort = Number(process.env.APP_PORT ?? 3021);
const appUrl = `http://127.0.0.1:${appPort}`;
const fixture = await startInferenceFixture();
let serverOutput = "";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
  detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"], env: fixture.env,
});
server.on("error", (error) => { serverOutput += error.message; });
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
let cookie;

try {
  await waitForHttp();
  assert.equal((await request("/api/console-state")).status, 401, "state requires a session");
  const login = await request("/api/session", { method: "POST", body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }), headers: { "Content-Type": "application/json" } });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "login cookie");
  const initial = await json("/api/console-state");
  assert.ok(initial.cases.every((item) => item.riskScore === null && item.riskLevel === "indeterminate"), "legacy cases migrated");
  for (const body of [null, {}, { caseRecord: {} }, { caseRecord: { id: "BAD-CASE", riskScore: null } }]) {
    assert.equal((await post("/api/uploads/queue", body)).status, 400, "malformed input must not silently queue");
  }
  const nonce = Date.now().toString(36).toUpperCase();
  const firstAnalysis = await analyze("first-octa.png");
  assert.equal(firstAnalysis.engine, "heuristic_research_baseline");
  assert.equal(firstAnalysis.vesselDensity, 16);
  assert.equal(firstAnalysis.metricUnit, "percent_0_100");
  assert.equal(firstAnalysis.primaryDisease, "indeterminate");
  assert.equal(firstAnalysis.riskScore, null);
  assert.equal(firstAnalysis.confidence, null);
  assert.deepEqual(firstAnalysis.differentials, []);
  assert.match(firstAnalysis.fileHash, /^[a-f0-9]{64}$/);
  assert.ok(firstAnalysis.requestId);
  const first = caseFromFixtureAnalysis(`TE-API-A-${nonce}`, firstAnalysis);
  const tampered = structuredClone(first);
  tampered.analysisMetrics.visionResult.vesselDensity = 77;
  assert.equal((await post("/api/uploads/queue", { caseRecord: tampered })).status, 400, "tampered analysis cannot be saved");
  const unsigned = structuredClone(first); delete unsigned.analysisReceipt;
  assert.equal((await post("/api/uploads/queue", { caseRecord: unsigned })).status, 400, "unsigned analysis cannot be saved");
  const saved = await save(first);
  assert.equal(saved.status, "saved");
  assert.equal(saved.storage.durable, false);
  assert.equal(saved.caseRecord.analysisMetrics.vesselDensity, 16);
  assert.equal(saved.caseRecord.uploadedImageUrl, undefined);
  assert.equal(saved.caseRecord.uploadedFileName, undefined);
  assert.equal(saved.caseRecord.analysisMetrics.visionResult.previewDataUrl, undefined);
  assert.ok(!JSON.stringify(saved.auditEvents).includes("PRIVATE-IDENTIFIER"));
  assert.equal((await post("/api/uploads/queue", { caseRecord: first })).status, 409, "duplicate case cannot overwrite");
  const invalid = structuredClone(first); invalid.id += "-BAD"; invalid.analysisMetrics.vesselDensity = "16";
  assert.equal((await post("/api/uploads/queue", { caseRecord: invalid })).status, 400);

  const second = caseFromFixtureAnalysis(`TE-API-B-${nonce}`, await analyze("second-octa.png"));
  await save(second);
  for (const [record, expected] of [[first, 16], [second, 42]]) {
    const preview = await json(`/api/cases/${record.id}/report/preview`);
    assert.equal(preview.caseRecord.id, record.id);
    assert.equal(preview.caseRecord.analysisMetrics.vesselDensity, expected, "report must reflect selected upload");
    assert.equal(preview.caseRecord.analysisMetrics.visionResult.vesselDensity, expected);
    assert.equal(preview.clinicalClassification.kind, "indeterminate");
    assert.equal(preview.releaseStatus, "locked");
    assert.equal((await post(`/api/cases/${record.id}/report/download`)).status, 403);
  }

  const approval = { decision: "Approved for release", followUpWindow: "Routine", note: "Research measurements reviewed; no diagnosis is made." };
  for (const filename of ["blocked-octa.png", "unavailable-octa.png"]) {
    const analysis = await analyze(filename);
    const record = caseFromFixtureAnalysis(`TE-API-${filename.startsWith("blocked") ? "BLOCKED" : "NONE"}-${nonce}`, analysis);
    await save(record);
    assert.equal(record.analysisMetrics.vesselDensity, null);
    assert.equal((await post(`/api/cases/${record.id}/review`, approval)).status, 403);
    assert.equal((await post(`/api/cases/${record.id}/report/download`)).status, 403);
    assert.equal((await json(`/api/cases/${record.id}/report/preview`)).releaseStatus, "locked");
  }
  assert.equal((await post(`/api/cases/${first.id}/review`, approval)).status, 200);
  assert.equal((await json(`/api/cases/${first.id}/report/preview`)).releaseStatus, "ready");
  const download = await post(`/api/cases/${first.id}/report/download`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "application/pdf");
  const pdf = Buffer.from(await download.arrayBuffer()).toString("latin1");
  assert.ok(pdf.startsWith("%PDF-"));
  assert.ok(pdf.includes("16%"), "PDF includes unchanged measured percentage");
  assert.equal((await post(`/api/cases/${first.id}/review`, { ...approval, note: "บันทึกการวิจัยภาษาไทย" })).status, 200);
  const thaiPdfResponse = await post(`/api/cases/${first.id}/report/download`);
  assert.equal(thaiPdfResponse.status, 200, "a non-Latin note must not block the report");
  const thaiPdf = Buffer.from(await thaiPdfResponse.arrayBuffer()).toString("latin1");
  assert.ok(thaiPdf.includes("non-Latin text omitted"), "omission is stated in the PDF");
  assert.ok(!/[\u0080-\uffff]/.test(thaiPdf.slice(thaiPdf.indexOf("Reviewer note"), thaiPdf.indexOf("Reviewer note") + 200)), "Unicode notes must not become corrupted PDF text");
  assert.equal((await json(`/api/cases/${first.id}/review`)).review.note, "บันทึกการวิจัยภาษาไทย", "original Unicode note retained");
  const dicom = await post(`/api/cases/${first.id}/dicom`);
  assert.equal(dicom.status, 200);
  assert.equal(dicom.headers.get("content-type"), "application/dicom");
  assert.match(dicom.headers.get("content-disposition"), /\.dcm"$/);
  assert.equal(Buffer.from(await dicom.arrayBuffer()).subarray(128, 132).toString(), "DICM");
  const final = await json("/api/console-state");
  assert.equal(final.cases.find((item) => item.id === first.id).analysisMetrics.vesselDensity, 16);
  assert.equal(final.cases.find((item) => item.id === second.id).analysisMetrics.vesselDensity, 42);
  assert.equal(final.cases.filter((item) => item.id === first.id).length, 1);
  console.log("API flow passed: nullable storage, invalid/duplicate rejection, canonical measurements, selected report values, release guards, PDF and DICOM. Inference used an isolated local fixture; no external providers.");
} finally {
  killProcessGroup(server);
  await fixture.close();
}

function request(path, init = {}) { return fetch(`${appUrl}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...init.headers } }); }
function post(path, body) { return request(path, { method: "POST", ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }); }
async function json(path, init) { const response = await request(path, init); const data = await response.json(); assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`); return data; }
async function save(caseRecord) { const response = await post("/api/uploads/queue", { caseRecord }); const data = await response.json(); assert.equal(response.status, 201, JSON.stringify(data)); return data; }
async function analyze(name) { const form = new FormData(); form.append("image", new Blob([fixturePng], { type: "image/png" }), name); const response = await json("/api/analyze", { method: "POST", body: form }); return { ...response.analysis, receiptForTest: response.analysisReceipt }; }
async function waitForHttp() { const started = Date.now(); while (Date.now() - started < 30_000) { if (server.exitCode !== null) break; try { if ((await fetch(`${appUrl}/console/dashboard`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 200)); } throw new Error(`Server not ready: ${serverOutput}`); }
function killProcessGroup(child) { if (!child.pid) return; try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); } }
