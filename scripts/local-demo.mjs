import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer, isIP } from "node:net";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(root, "backend");
const stateDir = process.env.THERMOEYE_RUNTIME_DIR?.trim() || join(os.tmpdir(), `thermoeye-local-demo-${createHash("sha256").update(root).digest("hex").slice(0, 12)}`);
const statePath = join(stateDir, "services.json");
const readinessPath = join(stateDir, "readiness.json");
const pythonPath = process.env.THERMOEYE_PYTHON?.trim() || join(backendDir, ".venv", "Scripts", "python.exe");
const nodeMajor = Number(process.versions.node.split(".")[0]);

main().then((code) => {
  if (Number.isInteger(code)) process.exitCode = code;
}).catch((error) => {
  console.error(`Local demo error: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const { action, options } = parseArgs(process.argv.slice(2));
  if (action === "help") return printHelp();
  if (action === "build") return build(options);
  if (action === "check") return check(options);
  if (action === "status") return status(options);
  if (action === "start") return start(options);
  if (action === "stop") return stop();
  throw new Error(`Unknown action '${action}'. Run scripts/local-demo.ps1 help.`);
}

function parseArgs(args) {
  const action = args[0] || "help";
  const options = { host: "127.0.0.1", port: 3000, backendPort: 8000, offline: false };
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--json") options.json = true;
    else if (flag === "--offline") options.offline = true;
    else if (flag === "--host" && value) { options.host = value; index += 1; }
    else if (flag === "--port" && value) { options.port = parsePort(value, flag); index += 1; }
    else if (flag === "--backend-port" && value) { options.backendPort = parsePort(value, flag); index += 1; }
    else throw new Error(`Unknown or incomplete option '${flag}'.`);
  }
  if (options.port === options.backendPort) throw new Error("Frontend and backend ports must differ.");
  return { action, options };
}

function parsePort(value, flag) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${flag} must be an integer from 1 to 65535.`);
  return port;
}

async function check(options, { requireBuild = false } = {}) {
  const checks = [];
  const host = validateHost(options.host);
  checks.push(host);
  if (nodeMajor !== 24) checks.push(fail("Node.js", `Found ${process.versions.node}; install/use Node 24 for the local regression and presentation runtime.`));
  else checks.push(pass("Node.js", process.versions.node));

  const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextCli)) checks.push(fail("Next.js", "Dependencies are missing. Restore node_modules from the reviewed package lock before going offline."));
  else checks.push(pass("Next.js", "installed from package-lock.json"));

  const python = inspectPython();
  checks.push(python.check);
  if (python.data) {
    for (const name of ["fastapi", "uvicorn", "onnxruntime", "PIL", "numpy", "multipart"]) {
      if (!python.data.modules[name]) checks.push(fail("Python packages", `${name} is missing from backend/.venv. Restore the reviewed local requirements before going offline.`));
    }
  }

  const model = inspectModel();
  checks.push(model.check);
  if (requireBuild && !existsSync(join(root, ".next", "BUILD_ID"))) checks.push(fail("Production build", "No .next/BUILD_ID found. Run scripts/local-demo.ps1 build before starting the presentation server."));
  else if (requireBuild) checks.push(pass("Production build", "prebuilt Next.js production output found"));

  for (const [name, port] of [["Frontend port", options.port], ["Backend port", options.backendPort]]) {
    const result = await probePort(port);
    checks.push(result.ok ? pass(name, `127.0.0.1:${port} is available`) : fail(name, `127.0.0.1:${port} is occupied. Stop the project-owned service using scripts/local-demo.ps1 stop or choose another port; the launcher will not terminate a port owner.`));
  }

  try {
    mkdirSync(stateDir, { recursive: true });
    const probe = join(stateDir, `.write-test-${randomBytes(6).toString("hex")}`);
    writeFileSync(probe, "", { flag: "wx" });
    rmSync(probe);
    checks.push(pass("Local state and logs", "runtime directory is writable"));
  } catch {
    checks.push(fail("Local state and logs", "Cannot write the local runtime directory. Check folder permissions; uploaded images and notes are never stored there."));
  }

  const failed = checks.filter((item) => !item.ok);
  const report = {
    status: failed.length ? "blocked" : "ready",
    checked_at: new Date().toISOString(),
    host: options.host,
    frontend_port: options.port,
    backend_port: options.backendPort,
    external_vision: "disabled by launcher",
    checks,
    model: model.data,
    python: python.data,
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Local demo preflight: ${report.status.toUpperCase()}`);
    for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
    if (model.data) console.log(`Model: ${model.data.model_version ?? "unavailable"}; SHA256 ${model.data.model_hash ?? "unavailable"}`);
    console.log("External vision: disabled by launcher");
  }
  return failed.length ? 1 : 0;
}

function inspectPython() {
  const code = [
    "import importlib.util, importlib.metadata, json, sys",
    "names = {'fastapi':'fastapi','uvicorn':'uvicorn','onnxruntime':'onnxruntime','PIL':'Pillow','numpy':'numpy','multipart':'python-multipart'}",
    "modules = {key: importlib.util.find_spec(key) is not None for key in names}",
    "versions = {key: (importlib.metadata.version(package) if modules[key] else None) for key, package in names.items()}",
    "print(json.dumps({'version': list(sys.version_info[:3]), 'modules': modules, 'versions': versions}))",
  ].join("; ");
  const result = spawnSync(pythonPath, ["-c", code], { cwd: backendDir, encoding: "utf8", timeout: 15000, windowsHide: true });
  if (result.error || result.status !== 0) return { check: fail("Python runtime", `Cannot run the project interpreter (${relative(pythonPath)}). Create/restore backend/.venv from the reviewed offline package set.`), data: null };
  try {
    const data = JSON.parse(result.stdout.trim());
    const version = data.version.join(".");
    if (data.version[0] !== 3 || data.version[1] < 10) return { check: fail("Python runtime", `Found ${version}; Python 3.10 or newer is required by the installed runtime.`), data };
    return { check: pass("Python runtime", `${version} at ${relative(pythonPath)}`), data };
  } catch {
    return { check: fail("Python runtime", "The project interpreter did not return a readable version. Repair backend/.venv."), data: null };
  }
}

function inspectModel() {
  const canonical = join(backendDir, "models", "octa", "octa_vessel_unet.onnx");
  const legacy = join(backendDir, "models", "octa_vessel_unet.onnx");
  const artifact = existsSync(canonical) ? canonical : existsSync(legacy) ? legacy : null;
  const cardPath = join(backendDir, "models", "octa", "model_card.json");
  if (!artifact) {
    const data = { status: "missing", engine: "onnx_vessel_unet", model_hash: null, model_version: null, artifact: "backend/models/octa/octa_vessel_unet.onnx", error: "Restore the reviewed ONNX artifact." };
    return { data, check: fail("ONNX model", "Artifact is missing. Restore backend/models/octa/octa_vessel_unet.onnx and run preflight again.") };
  }
  try {
    const digest = createHash("sha256").update(readFileSync(artifact)).digest("hex");
    const card = JSON.parse(readFileSync(cardPath, "utf8"));
    const data = {
      status: digest === card.artifact_sha256 ? "hash_verified" : "corrupt",
      engine: "onnx_vessel_unet", model_hash: digest,
      model_version: `octa-vessel-unet-sha256:${digest}`,
      artifact: relative(artifact), expected_hash: card.artifact_sha256 ?? null,
      task: card.model_task ?? "unknown", pipeline_version: "octa-measurement-2026.09.19",
      preprocessing_version: card.preprocessing_version ?? null,
      error: digest === card.artifact_sha256 ? null : "Artifact SHA256 does not match model_card.json.",
    };
    return digest === card.artifact_sha256
      ? { data, check: pass("ONNX model", `SHA256 ${digest}; model-card hash matches`) }
      : { data, check: fail("ONNX model", "Artifact hash mismatch. Restore the reviewed model artifact and matching model card.") };
  } catch {
    const data = { status: "corrupt", engine: "onnx_vessel_unet", model_hash: null, model_version: null, artifact: relative(artifact), error: "Model card is unreadable." };
    return { data, check: fail("ONNX model", "Could not read artifact or model_card.json. Restore the reviewed pair.") };
  }
}

function validateHost(host) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  const loopback = normalized === "localhost" || (isIP(normalized) === 4 && normalized.startsWith("127.")) || normalized === "::1";
  if (normalized !== "localhost" && isIP(normalized) === 0) return fail("Bind address", "Use an IP address or localhost for the bind host.");
  if (loopback) return pass("Bind address", `${host} (loopback)`);
  const token = process.env.THERMOEYE_SESSION_TOKEN;
  if (!token || token === "pilot-doctor" || token.length < 32) return fail("Bind address", "Network-accessible binding requires THERMOEYE_SESSION_TOKEN with at least 32 characters and a value other than the prototype default.");
  return pass("Bind address", `${host} (non-default session token present)`);
}

async function start(options) {
  const existing = await readState();
  if (existing) {
    const active = await activeProcesses(existing);
    if (active.length) throw new Error(`A launcher-owned service is already running (PID ${active.map((item) => item.pid).join(", ")}). Run scripts/local-demo.ps1 status or stop first.`);
    rmSync(statePath, { force: true });
  }

  const result = await check(options, { requireBuild: true });
  if (result !== 0) throw new Error("Preflight failed. Resolve the reported items before starting services.");

  const env = {
    ...process.env,
    NODE_ENV: "production",
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? "",
    NEXT_TELEMETRY_DISABLED: "1",
    OCTA_SEGMENTATION_ENGINE: "onnx_vessel_unet",
    THERMOEYE_ALLOW_EXTERNAL_VISION: "false",
    ANTHROPIC_API_KEY: "",
    GOOGLE_API_KEY: "",
    THERMOEYE_LOCAL_INFERENCE_URL: `http://127.0.0.1:${options.backendPort}`,
    THERMOEYE_DEMO_HOST: options.host,
  };
  if (options.offline) {
    const guard = join(root, "scripts", "offline-guard");
    env.NODE_OPTIONS = [env.NODE_OPTIONS, `--import="${pathToFileURL(join(guard, "offline-network-guard.mjs")).href}"`].filter(Boolean).join(" ");
    env.PYTHONPATH = [guard, env.PYTHONPATH].filter(Boolean).join(process.platform === "win32" ? ";" : ":");
  }
  const state = { started_at: new Date().toISOString(), host: options.host, port: options.port, backend_port: options.backendPort, processes: [] };
  mkdirSync(stateDir, { recursive: true });
  let backend;
  let frontend;
  try {
    backend = await launch("backend", pythonPath, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(options.backendPort)], backendDir, env);
    state.processes.push(backend.record);
    await saveState(state);
    await waitFor(`http://127.0.0.1:${options.backendPort}/health`, backend.child, "FastAPI backend");
    const backendReady = await fetchJson(`http://127.0.0.1:${options.backendPort}/readiness`);
    if (backendReady.model?.status !== "ready") console.error(`Backend readiness is degraded: ${backendReady.model?.error || "ONNX model is not ready."}`);

    const frontendCli = join(root, "node_modules", "next", "dist", "bin", "next");
    frontend = await launch("frontend", process.execPath, [frontendCli, "start", "--hostname", options.host, "--port", String(options.port)], root, env);
    state.processes.push(frontend.record);
    await saveState(state);
    await waitFor(urlFor(options.host, options.port, "/login"), frontend.child, "Next.js frontend");

    const summary = await collectStatus(state);
    await saveJson(readinessPath, summary);
    console.log(`${summary.status === "ready" ? "Local demo is ready" : "Local demo started with degraded readiness"} at ${urlFor(options.host, options.port, "/login")}`);
    console.log(`Backend: ${summary.backend.status}; ONNX: ${summary.model.status}; engine ${summary.model.engine}`);
    console.log(`Model version: ${summary.model.model_version}`);
    console.log(`Model SHA256: ${summary.model.model_hash}`);
    console.log(`External vision: ${env.THERMOEYE_ALLOW_EXTERNAL_VISION}; runtime files: ${stateDir}`);
    console.log("Stop only these services with scripts/local-demo.ps1 stop.");
  } catch (error) {
    await stopRecords(state.processes, { quiet: true });
    rmSync(statePath, { force: true });
    throw new Error(`${error.message} See ${relative(join(stateDir, "backend.log"))} and ${relative(join(stateDir, "frontend.log"))}; logs do not contain uploaded bodies or review notes.`);
  }
}

