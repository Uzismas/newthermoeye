// Follow the /login redirect chain and report where it actually lands.
for (const path of ["/login", "/", "/console/dashboard", "/console/cases"]) {
  try {
    const res = await fetch(`http://127.0.0.1:3000${path}`, { redirect: "manual", signal: AbortSignal.timeout(60000) });
    console.log(`${path} -> ${res.status} Location=${res.headers.get("location") ?? "-"}`);
  } catch (e) {
    console.log(`${path} -> ERROR ${e.name} ${e.cause?.code ?? ""}`);
  }
}