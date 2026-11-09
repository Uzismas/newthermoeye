# Phase 2 Dependency Triage

Date: 2026-10-01

## Environment Inspected

The launcher selects the repository's local Node and backend environment rather than a system Python selected by the Windows `py` launcher.

| Component | Installed version / source | Runtime exposure |
| --- | --- | --- |
| Node.js | 24.15.0 | Next.js production server and server-side API routes |
| npm | 11.12.1 | Used for the explicit production build; launcher forces offline mode |
| Next.js | 16.2.6 from `package-lock.json` | Loopback web UI and image-analysis API |
| Python | 3.13.3 from `backend/.venv` | FastAPI local API and image decoding |
| FastAPI | 0.115.5 | Local HTTP endpoints |
| Uvicorn | 0.32.1 | Single local server process, no reload/workers |
| ONNX Runtime | 1.29.0 | CPU-only vessel segmentation |
| Pillow | 11.0.0 | Decodes uploaded JPEG/PNG/WebP/TIFF inputs |
| NumPy | 2.1.3 | Image preprocessing and measurements |
| python-multipart | 0.0.12 | Multipart upload parsing |

`backend/requirements-local.txt` is the minimal inference environment. It excludes database, Redis, cloud storage, and queue packages. `package-lock.json` is present. No dependency was added or upgraded in Phase 2.

## Advisory Review

The npm advisory database was queried from the local cache without network access:

```powershell
npm audit --offline --json
```

Result: no vulnerabilities were reported by the locally cached npm advisory data. Because the cache can be stale, this does not establish a current live registry audit.

Python package versions and installed requirements were inspected with the project venv. `python -m pip check` reported no broken requirements. `pip-audit` is not installed in that environment, and no offline Python advisory database is present. A current Python advisory scan is therefore not verified; do not install a new scanner or contact a registry as part of the offline presentation setup. Before redistributing the environment, run an approved Python advisory scan from a connected review workstation and record its database date.

## Exposure and Mitigations

- Pillow decodes untrusted image uploads. The current pipeline enforces byte, pixel, format, frame, and dimensions limits and returns structured unavailable/rejected states. Keep the service loopback-only and use the pinned installed environment.
- FastAPI and Next.js are local application servers. The launcher binds both to loopback by default, uses production Next output, starts Uvicorn without reload/workers, and never kills an unrelated port owner.
- Anthropic and Google provider SDKs are present in the existing npm production dependency graph because the dormant external transport path is in the app. The launcher explicitly sets `THERMOEYE_ALLOW_EXTERNAL_VISION=false` and clears provider keys for its child processes. Do not enable the flag.
- `onnxruntime` and the ONNX model run CPU-only. Readiness verifies the artifact hash against `model_card.json`, loads the model, and checks its input contract before reporting ready.
- The repository does not provide a complete transitive license/redistribution report for npm and Python dependencies. Review upstream license notices before packaging a portable copy; this phase did not redistribute or package dependencies.
- The prototype session/login behavior is not production authentication. The launcher requires a non-default token for non-loopback frontend binding, but it does not add TLS, user identity, tenant controls, or replace demo credentials. Keep any network-accessible run on a trusted isolated network with non-sensitive demo content.

## Triage Outcome

No known cached npm advisories were reported. Python advisories and full dependency license redistribution status remain unverified because suitable offline inventories were not available. Runtime exposure is constrained by loopback defaults, the local-only presentation flow, and disabled provider transport; do not treat this as a production security review.