async function launch(kind, command, args, cwd, env) {
  mkdirSync(stateDir, { recursive: true });
  const logPath = join(stateDir, `${kind}.log`);
  const descriptor = openSync(logPath, "a");
  let child;
  let spawnError;
  try {
    child = spawn(command, args, { cwd, env, windowsHide: true, detached: true, stdio: ["ignore", descriptor, descriptor] });
    child.on("error", (error) => { spawnError = error; });
  } finally {
    closeSync(descriptor);
  }
  child.unref();
  const marker = kind === "backend"
    ? [pythonPath.replaceAll("\\", "/"), "uvicorn", "app.main:app"]
    : [join(root, "node_modules", "next", "dist", "bin", "next").replaceAll("\\", "/"), "start"];
  const executablePath = kind === "backend" ? pythonPath : process.execPath;
  const record = { kind, pid: child.pid, executable_path: executablePath, marker, log: relative(logPath) };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (spawnError) throw new Error(`Could not start the ${kind} runtime: ${spawnError.message}`);
    const details = await processDetails(record.pid);
    if (matchesRecord(record, details)) {
      record.created_at = details.createdAt;
      return { child, record };
    }
    if (child.exitCode !== null) throw new Error(`${kind} exited before its process identity was recorded.`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  child.kill();
  throw new Error(`Could not verify the ${kind} process identity; it will not be registered for later shutdown.`);
}

async function waitFor(url, child, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`${label} exited during startup. Check its log.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok || response.status === 503) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`${label} did not become ready at ${url}. Check its log and confirm the port is free.`);
}

async function status(options) {
  const state = await readState();
  const summary = await collectStatus(state ?? { host: options.host, port: options.port, backend_port: options.backendPort, processes: [] });
  await saveJson(readinessPath, summary);
  console.log(JSON.stringify(summary, null, 2));
  return summary.frontend.status === "ready" && summary.backend.status === "ready" && summary.model.status === "ready" ? 0 : 1;
}

async function collectStatus(state) {
  const frontendUrl = urlFor(state.host, state.port, "/login");
  let frontend = { status: "down", url: frontendUrl, error: `Next.js is not responding. Run scripts/local-demo.ps1 start --port ${state.port}.` };
  try {
    const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(1500) });
    frontend = { status: response.ok ? "ready" : "degraded", url: frontendUrl, http_status: response.status, error: response.ok ? null : "Frontend responded with an unexpected status." };
  } catch {}

  const backendUrl = `http://127.0.0.1:${state.backend_port}`;
  let backend = { status: "down", url: backendUrl, error: `FastAPI is not responding. Run scripts/local-demo.ps1 start --backend-port ${state.backend_port}.` };
  let model = inspectModel().data;
  let pipeline = null;
  try {
    const health = await fetchJson(`${backendUrl}/health`);
    const readinessResponse = await fetch(`${backendUrl}/readiness`, { signal: AbortSignal.timeout(3000) });
    const readiness = await readinessResponse.json();
    backend = { status: "ready", url: backendUrl, service: health.service, error: null };
    model = readiness.model;
    pipeline = { version: readiness.pipeline_version, preprocessing: readiness.preprocessing_version };
  } catch {
    backend = { status: "down", url: backendUrl, error: `FastAPI is unavailable at ${backendUrl}. Start the launcher or inspect the backend log under ${stateDir}.` };
  }
  return {
    status: frontend.status === "ready" && backend.status === "ready" && model.status === "ready" ? "ready" : "degraded",
    checked_at: new Date().toISOString(),
    host: state.host, frontend_port: state.port, backend_port: state.backend_port,
    frontend, backend, engine: model.engine, model, pipeline,
    external_vision: "disabled",
    processes: state.processes?.map(({ kind, pid }) => ({ kind, pid })) ?? [],
    logs: { frontend: join(stateDir, "frontend.log"), backend: join(stateDir, "backend.log") },
  };
}

async function stop() {
  const state = await readState();
  if (!state) {
    console.log("No launcher state file exists; no process was signalled.");
    return 0;
  }
  const results = await stopRecords(state.processes);
  if (results.every((item) => item.stopped || item.absent)) {
    rmSync(statePath, { force: true });
    console.log("Stopped launcher-owned frontend and backend processes.");
    return 0;
  }
  console.error(`Some recorded PIDs did not match their launcher identity and were left untouched. Review ${statePath} before retrying.`);
  return 1;
}

async function stopRecords(records, { quiet = false } = {}) {
  const results = [];
  for (const record of [...records].reverse()) {
    const details = await processDetails(record.pid);
    if (!details) {
      results.push({ absent: true });
      continue;
    }
    if (details.createdAt !== record.created_at || !matchesRecord(record, details)) {
      results.push({ stopped: false, pid: record.pid });
      if (!quiet) console.error(`PID ${record.pid} no longer matches the recorded ${record.kind} command; left it untouched.`);
      continue;
    }
    const stopped = stopVerifiedPid(record.pid);
    results.push({ stopped, pid: record.pid });
    if (!stopped && !quiet) console.error(`Could not stop launcher-owned ${record.kind} PID ${record.pid}.`);
  }
  return results;
}

async function activeProcesses(state) {
  const active = [];
  for (const record of state.processes ?? []) {
    const details = await processDetails(record.pid);
    if (!details) continue;
    if (details.createdAt === record.created_at && matchesRecord(record, details)) active.push(record);
  }
  return active;
}

async function processDetails(pid) {
  if (!Number.isInteger(pid) || pid < 1) return null;
  if (process.platform === "win32") {
    const script = `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { $p | Select-Object @{n='ExecutablePath';e={$_.Path}},@{n='CreatedAt';e={$_.StartTime.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress }`;
    const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 10000, windowsHide: true });
    if (result.status !== 0 || !result.stdout.trim()) return null;
    try { const value = JSON.parse(result.stdout); return { executablePath: value.ExecutablePath, createdAt: value.CreatedAt }; } catch { return null; }
  }
  const result = spawnSync("ps", ["-p", String(pid), "-o", "lstart=,args="], { encoding: "utf8", timeout: 5000 });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  const line = result.stdout.trim();
  return { commandLine: line, executablePath: null, createdAt: line.split(/\s{2,}/)[0] };
}

