// Check hydration state of the login gate form.
import { launchChrome, sleep } from "./cdp.mjs";

const chrome = await launchChrome({ width: 1600, height: 1000 });
try {
  const page = await chrome.newTarget("about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.send("Page.navigate", { url: "http://127.0.0.1:3000/console/dashboard" });

  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const v = await page.evaluate(`
      JSON.stringify({
        t: ${i},
        hasForm: Boolean(document.querySelector("form.lg-form")),
        ready: document.querySelector("form.lg-form")?.getAttribute("data-ready"),
        btn: document.querySelector("form.lg-form button[type=submit]")?.disabled,
      })
    `);
    console.log(v);
    const p = JSON.parse(v);
    if (p.ready === "true") break;
  }
} finally {
  await chrome.close();
}
process.exit(0);