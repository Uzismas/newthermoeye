// Verifies the three rendering assumptions the promo pipeline depends on:
//   1. classic sibling <script src> loads under file://
//   2. MediaRecorder can really ENCODE an mp4 (ftyp box), not merely claim support
//   3. drawing a data-URI image does not taint the canvas (needed to export)
import { launchChrome, sleep } from "./cdp.mjs";

const chrome = await launchChrome({ width: 1920, height: 1080 });
try {
  const page = await chrome.newTarget("file:///D:/Themoeye/project/teng1/promo-claude/tools/filetest.html");
  await page.waitFor("window.__result && window.__result.done === true", { timeout: 60000, label: "encode test" });
  const result = await page.evaluate("JSON.stringify(window.__result)");
  console.log(JSON.stringify(JSON.parse(result), null, 2));
} finally {
  await chrome.close();
}
process.exit(0);