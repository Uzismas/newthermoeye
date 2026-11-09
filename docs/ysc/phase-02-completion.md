# Phase 2 Completion Record

Phase: 2 — Make the local runtime predictable and offline-ready  
Status: COMPLETE  
Date and environment: 2026-10-01; Windows PowerShell, Node.js 24.15.0, npm 11.12.1, Python 3.13.3 in `backend/.venv`, Next.js 16.2.6, FastAPI 0.115.5, Uvicorn 0.32.1, ONNX Runtime 1.29.0  
Authorized scope: Phase 2 only

## Scope and deliverables

Implemented a Windows-friendly launcher around the existing production Next.js and local FastAPI/ONNX services. Defaults bind to loopback. External vision remains disabled and provider keys are cleared from launcher child processes. A non-loopback frontend bind is rejected unless `THERMOEYE_SESSION_TOKEN` is at least 32 characters and differs from the prototype default; the backend remains loopback-only. The launcher checks runtime/package/model prerequisites, model-card hash, ports, state-directory writability, service health, duplicate starts, and verified process identity before shutdown. It never terminates an unrelated port owner.

| File or artifact | Result |
| --- | --- |
| `scripts/local-demo.mjs` | Launcher build/check/start/status/stop workflow, offline guards, readiness output, and safe process handling |
| `scripts/local-demo.ps1` | PowerShell entry point |
| `scripts/offline-guard/` | Node and Python network guards for offline build/runtime |
| `backend/app/main.py`, `backend/app/octa_pipeline.py`, `backend/app/octa_routes.py` | FastAPI health/readiness and local ONNX readiness/inference integration |
| `backend/requirements-local.txt` | Minimal local inference requirements; no dependency installation or upgrade performed in this phase |
| `scripts/local-demo-regression.mjs`, `backend/test_runtime_readiness.py`, `backend/test_octa_pipeline.py` | Regression and readiness coverage |
| `docs/ysc/LOCAL_DEMO_RUNBOOK.md` | Windows preparation, operation, recovery, binding, and offline guidance |
| `docs/ysc/DEPENDENCY_TRIAGE.md` | Runtime inventory, cached advisory result, exposure, and unresolved review items |
| `docs/ysc/evidence/phase-02-readiness.json` | Sanitized successful live readiness snapshot |

The verified ONNX artifact is `backend/models/octa/octa_vessel_unet.onnx`, SHA-256 `195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87`. Readiness reports model version `octa-vessel-unet-sha256:195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87`, engine `onnx_vessel_unet`, pipeline `octa-measurement-2026.09.19`, and preprocessing `octa-luma-u16-v2`.

Adversarial review follow-up: the launcher forces `OCTA_SEGMENTATION_ENGINE=onnx_vessel_unet` in the child environment. Fresh regression verification inherited `heuristic_research_baseline`, then confirmed both readiness and real inference report the ONNX engine, `trainedModelConnected: true`, and matching hash-derived model version.

## Verification

