# Windows Local Demo Runbook

This runbook starts the existing production Next.js app and the local FastAPI/ONNX service. It does not install packages, change source, use a cloud service, or store uploaded images and review notes on disk.

## Prepare Once

Use Windows PowerShell from the repository root. Prepare dependencies while network access is available, then keep the installed `node_modules`, `backend/.venv`, and reviewed model artifact on the presentation machine. The launcher never runs an install command.

```powershell
Set-Location D:\Themoeye\project\teng1
node --version
npm --version
backend\.venv\Scripts\python.exe --version
.\scripts\local-demo.ps1 check
.\scripts\local-demo.ps1 build --offline
```

`build --offline` enables npm offline mode and a Node TCP guard that blocks non-loopback connections during the build. The app uses local system font fallbacks; it does not fetch Google Fonts at build time. If the build fails, resolve the reported local runtime/package issue before disconnecting the presentation machine.

The launcher expects Node 24, Python 3.10 or newer in `backend/.venv`, the locked Next.js dependencies, the minimal local backend requirements, and the ONNX artifact whose SHA-256 matches `backend/models/octa/model_card.json`. It checks that its local runtime directory is writable. Logs and process/readiness state live under `%TEMP%\thermoeye-local-demo-<repository-id>` by default. Set `THERMOEYE_RUNTIME_DIR` to another private local directory before running if needed.

## Start Offline

```powershell
Set-Location D:\Themoeye\project\teng1
.\scripts\local-demo.ps1 check
.\scripts\local-demo.ps1 start --offline
.\scripts\local-demo.ps1 status
```

The frontend is bound to `127.0.0.1:3000`; FastAPI is bound to `127.0.0.1:8000`. `start --offline` runs both services with Node and Python guards that reject non-loopback network connections. It also sets `THERMOEYE_ALLOW_EXTERNAL_VISION=false`, clears both provider API keys, and disables Next telemetry in the child environment even when the caller inherited other values.

The readiness summary reports frontend and backend health, ONNX load/input-contract status, engine, model version and SHA-256, pipeline/preprocessing versions, actionable errors, and log paths. A sanitized copy is written to `readiness.json` in the runtime directory. Logs omit image bytes, filenames, review notes, credentials, and environment values. They can include request IDs, hashes, image dimensions, and analysis status; keep them local.

To stop, run:

```powershell
.\scripts\local-demo.ps1 stop
```

The stop command reads its process state and verifies each PID's creation time and executable path before terminating that exact service process. If an identity does not match, it leaves the process alone. A second `start` refuses to create duplicates while the recorded launcher processes are active.

## Ports and Failures

Use alternate loopback ports when the defaults are occupied:

```powershell
.\scripts\local-demo.ps1 check --port 3010 --backend-port 8010
.\scripts\local-demo.ps1 start --offline --port 3010 --backend-port 8010
```

The launcher never kills a port owner. It reports the occupied port and asks the operator to stop the known project service or choose another port. A race after the probe is reported as a service startup failure and written to the matching local log.

`check` reports missing Node/Python runtimes, missing Python modules, missing Next.js packages, a missing model, a model-card SHA mismatch, occupied ports, or a non-writable runtime directory with repair steps. Backend `GET /health` reports service liveness. `GET /readiness` loads the configured ONNX model, validates the runtime input shape/type, checks the model-card hash, and returns `ready` or an actionable `503 degraded` response. The model does not fall back to a heuristic.

If FastAPI is unavailable, `status` marks the backend down and names the backend URL and log location. The Next analysis route already returns unavailable measurements with null values when the backend cannot be reached. Restore the backend and check readiness before uploading again.

## Network Binding

Loopback is the default. To bind the frontend to a non-loopback address, set a private non-default token of at least 32 characters in the current PowerShell session; the launcher refuses the bind if the token is missing, short, or equals the prototype default. The backend remains loopback-only.

```powershell
$env:THERMOEYE_SESSION_TOKEN = node -p "require('node:crypto').randomBytes(32).toString('hex')"
.\scripts\local-demo.ps1 start --host 0.0.0.0
```

Do not put the token in this runbook, logs, screenshots, or a shared `.env` file. This token check does not upgrade the prototype's shared demo login, provide TLS, tenant isolation, or production authentication; any non-loopback run remains limited to a trusted isolated network and non-sensitive demo material.

## Offline Limits

The offline guards cover Node DNS/TCP/HTTP(S) requests and Python DNS/TCP from the launched services. The regression uses only generated synthetic test imagery. Build and runtime require dependencies, venv wheels, and the reviewed ONNX artifact to have been prepared beforehand. No package download or external provider is part of the presentation workflow. External links rendered as references still require internet access if an operator chooses to open them.

Cases remain memory-only and disappear after a server restart. Thai/unsupported Unicode PDF rendering remains a separate known limitation. The model performs OCTA vessel segmentation only; this workflow does not classify Alzheimer disease, MCI, or other disease.
