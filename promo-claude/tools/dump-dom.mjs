// Dump the DOM of a console route so we can see what the client actually renders.
import { launchChrome, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:3000/console/dashboard";
const chrome = await launchChrome({ width: 1600, height: 1000 });
try {
  const page = await chrome.newTarget("about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  page.on("Runtime.consoleAPICalled", (p) => {
    console.log("[console]", p.args.map((a) => a.value ?? a.description).join(" "));
  });
  page.on("Runtime.exceptionThrown", (p) => {
    console.log("[exception]", p.exceptionDetails?.exception?.description || p.exceptionDetails?.text);
  });

  await page.send("Page.navigate", { url });
  await sleep(9000);

  const info = await page.evaluate(`
    JSON.stringify({
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      bodyClasses: document.body.className,
      forms: [...document.querySelectorAll("form")].map(f => f.className),
      loginGate: Boolean(document.querySelector(".lg-root")),
      consoleShell: Boolean(document.querySelector(".app-shell")),
      textHead: document.body.innerText.slice(0, 600),
      rootChildren: document.body.children.length,
    })
  `);
  console.log(info);
} finally {
  await chrome.close();
}
process.exit(0);