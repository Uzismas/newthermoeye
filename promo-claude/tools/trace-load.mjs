// Trace every network request + all console output during a console page load,
// to find out why React effects never run in headless Chrome.
import { launchChrome, sleep } from "./cdp.mjs";

const APP = "http://127.0.0.1:3000";
const chrome = await launchChrome({ width: 1600, height: 1000 });
try {
  const page = await chrome.newTarget("about:blank");
  await page.send("Network.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

  const requests = [];
  page.on("Network.requestWillBeSent", (p) => {
    const u = p.request.url;
    if (u.startsWith("http://127.0.0.1:3000") || u.startsWith("http://localhost")) requests.push(`${p.request.method} ${u.replace(APP, "")}`);
  });
  page.on("Network.loadingFailed", (p) => console.log("[netfail]", p.errorText, p.type));
  page.on("Network.responseReceived", (p) => {
    if (p.response.status >= 400 && p.response.url.includes("127.0.0.1:3000")) {
      console.log("[http]", p.response.status, p.response.url.replace(APP, ""));
    }
  });
  page.on("Runtime.exceptionThrown", (p) => console.log("[exception]", (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "").slice(0, 500)));
  page.on("Runtime.consoleAPICalled", (p) => {
    const msg = p.args.map((a) => a.value ?? a.description ?? JSON.stringify(a.preview ?? {})).join(" ");
    console.log(`[${p.type}]`, msg.slice(0, 400));
    if (p.type === "error" && p.stackTrace) {
      console.log("   stack:", p.stackTrace.callFrames.slice(0, 3).map((f) => `${f.functionName}@${f.url}:${f.lineNumber}`).join(" | "));
    }
  });

  await page.send("Page.navigate", { url: APP + "/console/dashboard" });
  await sleep(10000);

  console.log("\n--- requests ---");
  for (const r of requests) console.log(r);

  const state = await page.evaluate(`JSON.stringify({
    ready: document.querySelector("form.lg-form")?.getAttribute("data-ready"),
    title: document.title,
    scripts: [...document.querySelectorAll("script[src]")].length,
  })`);
  console.log("\nstate:", state);
} finally {
  await chrome.close();
}
process.exit(0);