// Check whether a dev server is already listening on common local ports.
const ports = [3000, 3001, 3010, 3011, 8000];
for (const port of ports) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
    console.log(`port ${port}: UP (status ${res.status})`);
  } catch (error) {
    console.log(`port ${port}: down (${error.cause?.code ?? error.name})`);
  }
}