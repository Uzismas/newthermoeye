import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000/console/dashboard";
const chromeBin = process.env.CHROME_BIN ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const userDataDir = `D:/Themoeye/project/teng1/tmp/senior-flow-${Date.now()}`;
const screenshotDir = "output/senior-flow";
const downloadDir = "D:/Themoeye/project/teng1/output/senior-flow-downloads";
let stderrBuffer = "";
let ws;

const chrome = spawnChrome();

chrome.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString();
});

try {
  await mkdir(screenshotDir, { recursive: true });
  await mkdir(downloadDir, { recursive: true });
  await waitForHttp(appUrl);

  const debugBaseUrl = await waitForDebugBaseUrl();
  const target = await createPageTarget(debugBaseUrl, appUrl);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  const cdp = createCdpClient(ws);

  const consoleErrors = [];
  const failedRequests = [];

  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });

  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
    }
  });
  cdp.on("Network.loadingFailed", (event) => {
    failedRequests.push(event.errorText);
  });
  cdp.on("Network.responseReceived", (event) => {
    const status = event.response.status;
    if (status >= 400 && !event.response.url.includes("/api/session") && !event.response.url.endsWith("/favicon.ico")) {
      failedRequests.push(`${status} ${event.response.url}`);
    }
  });

  await waitFor(cdp, `document.querySelector("form.lg-form")?.dataset.ready === "true"`);
  await capture(cdp, "01-login.png");
  await click(cdp, `button[type="submit"]`);
  await waitFor(cdp, `document.body.innerText.includes("Clinical Operations Dashboard") || document.body.innerText.includes("Selected Case Review")`);
  await capture(cdp, "02-dashboard.png");

  await waitFor(cdp, `Boolean(document.querySelector("form.review-form"))`);
  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = "30 days";
      form.elements.note.value = "Approved for release after senior QA test. Recommend cognitive screening correlation within 30 days.";
      form.requestSubmit();
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("Approved for release")`);
  await capture(cdp, "03-approved.png");

  await clickText(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Clinical report preview")`);
  await waitFor(cdp, `Boolean([...document.querySelectorAll("button")].find((item) => item.textContent.includes("Download PDF") && !item.disabled))`);
  await capture(cdp, "04-report.png");

  await clickText(cdp, "Download PDF");
  await sleep(1200);
  await clickText(cdp, "Data Management");
  await waitFor(cdp, `document.body.innerText.includes("Clinical PDF downloaded")`);
  await capture(cdp, "05-audit.png");

  if (consoleErrors.length) {
    throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
  }
  if (failedRequests.length) {
    throw new Error(`Network failures:\n${failedRequests.join("\n")}`);
  }

  console.log("Senior flow passed: login, review approval, report preview, PDF download audit");
  console.log(`Screenshots: ${screenshotDir}`);
  console.log(`Downloads: ${downloadDir}`);
} finally {
  ws?.close();
  killProcess(chrome);
}

function spawnChrome() {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  return spawn(chromeBin, args, { detached: false, stdio: ["ignore", "pipe", "pipe"] });
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
  throw new Error(`Timed out waiting for ${url}`);
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
  const response = await fetch(`${debugBaseUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Unable to create page target: ${response.status}`);
  return response.json();
}

function createCdpClient(socket) {
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) listener(message.params);
      return;
    }
    if (!message.id) return;
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
  });

  return {
    ready,
    on(method, callback) {
      const callbacks = listeners.get(method) ?? [];
      callbacks.push(callback);
      listeners.set(method, callbacks);
    },
    send(method, params = {}) {
      const requestId = ++id;
      const promise = new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
      });
      socket.send(JSON.stringify({ id: requestId, method, params }));
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
  const bodyText = await cdp.eval(`document.body?.innerText.slice(0, 1600) ?? ""`);
  throw new Error(`Timed out waiting for expression: ${expression}\n\nBody:\n${bodyText}`);
}

async function click(cdp, selector) {
  await cdp.eval(`
    (() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      if (!control) throw new Error(${JSON.stringify(`Control not found: ${selector}`)});
      control.click();
    })()
  `);
}

async function clickText(cdp, text) {
  await cdp.eval(`
    (() => {
      const control = [...document.querySelectorAll("button, a")].find((item) => item.textContent.includes(${JSON.stringify(text)}));
      if (!control) throw new Error(${JSON.stringify(`Control not found: ${text}`)});
      control.click();
    })()
  `);
}

async function capture(cdp, fileName) {
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`${screenshotDir}/${fileName}`, Buffer.from(screenshot.data, "base64"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcess(child) {
  try {
    child.kill("SIGTERM");
  } catch {}
}
