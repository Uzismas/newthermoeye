// Debug: after queueing analysis, dump the page text over time to see what state
// the UI actually reaches (the analysis succeeded server-side per backend logs).
import { launchChrome, sleep } from "./cdp.mjs";

const APP = "http://127.0.0.1:3000";
const OCTA = "D:/Themoeye/project/teng1/public/research/pipeline/real-octa-original.jpg";

const chrome = await launchChrome({ width: 1600, height: 1000 });
const page = await chrome.newTarget("about:blank");
try {
  await page.send("DOM.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  page.on("Runtime.exceptionThrown", (p) => console.log("[exception]", (p.exceptionDetails?.exception?.description || "").slice(0, 300)));
  page.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error" || p.type === "warning") {
      console.log(`[${p.type}]`, p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
    }
  });

  await page.send("Page.navigate", { url: APP + "/console/dashboard" });
  await page.waitFor(`document.body.innerText.includes("Sign in")`, { timeout: 60000 });
  await page.send("Network.setCookie", { name: "thermoeye_mock_session", value: "pilot-doctor", domain: "127.0.0.1", path: "/", httpOnly: true });

  await page.send("Page.navigate", { url: APP + "/console/cases" });
  await page.waitFor(`document.body.innerText.includes("Case intake and upload")`, { timeout: 60000 });
  await sleep(1500);

  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#scan-file" });
  await page.send("DOM.setFileInputFiles", { nodeId, files: [OCTA] });
  await sleep(600);
  await page.evaluate(`
    (() => {
      const code = document.querySelector("[name='caseCode']");
      if (code) code.value = "TE-DEMO-024";
      document.querySelector("#scan-file").dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `);
  await sleep(1200);

  console.log("clicking queue…");
  await page.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Queue secure screening"));
      if (!btn) throw new Error("no queue button");
      console.log("queue btn disabled=" + btn.disabled);
      btn.click();
      return true;
    })()
  `);

  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const info = await page.evaluate(`JSON.stringify({
      hasAnalysis: document.body.innerText.includes("Analysis Result"),
      hasAnalyzing: document.body.innerText.includes("Analyzing..."),
      analyzing: (document.querySelector("button.primary-button.wide")?.textContent ?? "").trim(),
      head: document.body.innerText.replace(/\\s+/g, " ").slice(0, 260),
    })`);
    const p = JSON.parse(info);
    console.log(`t=${i} analysis=${p.hasAnalysis} analyzing=${p.hasAnalyzing} btn="${p.analyzing}"`);
    if (p.hasAnalysis) { console.log("TEXT:", p.head); break; }
  }
} finally {
  await chrome.close();
}
process.exit(0);