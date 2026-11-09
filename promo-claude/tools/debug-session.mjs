// Debug: check cookie persistence and what the console shell does with it.
import { launchChrome, sleep } from "./cdp.mjs";

const APP = "http://127.0.0.1:3000";
const chrome = await launchChrome({ width: 1600, height: 1000 });
try {
  const page = await chrome.newTarget("about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  page.on("Runtime.exceptionThrown", (p) => console.log("[exception]", p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  page.on("Runtime.consoleAPICalled", (p) => console.log("[console]", p.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300)));

  await page.send("Page.navigate", { url: APP + "/console/dashboard" });
  await sleep(3000);

  const set = await page.send("Network.setCookie", {
    name: "thermoeye_mock_session", value: "pilot-doctor", domain: "127.0.0.1", path: "/", httpOnly: true,
  });
  console.log("setCookie:", JSON.stringify(set));

  const cookies = await page.send("Network.getCookies", { urls: [APP] });
  console.log("cookies:", JSON.stringify(cookies.cookies.map((c) => `${c.name}=${c.value} domain=${c.domain}`)));

  // Does the API accept the session now?
  const apiStatus = await page.evaluate(`(async () => (await fetch("/api/session")).status)()`);
  console.log("GET /api/session status:", apiStatus);

  await page.send("Page.reload", { ignoreCache: true });
  await sleep(6000);

  const info = await page.evaluate(`JSON.stringify({
    url: location.href,
    hasShell: Boolean(document.querySelector(".app-shell")),
    hasLogin: Boolean(document.querySelector(".lg-root")),
    textHead: document.body.innerText.slice(0, 300),
  })`);
  console.log("AFTER RELOAD:", info);
} finally {
  await chrome.close();
}
process.exit(0);