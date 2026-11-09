// Mirror capture-app.mjs exactly, but print page state during the analysis wait.
import { launchChrome, sleep } from "./cdp.mjs";

const APP = "http://127.0.0.1:3000";
const OCTA = "D:/Themoeye/project/teng1/public/research/pipeline/real-octa-original.jpg";

const chrome = await launchChrome({ width: 1600, height: 1000 });
const page = await chrome.newTarget("about:blank");
try {
  await page.send("DOM.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  page.on("Runtime.exceptionThrown", (p) => console.log("[exception]", (p.exceptionDetails?.exception?.description || "").slice(0, 400)));
  page.on("Runtime.consoleAPICalled", (p) => console.log(`[${p.type}]`, p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 250)));

  await page.send("Page.navigate", { url: APP + "/console/dashboard" });
  await page.waitFor(`document.body.innerText.includes("Sign in")`, { timeout: 60000 });
  await page.send("Network.setCookie", { name: "thermoeye_mock_session", value: "pilot-doctor", domain: "127.0.0.1", path: "/", httpOnly: true });

  await page.send("Page.navigate", { url: APP + "/console/cases" });
  await page.waitFor(`document.body.innerText.includes("Case intake and upload")`, { timeout: 60000 });
  await sleep(1500);

  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#scan-file" });
  await page.send("DOM.setFileInputFiles", { nodeId, files: [OCTA] });
  await sleep(900);

  await page.evaluate(`(() => { const c = document.querySelector("[name='caseCode']"); if (c) c.value = "TE-DEMO-024"; return true; })()`);
  await sleep(1200);

  console.log("clicking…");
  const clicked = await page.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Queue secure screening"));
      if (!btn) return "NO BUTTON";
      const wasDisabled = btn.disabled;
      btn.click();
      return "clicked disabled=" + wasDisabled;
    })()
  `);
  console.log("click result:", clicked);

  for (let i = 0; i < 24; i++) {
    await sleep(2000);
    const info = await page.evaluate(`JSON.stringify({
      analysisResult: document.body.innerText.includes("Analysis Result"),
      analyzing: document.body.innerText.includes("Analyzing..."),
      err: document.querySelector(".form-error")?.textContent?.trim() ?? null,
      queueBtn: [...document.querySelectorAll("button")].map(b=>b.textContent.trim()).filter(t=>t.includes("Queue")||t.includes("Analyzing"))[0] ?? null,
      head: document.body.innerText.replace(/\\s+/g," ").slice(0,180),
    })`);
    const p = JSON.parse(info);
    console.log(`t=${i} result=${p.analysisResult} analyzing=${p.analyzing} err=${p.err} btn="${p.queueBtn}"`);
    if (p.analysisResult) { console.log("HEAD:", p.head); break; }
    if (i === 5) console.log("  (still waiting…) head:", p.head);
  }
} finally {
  await chrome.close();
}
process.exit(0);