// Captures fresh, safety-reviewed screens from the REAL running app.
//
// Why: the archived web/feature-screenshots/*.png predate the research-only
// refactor and contain Alzheimer risk / disease-confidence content that must not
// appear in the promo. This drives the live app instead, uploading the real OCTA
// image through the real local ONNX pipeline, and captures what it actually shows.
//
// The app's own demo session cookie is set directly so capture does not depend on
// client hydration timing inside headless Chrome.
//
// Output: promo-claude/assets/app/*.png
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchChrome, sleep } from "./cdp.mjs";

const APP = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT = "D:/Themoeye/project/teng1/promo-claude/assets/app";
const OCTA = "D:/Themoeye/project/teng1/public/research/pipeline/real-octa-original.jpg";

const VW = 1600, VH = 1000;

await mkdir(OUT, { recursive: true });

const chrome = await launchChrome({ width: VW, height: VH + 120 });
const page = await chrome.newTarget("about:blank");
await page.send("DOM.enable");

// Every capture also records the visible text, so the safety checklist can be
// verified mechanically (no disease risk / confidence / patient identifiers).
const transcript = {};

const shot = async (name) => {
  const { data } = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  transcript[name] = await page.evaluate("document.body.innerText");
  console.log("captured:", name);
};

const goto = async (path, waitText) => {
  await page.send("Page.navigate", { url: APP + path });
  await page.waitFor(`document.body.innerText.includes(${JSON.stringify(waitText)})`, { timeout: 90000, interval: 300 });
};

// Navigate WITHOUT a full page load, so client state (the case we just measured
// through the real pipeline) survives. A full navigation resets the SPA back to
// the seeded fixtures, which would put synthetic data on screen instead of the
// real measurement.
const navTo = async (label, waitText) => {
  await page.evaluate(`
    (() => {
      const menu = document.querySelector("details.workspace-menu");
      if (menu) menu.open = true;
      const link = [...document.querySelectorAll("a.nav-item")]
        .find((a) => a.textContent.trim().includes(${JSON.stringify(label)}));
      if (!link) throw new Error("nav link not found: " + ${JSON.stringify(label)});
      link.click();
      return true;
    })()
  `);
  await page.waitFor(`document.body.innerText.includes(${JSON.stringify(waitText)})`, { timeout: 90000, interval: 300 });
};

try {
  await page.send("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });

  // ── Login screen (no session yet, so the gate is visible) ────────────────
  await page.send("Network.clearBrowserCookies");
  await goto("/console/dashboard", "Sign in to access your clinical console");
  await sleep(2500);
  await shot("01-login");

  // Establish the app's own demo session by running its real login endpoint,
  // then persist the resulting cookie at the browser level so it survives
  // full-page navigations during capture.
  const status = await page.evaluate(`
    (async () => {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }),
      });
      return r.status;
    })()
  `);
  console.log("session status:", status);
  await page.send("Network.setCookie", {
    name: "thermoeye_mock_session",
    value: "pilot-doctor",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
  });
  await sleep(400);

  // ── Dashboard ────────────────────────────────────────────────────────────
  await goto("/console/dashboard", "Research Workspace");
  await sleep(2000);
  await shot("02-dashboard");

  // ── Upload page ──────────────────────────────────────────────────────────
  await goto("/console/cases", "Case intake and upload");
  await sleep(1500);

  // Select the REAL OCTA file through the real file input. The bytes are pushed
  // over CDP (not a giant data: URI inside the page), which avoids fetch limits
  // and keeps the upload path identical to a real user's file picker.
  // DOM.setFileInputFiles already fires a genuine change event, so the app's own
  // React onChange runs — dispatching an extra synthetic one breaks the flow.
  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#scan-file" });
  if (!nodeId) throw new Error("File input #scan-file not found.");
  await page.send("DOM.setFileInputFiles", { nodeId, files: [OCTA] });
  await sleep(900);

  // Set a de-identified demo case code.
  await page.evaluate(`
    (() => {
      const code = document.querySelector("[name='caseCode']");
      if (code) code.value = "TE-DEMO-024";
      return true;
    })()
  `);
  await sleep(1200);
  await shot("03-upload-ready");

  // ── Run the REAL local ONNX pipeline through the real UI ─────────────────
  console.log("queueing real analysis (local ONNX)…");
  await page.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Queue secure screening"));
      if (!btn) throw new Error("queue button not found");
      btn.click();
      return true;
    })()
  `);

  // The app keeps cases in an in-memory store, so TE-DEMO-024 persists for the
  // life of the server process. A second run in the same process is rejected by
  // the app's own duplicate-id guard — restart `next start` before re-capturing.
  await page.waitFor(
    `document.body.innerText.includes("Analysis Result")
      || Boolean(document.querySelector(".form-error"))`,
    { timeout: 240000, interval: 500 },
  );
  const formError = await page.evaluate(`document.querySelector(".form-error")?.textContent?.trim() ?? null`);
  if (formError) {
    throw new Error(
      `The app rejected the upload: "${formError}"\n`
      + "TE-DEMO-024 already exists in this server process's in-memory store.\n"
      + "Restart the production server (npx next start --port 3000) and re-run.",
    );
  }
  await page.waitFor(
    `document.body.innerText.includes("Analysis Result") && !document.body.innerText.includes("Analyzing...")`,
    { timeout: 120000, interval: 400 },
  );
  await sleep(3000);

  const text = await page.evaluate("document.body.innerText");
  const density = /Vessel density proxy\s*\n?\s*([\d.]+)%/.exec(text);
  console.log("measured vessel density:", density ? density[1] + "%" : "NOT FOUND");
  if (!density) throw new Error("Analysis did not return a measured vessel density — refusing to capture a non-measured result.");

  await shot("04-analysis");

  // ── Report preview (in-app navigation keeps the measured case selected) ───
  await navTo("Reports", "Research report preview");
  await sleep(2500);
  await shot("05-report");

  // ── Review panel on the dashboard ────────────────────────────────────────
  await navTo("Dashboard", "Selected Case Review");
  await sleep(2000);
  await shot("06-review");

  // Confirm the report/review screens show OUR measured case, not a seed fixture.
  for (const key of ["05-report", "06-review"]) {
    const hasDemo = transcript[key].includes("TE-DEMO-024");
    console.log(`${key} shows TE-DEMO-024:`, hasDemo);
    if (!hasDemo) throw new Error(`${key} did not show the measured demo case.`);
  }

  await writeFile(join(OUT, "transcript.json"), JSON.stringify(transcript, null, 2), "utf8");
  console.log("done.");
} finally {
  await chrome.close();
}
process.exit(0);