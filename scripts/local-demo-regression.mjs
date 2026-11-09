import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = join(root, "scripts", "local-demo.mjs");
const python = join(root, "backend", ".venv", "Scripts", "python.exe");
const work = await mkdtemp(join(tmpdir(), "thermoeye-local-demo-test-"));
const runtime = join(work, "runtime");
let frontendPort;
let backendPort;
let running = false;

try {
  const missingRuntime = runLauncher(["check", "--json"], { THERMOEYE_PYTHON: join(work, "missing-python.exe"), THERMOEYE_RUNTIME_DIR: runtime });
  assert.notEqual(missingRuntime.status, 0);
  assert.match(missingRuntime.stdout, /Cannot run the project interpreter/);

  const networkBind = runLauncher(["check", "--host", "0.0.0.0", "--json"], { THERMOEYE_RUNTIME_DIR: runtime, THERMOEYE_SESSION_TOKEN: "pilot-doctor" });
  assert.notEqual(networkBind.status, 0);
  assert.match(networkBind.stdout, /Network-accessible binding requires THERMOEYE_SESSION_TOKEN/);
  const privateToken = "local-network-session-token-with-at-least-32-characters";
  const networkBindAllowed = runLauncher(["check", "--host", "0.0.0.0", "--port", String(await freePort()), "--backend-port", String(await freePort()), "--json"], {
    THERMOEYE_RUNTIME_DIR: runtime,
    THERMOEYE_SESSION_TOKEN: privateToken,
  });
  assert.equal(networkBindAllowed.status, 0, networkBindAllowed.stdout);
  assert.match(networkBindAllowed.stdout, /non-default session token present/);
  assert.ok(!networkBindAllowed.stdout.includes(privateToken), "readiness output must not reveal the session token");

  const nodeGuard = spawnSync(process.execPath, ["-e", "import('./scripts/offline-guard/offline-network-guard.mjs').then(({ assertHost }) => assertHost('198.51.100.1'))"], {
    encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: `--import="${pathToFileURL(join(root, "scripts", "offline-guard", "offline-network-guard.mjs")).href}"` },
  });
  assert.notEqual(nodeGuard.status, 0);
  assert.match(nodeGuard.stderr, /blocked non-loopback network target/);
  const fetchGuard = spawnSync(process.execPath, ["-e", "fetch('http://example.invalid').catch((error) => { console.error(error.message); process.exit(1); })"], {
    encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: `--import="${pathToFileURL(join(root, "scripts", "offline-guard", "offline-network-guard.mjs")).href}"` },
  });
  assert.notEqual(fetchGuard.status, 0);
  assert.match(fetchGuard.stderr, /blocked non-loopback network target/);
  const dnsGuard = spawnSync(process.execPath, ["-e", "require('node:dns').lookup('example.invalid', (error) => { if (error) { console.error(error.message); process.exit(1); } })"], {
    encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: `--import="${pathToFileURL(join(root, "scripts", "offline-guard", "offline-network-guard.mjs")).href}"` },
  });
  assert.notEqual(dnsGuard.status, 0);
  assert.match(dnsGuard.stderr, /blocked DNS lookup/);
  const pythonGuard = spawnSync(python, ["-c", "import socket; socket.getaddrinfo('example.invalid', 443)"], {
    encoding: "utf8", windowsHide: true,
    env: { ...process.env, PYTHONPATH: [join(root, "scripts", "offline-guard"), process.env.PYTHONPATH].filter(Boolean).join(";") },
  });
  assert.notEqual(pythonGuard.status, 0);
  assert.match(pythonGuard.stderr, /blocked name resolution/);

  const blockedServer = createServer((socket) => socket.end("occupied port owner"));
  await new Promise((resolvePromise, reject) => blockedServer.once("error", reject).listen(0, "127.0.0.1", resolvePromise));
  const occupiedPort = blockedServer.address().port;
  backendPort = await freePort();
  const occupied = runLauncher(["start", "--port", String(occupiedPort), "--backend-port", String(backendPort)], { THERMOEYE_RUNTIME_DIR: runtime });
  const ownerBody = await probeOwner(occupiedPort);
  await new Promise((resolvePromise) => blockedServer.close(resolvePromise));
  assert.notEqual(occupied.status, 0);
  assert.match(occupied.stdout, /is occupied/);
  assert.match(occupied.stdout, /will not terminate a port owner/);
  assert.equal(ownerBody, "occupied port owner", "preflight must leave the existing port owner available");

  frontendPort = await freePort();
  backendPort = await freePort();
  const started = runLauncher(["start", "--offline", "--port", String(frontendPort), "--backend-port", String(backendPort)], {
    THERMOEYE_RUNTIME_DIR: runtime,
    OCTA_SEGMENTATION_ENGINE: "heuristic_research_baseline",
    THERMOEYE_ALLOW_EXTERNAL_VISION: "true",
    ANTHROPIC_API_KEY: "must-be-cleared-by-launcher",
    GOOGLE_API_KEY: "must-be-cleared-by-launcher",
    THERMOEYE_SESSION_TOKEN: "phase-two-local-demo-session-token-32chars",
  });
  assert.equal(started.status, 0, started.stdout + started.stderr);
  running = true;
  assert.match(started.stdout, /External vision: false/);
  const duplicate = runLauncher(["start", "--offline", "--port", String(frontendPort), "--backend-port", String(backendPort)], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /already running/);

  const baseUrl = `http://127.0.0.1:${frontendPort}`;
  assert.equal((await fetch(`${baseUrl}/login`)).status, 200);
  const login = await fetch(`${baseUrl}/api/session`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "local presentation session should be available");

  const fixtureDir = join(work, "fixtures");
  const generated = spawnSync(python, [join(root, "scripts", "generate-octa-fixtures.py"), fixtureDir], { cwd: root, encoding: "utf8", timeout: 30000, windowsHide: true });
  assert.equal(generated.status, 0, generated.stderr);
  const bytes = await readFile(join(fixtureDir, "grayscale.png"));
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), "synthetic-scan.png");
  form.append("allowExternal", "true");
  const analyzed = await fetch(`${baseUrl}/api/analyze`, { method: "POST", headers: { Cookie: cookie }, body: form });
  assert.equal(analyzed.status, 200);
  const response = await analyzed.json();
  assert.equal(response.analysis.analysisStatus, "measured");
  assert.equal(response.analysis.engine, "onnx_vessel_unet");
  assert.equal(response.analysis.segmentationEngine, "onnx_vessel_unet");
  assert.equal(response.analysis.trainedModelConnected, true);
  assert.equal(response.analysis.modelVersion, startedModelVersion(started.stdout));
  assert.equal(response.analysis.riskScore, null);

  const readiness = JSON.parse(await readFile(join(runtime, "readiness.json"), "utf8"));
  assert.equal(readiness.status, "ready");
  assert.equal(readiness.frontend.status, "ready");
  assert.equal(readiness.backend.status, "ready");
  assert.equal(readiness.engine, "onnx_vessel_unet");
  assert.equal(readiness.model.status, "ready");
  assert.equal(readiness.model.engine, "onnx_vessel_unet");
  assert.equal(readiness.model.model_hash, "195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87");
  assert.equal(response.analysis.modelVersion, readiness.model.model_version);
  assert.equal(readiness.external_vision, "disabled");
  const evidenceDir = join(root, "docs", "ysc", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const sanitizedReadiness = {
    ...readiness,
    processes: readiness.processes.map(({ kind }) => ({ kind, status: "launcher-owned" })),
    logs: { frontend: "frontend.log", backend: "backend.log" },
    verification: { offline_network_guard: "active", synthetic_onnx_inference: "passed", provider_transport: "disabled" },
  };
  await writeFile(join(evidenceDir, "phase-02-readiness.json"), `${JSON.stringify(sanitizedReadiness, null, 2)}\n`, "utf8");

  const stopped = runLauncher(["stop"], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.equal(stopped.status, 0, stopped.stdout + stopped.stderr);
  running = false;
  const down = runLauncher(["status", "--port", String(frontendPort), "--backend-port", String(backendPort)], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.notEqual(down.status, 0);
  assert.match(down.stdout, /FastAPI is unavailable/);
  assert.match(down.stdout, /Next.js is not responding/);
  assert.match(down.stdout, /Start the launcher/);

  const normalStarted = runLauncher(["start", "--port", String(frontendPort), "--backend-port", String(backendPort)], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.equal(normalStarted.status, 0, normalStarted.stdout + normalStarted.stderr);
  running = true;
  const normalStatus = runLauncher(["status", "--port", String(frontendPort), "--backend-port", String(backendPort)], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.equal(normalStatus.status, 0, normalStatus.stdout + normalStatus.stderr);
  assert.equal(JSON.parse(normalStatus.stdout).status, "ready");
  const normalStopped = runLauncher(["stop"], { THERMOEYE_RUNTIME_DIR: runtime });
  assert.equal(normalStopped.status, 0, normalStopped.stdout + normalStopped.stderr);
  running = false;

  console.log("Local demo regression passed: missing runtime, network token guard, occupied port owner preservation, normal and offline Next + FastAPI startup, real ONNX inference, external-provider override, readiness metadata, and backend-down guidance.");
} finally {
  if (running) runLauncher(["stop"], { THERMOEYE_RUNTIME_DIR: runtime });
  await rm(work, { recursive: true, force: true });
}

function runLauncher(args, env = {}) {
  return spawnSync(process.execPath, [launcher, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 90000,
    windowsHide: true,
    env: { ...process.env, ...env },
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolvePromise));
  const port = server.address().port;
  await new Promise((resolvePromise) => server.close(resolvePromise));
  return port;
}

async function probeOwner(port) {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(port, "127.0.0.1");
    let response = "";
    socket.setTimeout(3000, () => socket.destroy(new Error("occupied port owner probe timed out")));
    socket.on("data", (chunk) => { response += chunk.toString(); });
    socket.once("end", () => resolvePromise(response));
    socket.once("error", reject);
  });
}

function startedModelVersion(output) {
  return output.match(/Model version: (.+)/)?.[1] ?? null;
}
