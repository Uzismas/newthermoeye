// Probe a local HTTP endpoint with a generous timeout (Next dev compiles on first hit).
const url = process.argv[2] || "http://127.0.0.1:3000/console/dashboard";
const timeout = Number(process.argv[3] || 90000);
const t0 = Date.now();
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: "manual" });
  const body = await res.text();
  console.log(`OK status=${res.status} in ${Date.now() - t0}ms bytes=${body.length}`);
  console.log("has Research Workspace:", body.includes("Research Workspace"));
  console.log("has login form:", body.includes("lg-form"));
} catch (e) {
  console.log(`FAIL in ${Date.now() - t0}ms:`, e.name, e.cause?.code ?? "", e.message);
}