Commands below were run from `D:\Themoeye\project\teng1`, except the Python unit suite and `pip check`, which were run from `D:\Themoeye\project\teng1\backend`.

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run local-demo-build -- --offline` | PASS; production Next.js build completed using npm offline mode and without non-loopback TCP connections | Build output; `.next/BUILD_ID` |
| `npm run local-demo-regression` | PASS; with inherited `OCTA_SEGMENTATION_ENGINE=heuristic_research_baseline`, the launcher started normally and offline, readiness reported `onnx_vessel_unet`, and real synthetic-image inference reported `onnx_vessel_unet`, `trainedModelConnected: true`, and the same model version; prior missing-runtime, token, occupied-port, duplicate-start, backend-down, provider-override, and shutdown cases also passed | `scripts/local-demo-regression.mjs`; `docs/ysc/evidence/phase-02-readiness.json` (fresh `checked_at` `2026-10-01T11:35:31.185Z`) |
| `.\.venv\Scripts\python.exe -m unittest -v test_octa_pipeline test_runtime_readiness` | PASS; 34 tests, including missing model, hash mismatch, unloadable/corrupt model, missing ONNX Runtime, real artifact hash/version, and unavailable behavior | `backend/test_octa_pipeline.py`; `backend/test_runtime_readiness.py` |
| `npm run lint` | PASS | Command output; no lint diagnostics |
| `npm run typecheck` | PASS | Command output; `tsc --noEmit` |
| `npm audit --offline --json` | PASS against locally cached data; 0 reported advisories across 407 dependencies | `docs/ysc/DEPENDENCY_TRIAGE.md`; cached data may be stale |
| `.\.venv\Scripts\python.exe -m pip check` | PASS; no broken requirements | `docs/ysc/DEPENDENCY_TRIAGE.md` |
| `git -c safe.directory='D:/Themoeye/project/teng1' diff --check` | PASS; no whitespace errors or conflict markers; Git printed existing LF-to-CRLF advisories | Command output |
| `Get-FileHash backend/models/octa/octa_vessel_unet.onnx -Algorithm SHA256` | PASS; hash matches `backend/models/octa/model_card.json` | `backend/models/octa/model_card.json`; `docs/ysc/evidence/phase-02-readiness.json` |

The launcher regression uses generated synthetic imagery only. It does not send images or requests to an external vision provider. `THERMOEYE_ALLOW_EXTERNAL_VISION` was supplied as `true` by the regression caller to verify that the launcher overrides it to `false` for its child services; no launcher path enables provider transport.

## Acceptance criteria

| G2 criterion | Result | Evidence and limits |
| --- | --- | --- |
| Teammate can start from documented steps without source edits | PASS | `docs/ysc/LOCAL_DEMO_RUNBOOK.md`; build/check/start/status/stop paths passed |
| Frontend and actual ONNX backend operate offline | PASS | Offline build and guarded runtime regression; synthetic input produced a measured segmentation result with null disease risk |
| Missing dependencies or backend/model failures are actionable and never fabricate measurements | PASS | Missing interpreter preflight; backend-down status; unit coverage for missing/corrupt/unloadable model and missing ONNX Runtime; no heuristic fallback |
| Repeat start does not create uncontrolled duplicates or terminate unrelated applications | PASS | Duplicate-start rejection and occupied listener survival in `scripts/local-demo-regression.mjs`; launcher verifies process identity before stop |
| Security/dependency risks are documented; known release blockers are resolved or G2 blocked | PASS WITH LIMITATIONS | Loopback defaults, external providers disabled, network token requirement, exposure and scanner/license gaps documented in `docs/ysc/DEPENDENCY_TRIAGE.md` |
| Model provenance is visible in readiness | PASS | Live sanitized readiness evidence contains the verified SHA-256, model version, engine, pipeline, and preprocessing versions |
| Inherited heuristic engine cannot change launcher inference | PASS | Regression inherits `heuristic_research_baseline`; live readiness and actual inference both use `onnx_vessel_unet` with the verified model version |

## Limitations and blockers

- `npm audit --offline --json` used the local cache; it is not a fresh registry audit. `pip-audit` and an offline Python advisory database were unavailable, so Python advisories remain unverified. Do not install a scanner as part of the offline runtime workflow.
- Full transitive dependency license and redistribution review remains outstanding. Review it before packaging or redistributing dependencies or a portable environment.
- The Node/Python environments and ONNX Runtime build are machine/platform-specific. This phase did not package or redistribute them.
- Non-loopback binding protection checks for a strong non-default session token; it does not provide TLS, production identity, tenant separation, or replace prototype demo credentials. Keep any such run on a trusted isolated network with non-sensitive demonstration content.
- The artifact performs OCTA vessel segmentation only. It is not an Alzheimer disease or MCI classifier, is not clinically validated, and must not be used for diagnosis. The local demo remains memory-only; case data is lost when services restart.
- Phase 1 still records dataset and internet-reference image rights as requiring human confirmation. Those gates do not prevent completing Phase 2 runtime work, but approved assets must be available before any later seeding work.

No human action is required to operate the verified loopback demo with the already prepared local environment. Before redistribution, obtain a connected-workstation Python advisory review and complete the transitive license review. Resolve applicable Phase 1 data-rights gates before using or seeding those assets.

## Worktree preservation and recovery

The checkout contained a large set of pre-existing modified and untracked files. They were preserved; no reset, cleanup, commit, push, deployment, dependency installation, or later-phase work was performed. A failed intermediate test-helper attempt was corrected, and the final regression command passed.

To recover a local session, use `scripts/local-demo.ps1 status` to inspect health and log paths, then `scripts/local-demo.ps1 stop` to stop only identity-verified launcher-owned processes. If a port is occupied, choose another loopback port or stop the known project-owned service; do not terminate an unidentified listener. Rebuild the frontend with `scripts/local-demo.ps1 build --offline` when `.next/BUILD_ID` is absent. Restore the reviewed model artifact and matching model card when readiness reports missing or corrupt status.

## Next recommendation

Phase 3 is the next runtime-dependent phase because G2 passed. Begin it only within its existing scope: persist explicitly approved demo cases/assets safely. Phase 3 requires approved demo assets before seeding; Phase 1 rights questions remain open and must not be inferred from this runtime result. No Phase 3 work was started here.
