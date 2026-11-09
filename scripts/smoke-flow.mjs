import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { startInferenceFixture } from "./integration-fixture.mjs";

const appPort = Number(process.env.APP_PORT ?? 3010);
const appUrl = process.env.APP_URL ?? `http://127.0.0.1:${appPort}/console/dashboard`;
const nextCli = "node_modules/next/dist/bin/next";
const chromeBin = process.env.CHROME_BIN ?? (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : "google-chrome");
const userDataDir = join(tmpdir(), `thermoeye-smoke-${Date.now()}`);
const screenshotPath = "output/playwright/thermoeye-smoke.png";
let stderrBuffer = "";
let serverOutput = "";
let ws;
const fixture = await startInferenceFixture();

const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(appPort)],
  { detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"], env: fixture.env },
);

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

const chrome = spawn(
  chromeBin,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] },
);

chrome.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString();
});
chrome.stdout.on("data", () => {});

try {
  await waitForHttp(appUrl);
  const debugBaseUrl = await waitForDebugBaseUrl();
  const target = await createPageTarget(debugBaseUrl, appUrl);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  const cdp = createCdpClient(ws);

  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await waitFor(cdp, `Boolean(document.querySelector("form.lg-form, form.login-form"))`);
  await waitFor(cdp, `document.querySelector("form.lg-form, form.login-form")?.dataset.ready === "true"`);
  await waitFor(cdp, `document.querySelector("form.lg-form button[type='submit'], form.login-form button[type='submit']")?.disabled === false`);

  await sleep(600);
  await submitLogin(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Retinal vessel review run")`);

  await clickButton(cdp, "Queue new scan");
  await waitFor(cdp, `document.body.innerText.includes("Case intake and upload")`);
  await cdp.eval(`
    (async () => {
      const input = document.querySelector("#scan-file");
      document.querySelector("[name='caseCode']").value = "TE-SMOKE-FIRST";
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(160, 160, 12, 160, 160, 152);
      gradient.addColorStop(0, "#effaf4");
      gradient.addColorStop(0.42, "#59b89f");
      gradient.addColorStop(1, "#092d36");
      ctx.fillStyle = "#0f2430";
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(160, 160, 136, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f8fff9";
      ctx.lineWidth = 5;
      for (let index = 0; index < 9; index += 1) {
        ctx.beginPath();
        ctx.moveTo(38, 60 + index * 24);
        ctx.bezierCurveTo(96, 108 + index * 7, 190, 88 + index * 18, 286, 66 + index * 20);
        ctx.stroke();
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "first-octa.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("first-octa.png selected")`);
  await clickButton(cdp, "Queue secure screening");
  await waitFor(cdp, `document.body.innerText.includes("Analysis Result") && document.body.innerText.includes("TE-SMOKE-FIRST")`);
  await waitFor(cdp, `document.body.innerText.includes("first-octa.png") && document.body.innerText.includes("16%")`);
  assert.equal(await cdp.eval(`document.body.innerText.includes("Disease risk: N/A")`), true);
  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Selected Case Review")`);

  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = "30 days";
      form.elements.note.value = "Research measurements reviewed; no clinical diagnosis is made.";
      form.requestSubmit();
    })()
  `);
  await waitFor(cdp, `(async () => (await (await fetch("/api/cases/TE-SMOKE-FIRST/review")).json()).review.decision === "Approved for release")()`);

  await clickButton(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Eyezheimer research measurement report") && document.body.innerText.includes("TE-SMOKE-FIRST") && document.body.innerText.includes("16%")`);
  await waitFor(cdp, `
    (() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Download PDF"));
      return Boolean(button && !button.disabled);
    })()
  `);

  await clickButton(cdp, "Download PDF");
  await clickButton(cdp, "Data Management");
  await waitFor(cdp, `document.body.innerText.includes("Research PDF downloaded")`);

  // A second upload must replace the selection and keep its own measurement in the report.
  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Retinal vessel review run")`);
  await clickButton(cdp, "Queue new scan");
  await waitFor(cdp, `Boolean(document.querySelector("#scan-file"))`);
  await cdp.eval(`(async () => {
    document.querySelector("[name='caseCode']").value = "TE-SMOKE-SECOND";
    const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 320;
    canvas.getContext("2d").fillRect(0, 0, 320, 320);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const transfer = new DataTransfer(); transfer.items.add(new File([blob], "second-octa.png", { type: "image/png" }));
    const input = document.querySelector("#scan-file"); input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await clickButton(cdp, "Queue secure screening");
  await waitFor(cdp, `document.body.innerText.includes("Analysis Result") && document.body.innerText.includes("TE-SMOKE-SECOND") && document.body.innerText.includes("42%")`);
  const pair = await cdp.eval(`(async () => Promise.all(["TE-SMOKE-FIRST", "TE-SMOKE-SECOND"].map(async (id) => (await (await fetch("/api/cases/" + id + "/report/preview")).json()).caseRecord.analysisMetrics.vesselDensity)))()`);
  assert.deepEqual(pair, [16, 42], "separate uploads keep separate report measurements");
  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Selected Case Review") && document.body.innerText.includes("TE-SMOKE-SECOND")`);
  await clickButton(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Eyezheimer research measurement report") && document.body.innerText.includes("TE-SMOKE-SECOND") && document.body.innerText.includes("42%")`);
  assert.equal(await cdp.eval(`[...document.querySelectorAll("button")].find((item) => item.textContent.includes("Download PDF"))?.disabled`), true, "new case review must not inherit previous approval");

  await mkdir("output/playwright", { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  console.log(`Smoke flow passed: two isolated fixture uploads -> selected measurements -> research review/report -> audit. No external providers.`);
  console.log(`Screenshot: ${screenshotPath}`);
} finally {
  ws?.close();
  killProcessGroup(chrome);
  killProcessGroup(server);
  await fixture.close();
}

async function waitForHttp(url) {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for app server ${url}\n${serverOutput}`);
}

async function waitForDebugBaseUrl() {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const match = stderrBuffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match?.[1]) {
      const url = new URL(match[1]);
      return `http://${url.host}`;
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for Chrome DevTools WebSocket URL");
}

async function createPageTarget(debugBaseUrl, url) {
  const response = await fetch(`${debugBaseUrl}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Unable to create page target: ${response.status}`);
  }
  return response.json();
}

function createCdpClient(ws) {
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(message.error.message));
    } else {
      handlers.resolve(message.result);
    }
  });

  return {
    ready,
    send(method, params = {}) {
      const requestId = ++id;
      const promise = new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
      });
      ws.send(JSON.stringify({ id: requestId, method, params }));
      return promise;
    },
    async eval(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      }
      return result.result.value;
    },
  };
}

async function waitFor(cdp, expression) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    try {
      if (await cdp.eval(expression)) return;
    } catch {}
    await sleep(150);
  }
  const bodyText = await cdp.eval(`document.body?.innerText.slice(0, 1200) ?? ""`);
  throw new Error(`Timed out waiting for expression: ${expression}\n\nBody:\n${bodyText}`);
}

async function clickButton(cdp, text) {
  await cdp.eval(`
    (() => {
      const control = [...document.querySelectorAll("button, a")].find((item) => item.textContent.includes(${JSON.stringify(text)}));
      if (!control) throw new Error("Control not found: ${text}");
      control.click();
    })()
  `);
}

async function submitLogin(cdp) {
  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.lg-form, form.login-form");
      if (!form) throw new Error("Login form not found");
      form.requestSubmit();
    })()
  `);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}