function matchesRecord(record, details) {
  if (!details) return false;
  if (process.platform === "win32") {
    if (!details.executablePath) return false;
    return resolve(details.executablePath).toLowerCase() === resolve(record.executable_path).toLowerCase();
  }
  const normalized = details.commandLine.toLowerCase().replaceAll("\\", "/");
  return record.marker.every((part) => normalized.includes(part.toLowerCase()));
}

function stopVerifiedPid(pid) {
  if (process.platform === "win32") {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Stop-Process -Id ${pid} -Force -ErrorAction Stop`], { encoding: "utf8", timeout: 15000, windowsHide: true });
    return result.status === 0;
  }
  try { process.kill(-pid, "SIGTERM"); return true; }
  catch { try { process.kill(pid, "SIGTERM"); return true; } catch { return false; } }
}

async function readState() {
  if (!existsSync(statePath)) return null;
  try { return JSON.parse(readFileSync(statePath, "utf8")); }
  catch { throw new Error(`The launcher state file at ${statePath} is unreadable. Inspect it manually; no process will be signalled.`); }
}

async function saveState(state) {
  await saveJson(statePath, state);
}

async function saveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function build(options) {
  const env = { ...process.env, npm_config_offline: "true", NEXT_TELEMETRY_DISABLED: "1", THERMOEYE_ALLOW_EXTERNAL_VISION: "false", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "" };
  if (options.offline) {
    const guard = join(root, "scripts", "offline-guard");
    env.NODE_OPTIONS = [env.NODE_OPTIONS, `--import="${pathToFileURL(join(guard, "offline-network-guard.mjs")).href}"`].filter(Boolean).join(" ");
  }
  console.log("Building the prebuilt Next.js app with npm offline mode and external vision disabled...");
  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm run build"], { cwd: root, env, stdio: "inherit", windowsHide: true, timeout: 15 * 60 * 1000 })
    : spawnSync("npm", ["run", "build"], { cwd: root, env, stdio: "inherit", timeout: 15 * 60 * 1000 });
  if (result.error) throw new Error(`Build could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error("Production build failed. Check Node 24, the local package lock/install, and build output.");
  console.log(`Production build completed without package downloads${options.offline ? " or non-loopback TCP connections" : ""}.`);
}

async function probePort(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => resolvePromise({ ok: false }));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(() => resolvePromise({ ok: true })));
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

function urlFor(host, port, path) {
  const printableHost = host.includes(":") ? `[${host.replace(/^\[|\]$/g, "")}]` : host;
  return `http://${printableHost}:${port}${path}`;
}

function pass(name, detail) { return { ok: true, name, detail }; }
function fail(name, detail) { return { ok: false, name, detail }; }
function relative(path) { return path.startsWith(root) ? path.slice(root.length + 1) : path; }

function printHelp() {
  console.log(`Thermoeye local demo commands:
  scripts/local-demo.ps1 build [--offline]
  scripts/local-demo.ps1 check [--host HOST] [--port PORT] [--backend-port PORT]
  scripts/local-demo.ps1 start [--offline] [--host HOST] [--port PORT] [--backend-port PORT]
  scripts/local-demo.ps1 status [--host HOST] [--port PORT] [--backend-port PORT]
  scripts/local-demo.ps1 stop

Defaults bind the frontend and backend to loopback. Network binding requires a non-default
THERMOEYE_SESSION_TOKEN of at least 32 characters. External vision is always disabled by this launcher.`);
}
