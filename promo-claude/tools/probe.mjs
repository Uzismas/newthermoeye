// Probe Chrome's built-in video-encoding capabilities (no ffmpeg / Remotion present).
// Read-only investigation: reports what the installed Chrome can encode.
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PAGE = "file:///D:/Themoeye/project/teng1/promo-claude/tools/probe.html";

const userDataDir = await mkdtemp(join(tmpdir(), "thermoeye-probe-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--remote-debugging-port=0",
  `--user-data-dir=${userDataDir}`,
  "--autoplay-policy=no-user-gesture-required",
  PAGE,
], { stdio: ["ignore", "pipe", "pipe"] });

let stderr = "";
chrome.stderr.on("data", (c) => { stderr += c.toString(); });

const wsUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("timeout waiting for DevTools URL\n" + stderr)), 30000);
  stderr += "";
  chrome.stderr.on("data", (chunk) => {
    const m = chunk.toString().match(/ws:\/\/[^\s]+/);
    if (m) { clearTimeout(timer); resolve(m[0]); }
  });
});

// Find the page target
const browserBase = wsUrl.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "");
const targets = await (await fetch(browserBase + "/json/list")).json();
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("no page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) => new Promise((resolve) => {
  const myId = ++id;
  pending.set(myId, resolve);
  ws.send(JSON.stringify({ id: myId, method, params }));
});

await send("Runtime.enable");
await new Promise((r) => setTimeout(r, 800));
const res = await send("Runtime.evaluate", {
  expression: "JSON.stringify(window.__probe)",
  returnByValue: true,
});
console.log("PROBE:", res.result?.result?.value ?? JSON.stringify(res));

// Also report Chrome version
const ver = await send("Browser.getVersion");
console.log("VERSION:", ver.result?.product, "|", ver.result?.jsVersion);

ws.close();
chrome.kill();
process.exit(0);