// Debug: inspect the upload form state right before queueing, to find why the
// click handler sees no file.
import { launchChrome, sleep } from "./cdp.mjs";

const APP = "http://127.0.0.1:3000";
const OCTA = "D:/Themoeye/project/teng1/public/research/pipeline/real-octa-original.jpg";

const chrome = await launchChrome({ width: 1600, height: 1000 });
const page = await chrome.newTarget("about:blank");
try {
  await page.send("DOM.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

  await page.send("Page.navigate", { url: APP + "/console/dashboard" });
  await page.waitFor(`document.body.innerText.includes("Sign in")`, { timeout: 60000 });
  await page.send("Network.setCookie", { name: "thermoeye_mock_session", value: "pilot-doctor", domain: "127.0.0.1", path: "/", httpOnly: true });

  await page.send("Page.navigate", { url: APP + "/console/cases" });
  await page.waitFor(`document.body.innerText.includes("Case intake and upload")`, { timeout: 60000 });
  await sleep(2000);

  const before = await page.evaluate(`JSON.stringify({
    inputExists: Boolean(document.querySelector("#scan-file")),
    filesBefore: document.querySelector("#scan-file")?.files?.length ?? -1,
  })`);
  console.log("BEFORE setFileInputFiles:", before);

  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#scan-file" });
  console.log("nodeId:", nodeId);
  await page.send("DOM.setFileInputFiles", { nodeId, files: [OCTA] });
  await sleep(1000);

  const after = await page.evaluate(`JSON.stringify({
    filesAfter: document.querySelector("#scan-file")?.files?.length ?? -1,
    fileName: document.querySelector("#scan-file")?.files?.[0]?.name ?? null,
    fileSize: document.querySelector("#scan-file")?.files?.[0]?.size ?? null,
    fileType: document.querySelector("#scan-file")?.files?.[0]?.type ?? null,
    uploadState: document.querySelector(".upload-state")?.textContent?.trim() ?? null,
    dropzoneStrong: document.querySelector(".dropzone strong")?.textContent?.trim() ?? null,
  })`);
  console.log("AFTER setFileInputFiles:", after);

  // Try the form submit path the component actually wires up
  const result = await page.evaluate(`
    (async () => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Queue secure screening"));
      btn.click();
      await new Promise((r) => setTimeout(r, 2500));
      return JSON.stringify({
        err: document.querySelector(".form-error")?.textContent?.trim() ?? null,
        btnText: btn.textContent.trim(),
        anyAnalysis: document.body.innerText.includes("Analysis Result"),
      });
    })()
  `);
  console.log("AFTER click:", result);

  await sleep(4000);
  console.log("later:", await page.evaluate(`JSON.stringify({
    err: document.querySelector(".form-error")?.textContent?.trim() ?? null,
    anyAnalysis: document.body.innerText.includes("Analysis Result"),
    btn: (document.querySelector("button.primary-button.wide")?.textContent ?? "").trim(),
  })`));
} finally {
  await chrome.close();
}
process.exit(0);