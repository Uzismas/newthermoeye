// Shared minimal CDP driver used by promo-claude tooling.
// Talks to a headless Chrome over the DevTools protocol using Node's built-in
// WebSocket/fetch (Node 24) — no npm dependencies required.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CHROME_BIN = process.env.CHROME_BIN
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";

export async function launchChrome({ width = 1920, height = 1080, extraArgs = [] } = {}) {
  const userDataDir = await mkdtemp(join(tmpdir(), "thermoeye-promo-"));
  const chrome = spawn(CHROME_BIN, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-lcd-text",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
    ...extraArgs,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let stderr = "";
  chrome.stderr.on("data", (c) => { stderr += c.toString(); });

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for Chrome DevTools URL.\n" + stderr)), 40000);
    const onData = (chunk) => {
      const m = chunk.toString().match(/ws:\/\/[^\s]+/);
      if (m) { clearTimeout(timer); chrome.stderr.off("data", onData); resolve(m[0]); }
    };
    chrome.stderr.on("data", onData);
  });

  const base = wsUrl.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "");

  // Wait for the HTTP endpoint to be queryable
  let targets = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      targets = await (await fetch(base + "/json/list")).json();
      if (Array.isArray(targets) && targets.length) break;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("No page target available.");

  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  return {
    base,
    cdp,
    async newTarget(url = "about:blank") {
      const res = await fetch(`${base}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
      const t = await res.json();
      const conn = await connect(t.webSocketDebuggerUrl);
      await conn.send("Page.enable");
      await conn.send("Runtime.enable");
      return conn;
    },
    async close() {
      try { cdp.ws.close(); } catch { /* ignore */ }
      try { chrome.kill(); } catch { /* ignore */ }
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error)})`));
      else resolve(msg.result);
      return;
    }
    if (msg.method && listeners.has(msg.method)) {
      for (const fn of listeners.get(msg.method)) fn(msg.params);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const myId = ++id;
    pending.set(myId, { resolve, reject });
    ws.send(JSON.stringify({ id: myId, method, params }));
  });

  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };

  const evaluate = async (expression, { awaitPromise = true } = {}) => {
    const res = await send("Runtime.evaluate", {
      expression, awaitPromise, returnByValue: true, allowUnsafeEvalBlockedByCSP: true,
    });
    if (res.exceptionDetails) {
      throw new Error("Eval failed: " + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
    }
    return res.result?.value;
  };

  const waitFor = async (expression, { timeout = 30000, interval = 150, label } = {}) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      let ok = false;
      try { ok = Boolean(await evaluate(expression)); } catch { ok = false; }
      if (ok) return true;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${label || expression}`);
      await new Promise((r) => setTimeout(r, interval));
    }
  };

  return { ws, send, on, evaluate, waitFor };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));