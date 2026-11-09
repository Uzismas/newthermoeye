# Phase 2 Adversarial Review

Date: 2026-10-01  
Scope: `scripts/local-demo.mjs`, `scripts/local-demo.ps1`, `scripts/offline-guard/`, `backend/app/main.py`, `backend/app/octa_pipeline.py`, `backend/app/octa_routes.py`, `backend/test_runtime_readiness.py`, `scripts/local-demo-regression.mjs`, `docs/ysc/LOCAL_DEMO_RUNBOOK.md`, `docs/ysc/DEPENDENCY_TRIAGE.md`, `docs/ysc/evidence/phase-02-readiness.json`, `docs/ysc/phase-02-completion.md`  
Method: Source-only adversarial review. No files were edited. No Phase 3 work was started.

---

## Summary verdict

Phase 2 passes on all ten criteria. The three highest-stakes properties — no measurement fabrication on model failure, external provider blocked from child processes regardless of parent environment, and stop never terminates unverified processes — all hold from source. One concrete gap was found during the initial review (OCTA_SEGMENTATION_ENGINE not pinned by the launcher) and closed by a Codex fix on 2026-10-01; the fix and regression coverage are verified from source in Criterion 9. Three additional items are worth noting for future review: `waitFor()` treating HTTP 503 as sufficient to exit the readiness wait loop, the `faz_risk_proxy` field name in raw output, and the Node offline guard's handling of IPv6 loopback variants.

---

## Criterion 1 — Offline guard: Node layer

**Claim:** A build or runtime started with `--offline` cannot make non-loopback network connections from Node.js services.

**Finding: PASS.**

`scripts/offline-guard/offline-network-guard.mjs` patches the following at import time: `net.connect`, `net.createConnection`, `http.request`, `https.request`, `tls.connect`, `dns.lookup`, `dns.promises.lookup`, `fetch` (global), and `net.Socket.prototype.connect`. Each wraps an `isLoopback()` check before delegating to the original. `isLoopback` accepts "localhost", "::1", and any IPv4 address matching `value.startsWith("127.")` — covering the full 127.0.0.0/8 loopback range, not only 127.0.0.1.

The guard is injected via `NODE_OPTIONS=--import=<guard URL>` in the child process environment, so it applies before any application code runs.

Unix domain socket connections (identified by `options.path`) are explicitly allowed through at `net.Socket.prototype.connect` line 81. This is correct — IPC sockets are not TCP, and blocking them would break the Next.js dev infrastructure.

**Minor gap (documentation only):** The guard checks `isLoopback("::1")` but not the alternative IPv6 loopback representations `"0:0:0:0:0:0:0:1"` or `"::0001"`. On Windows the launcher binds to `127.0.0.1` explicitly, so this is unlikely to be triggered in practice, but it is a known edge case worth noting if the guard is reused in non-Windows contexts.

The regression confirms the guard with three independent tests: `assertHost('198.51.100.1')` exits non-zero with "blocked non-loopback network target"; `fetch('http://example.invalid')` exits non-zero with the same message; `dns.lookup('example.invalid', ...)` exits non-zero with "blocked DNS lookup".

---

## Criterion 2 — Offline guard: Python layer

**Claim:** The Python backend cannot make non-loopback DNS or TCP connections when started with the offline guard active.

**Finding: PASS.**

`scripts/offline-guard/sitecustomize.py` is loaded automatically by CPython via the `PYTHONPATH` injection before any application module. It patches `socket.getaddrinfo` (DNS), `socket.socket.connect`, and `socket.socket.connect_ex` (TCP). All non-loopback targets are rejected with `OSError`. The `_is_loopback` helper accepts the "localhost" literal and any address for which `ipaddress.ip_address(host).is_loopback` is true.

The standard library's higher-level networking paths (`urllib`, `http.client`, `ssl`) all ultimately call through `socket.getaddrinfo` and `socket.connect`, so the patches intercept them without needing to patch each library separately.

The regression confirms with `spawnSync(python, ["-c", "import socket; socket.getaddrinfo('example.invalid', 443)"])` — exits non-zero with "blocked name resolution".

**Note:** The guard relies on CPython's standard socket implementation. Extension modules that use their own TCP stack (e.g., a compiled HTTP library calling the OS directly via ctypes) would bypass it. No such module is present in `requirements-local.txt`; the runtime is Pillow, NumPy, ONNX Runtime, FastAPI, and Uvicorn, all of which use CPython's socket layer.

---

## Criterion 3 — External provider lockout

**Claim:** The launcher prevents the backend from transmitting image bytes to Anthropic or Google APIs regardless of what environment variables the caller has set.

**Finding: PASS.**

`local-demo.mjs` `start()` constructs the child environment at lines 194–196 and unconditionally sets `THERMOEYE_ALLOW_EXTERNAL_VISION: "false"`, `ANTHROPIC_API_KEY: ""`, and `GOOGLE_API_KEY: ""`. These assignments override any inherited value because the `env` object passed to `spawn` replaces, not merges with, the specific named keys.

The defense is at the process environment layer, not inside application logic. An application-layer bypass (e.g., re-reading a parent env var or a config file) cannot re-enable provider transport because the variable is already "false" in the child process before the application code starts.

The regression confirms by passing `THERMOEYE_ALLOW_EXTERNAL_VISION: "true"` and `ANTHROPIC_API_KEY: "must-be-cleared-by-launcher"` to the launcher at start time, then verifying the started services' output reports "External vision: false" and that a real image upload through `api/analyze` returns a local ONNX result (not an external response). The regression also posts `allowExternal: "true"` in the form data, which would trigger the external path if the env var were not overridden.

---

## Criterion 4 — Measurement fabrication on model failure

**Claim:** When the ONNX model is missing, corrupt, or unloadable, the backend returns an actionable error state and never fabricates or heuristically estimates vessel measurements.

**Finding: PASS.**

`octa_pipeline.py` `analyze_octa()` initializes `result` with `analysis_status: "unavailable"`, `engine: "none"`, and `measurements: None`. If `_trained_vessel_mask()` raises an `OCTAEngineError` (covering artifact missing, hash-mismatched session cache invalidation, ONNX Runtime import failure, output contract mismatch, or any unexpected load exception), the function sets `result["failure_reason"]` to the error code string and returns without updating `analysis_status` or populating `measurements`. The result is therefore always `unavailable` with a non-null `failure_reason` string — never a fabricated measurement.

The heuristic engine (`_heuristic_vessel_mask`) is not reachable as a fallback. It is only executed if `OCTA_SEGMENTATION_ENGINE == "heuristic_research_baseline"` is set explicitly (see Criterion 9 for the gap this creates). No code path silently falls through from the ONNX engine to the heuristic.

`test_runtime_readiness.py` verifies the four failure modes independently: `test_missing_model_is_degraded_with_actionable_error`, `test_hash_mismatch_reports_model_hash_and_version`, `test_unloadable_model_is_corrupt_even_when_hash_matches_card`, and `test_missing_onnx_runtime_has_a_separate_actionable_status`. All 34 unit tests pass per `phase-02-completion.md`.

The `/readiness` endpoint returns HTTP 503 with `status: "degraded"` and a `model.error` string when the model is not ready. There is no heuristic fallback path at the HTTP layer.

---

## Criterion 5 — Disease classifier: null outputs enforced

**Claim:** The system never returns a disease classification, risk score, or disease-specific confidence value from any code path.

**Finding: PASS.**

In `octa_pipeline.py`, the `classification` block is written once at result initialization and never updated:

```python
"classification": {
    "label": "indeterminate", "risk_level": "indeterminate", "risk_score": None,
    "confidence": None, "differentials": [], "reason": "No validated disease classifier is connected.", "engine": "none",
},
```

Neither the ONNX branch nor the heuristic branch touches this dict. The only fields updated after initialization are `analysis_status`, `engine`, `model_version`, `trained_model_connected`, `threshold`, `failure_reason`, `measurements`, and provenance. `risk_score` remains `None` through all paths. The regression asserts `response.analysis.riskScore === null`.

In `main.py`, the legacy `/cases/{case_id}/analysis` endpoint returns `DiseaseKind.indeterminate`, `RiskLevel.indeterminate`, and `risk_score=None`. The `/report/release` and `/report/download` endpoints return HTTP 409 with an explicit message that legacy analysis is unavailable. The `/model-registry/current` endpoint sets `"trained_risk_classifier": False` and `"diseases": []`. None of these paths construct or return a disease label or score.

---

## Criterion 6 — Stop terminates only launcher-owned processes

**Claim:** `local-demo.ps1 stop` terminates only the exact processes the launcher started, verified by executable path and creation time, and leaves any non-matching PID untouched.

**Finding: PASS.**

`stopRecords()` (`local-demo.mjs` lines 340–358) iterates recorded processes in reverse (backend before frontend) and calls `processDetails(record.pid)` for each. If the process is absent, it records `{ absent: true }` without error. If the process exists but its `createdAt` differs from `record.created_at` or `matchesRecord` fails, it records `{ stopped: false }` and logs "left it untouched" — no kill is attempted. Only when both timestamp and path match does it call `stopVerifiedPid`.

The identity verification uses two independent signals: creation timestamp (millisecond-precision on Windows via PowerShell `CreatedAt`) and executable path (lowercased, resolve-normalized comparison on Windows; marker string match on non-Windows). Both must match. A PID reuse collision would have to reproduce both the timestamp and the executable path, which is not realistically achievable in normal operation.

The state file is only removed when all results are `stopped === true` or `absent === true`. A partial failure (identity mismatch on any PID) exits with code 1 and leaves the state file, so the operator is informed before any further action.

---

## Criterion 7 — Occupied port handling

**Claim:** The launcher never terminates a process that owns a port it wants to use.

**Finding: PASS.**

Port probing uses `createServer({ exclusive: true })`. If the port is occupied, the server emits an `error` event and the launcher calls `fail()` with a message including "is occupied" and "will not terminate a port owner". The process that already holds the port is never signalled.

The regression directly tests this: it creates `blockedServer` listening on a randomly allocated loopback port, attempts a launcher start on that port, then probes the `blockedServer` after the launcher fails and confirms the server still responds with "occupied port owner". This verifies the owner was not killed or disturbed during the preflight. The occupied-port case exits the launcher with a non-zero code.

---

## Criterion 8 — Duplicate start prevention

**Claim:** A second `start` command while processes are already running returns an error and does not create additional uncontrolled service instances.

**Finding: PASS** (from regression evidence; `stop()` implementation confirmed read).

The launcher reads a state file before starting. If the state file exists and the recorded processes are still alive with matching identities, it exits with a non-zero code and "already running" in stderr without spawning any new processes. The regression confirms this: after a successful start, a second start returns non-zero with the expected error message.

The state file path is deterministic (based on repository identity and `THERMOEYE_RUNTIME_DIR`), so a second launcher invocation in the same environment will find the same state file.

---

## Criterion 9 — OCTA_SEGMENTATION_ENGINE forced to onnx_vessel_unet in child processes

**Claim (implicit):** The launcher ensures the backend uses the reviewed ONNX model, not the heuristic research baseline.

**Finding: PASS. (Previously GAP — closed by Codex fix on 2026-10-01.)**

**Original gap:** `local-demo.mjs` cleared `THERMOEYE_ALLOW_EXTERNAL_VISION`, `ANTHROPIC_API_KEY`, and `GOOGLE_API_KEY` from child processes but did not set `OCTA_SEGMENTATION_ENGINE`. A caller with that variable set to `heuristic_research_baseline` in their shell would cause the backend to use the unreviewed heuristic engine while `/readiness` still reported `engine: "onnx_vessel_unet"`.

**Fix verified from source:** `local-demo.mjs:195` now reads:

```js
OCTA_SEGMENTATION_ENGINE: "onnx_vessel_unet",
THERMOEYE_ALLOW_EXTERNAL_VISION: "false",
ANTHROPIC_API_KEY: "",
GOOGLE_API_KEY: "",
```

The assignment appears after `...process.env` in the child env object, so it unconditionally overrides any inherited value. This is the same pattern used for the provider lockout overrides.

**Regression coverage added:** `local-demo-regression.mjs:76` now passes `OCTA_SEGMENTATION_ENGINE: "heuristic_research_baseline"` to the launcher alongside the existing `THERMOEYE_ALLOW_EXTERNAL_VISION: "true"` and `ANTHROPIC_API_KEY: "must-be-cleared-by-launcher"` values. After startup, the regression asserts:

```js
assert.equal(response.analysis.engine, "onnx_vessel_unet");          // line 109
assert.equal(response.analysis.modelVersion, startedModelVersion(started.stdout)); // line 110
```

The `modelVersion` in the response is the ONNX SHA-256 version string printed at start time, not the heuristic `heuristic-local-contrast-v1` string. Both assertions must pass for the regression to succeed, confirming that the launcher's `OCTA_SEGMENTATION_ENGINE: "onnx_vessel_unet"` override suppressed the `heuristic_research_baseline` value from the parent environment.

**Readiness/inference consistency:** With the engine pinned at process launch, both `inspect_model_readiness()` (which powers `/readiness` and the readiness JSON) and `analyze_octa()` (which reads `os.environ.get("OCTA_SEGMENTATION_ENGINE", "onnx_vessel_unet")` at call time) see the same engine identifier. The mismatch between readiness-reported engine and actual inference engine identified in the original review cannot recur from a launcher-started session.

**Scope of change:** The fix is one added line in the `start()` child env block. `git diff HEAD -- scripts/local-demo.mjs` returned no output, confirming the change is committed. No other variables, logic, or claim boundaries were altered. The `build()` function does not launch the Python backend and therefore does not need this override.

---

## Criterion 10 — Model hash verification

**Claim:** The backend refuses to serve measurements if the ONNX artifact does not match the reviewed SHA-256 recorded in `model_card.json`.

**Finding: PASS.**

`inspect_model_readiness()` computes `sha256(model_path.read_bytes()).hexdigest()`, reads `model_card.json`, and compares to `card["artifact_sha256"]`. A mismatch returns `status: "corrupt"` with the actionable message "ONNX model hash does not match model_card.json." The `/readiness` endpoint returns HTTP 503 in this case. `_onnx_session()` is only called after the hash check passes, so a hash-mismatched artifact never reaches the inference stage.

Additionally, `_onnx_session()` is `@lru_cache(maxsize=2)` keyed on `(path, modified_ns, size)`. A file change invalidates the cache key, causing a re-read and re-hash on the next readiness check. `test_runtime_readiness.py` `test_hash_mismatch_reports_model_hash_and_version` verifies the corrupt state is reported with the actual file hash (useful for debugging) and `test_unloadable_model_is_corrupt_even_when_hash_matches_card` confirms that a file whose bytes match the card but is not a valid ONNX file is still rejected at load time. The live evidence in `phase-02-readiness.json` confirms the correct SHA-256 in a real run.

---

## Additional observations

**`waitFor()` accepts HTTP 503 as running.** `local-demo.mjs` line 276 (from prior read): `if (response.ok || response.status === 503) return`. This means a successful `start` command does not guarantee a `ready` readiness state — it guarantees the FastAPI process is responding. The actual `status: ready` vs `status: degraded` determination is made in `collectStatus()` by reading `/readiness`. The start output prints the full readiness summary, so a degraded model state is visible. This is intentional behavior and correctly documented, but it means the start command does not itself fail if the model is corrupt; the operator must read the readiness output to confirm `status: ready`.

**`faz_risk_proxy` field name in raw output.** The measurements dict returned by `_measure()` includes a field named `faz_risk_proxy`. The code comment and the `limitations` list in the result both explicitly disclaim it ("Legacy transport name: central 30% rectangle non-vessel fraction, not anatomical FAZ area, disease risk or a calibrated perfusion value"). A judge or reviewer inspecting raw API output could misread this as a clinically meaningful FAZ measurement. This is a naming risk, not a defect. Consider renaming to `central_nonvessel_fraction` in a future cleanup, or adding an explicit `not_faz_area: true` flag alongside it.

**`main.py` legacy review approval blocked correctly.** The `POST /cases/{case_id}/review` endpoint raises HTTP 409 when `decision == approved` with the explicit message "Legacy case analysis is unavailable; report approval requires the console image-analysis workflow." This prevents the legacy case API from being used to generate an approved report without actual image analysis. The disease gate works at the data layer, not just the presentation layer.

---

## Review outcome

| Area | Result | Notes |
| --- | --- | --- |
| Node offline guard | PASS | Minor IPv6 edge case documented |
| Python offline guard | PASS | Relies on CPython socket layer; no native TCP extensions in requirements |
| External provider lockout | PASS | Forced at process env level before app code |
| Measurement fabrication | PASS | No heuristic fallback; unavailable state always explicit |
| Disease outputs | PASS | null/indeterminate through all paths; release endpoint gated |
| Stop identity verification | PASS | Timestamp + path; unmatched PIDs left untouched |
| Occupied port safety | PASS | Owner never signalled; regression confirmed owner survival |
| Duplicate start prevention | PASS | State file gate; second start exits non-zero |
| Engine pinning | PASS | `OCTA_SEGMENTATION_ENGINE` pinned to `onnx_vessel_unet` in forced child env; regression confirmed |
| Model hash enforcement | PASS | Hash checked before inference; corrupt state returns 503 |

Phase 2 passes all ten criteria and may proceed to operational use within its documented scope. The `OCTA_SEGMENTATION_ENGINE` gap identified during initial review was closed by a Codex fix on 2026-10-01 and verified from source. No Phase 3 work was started or any source file modified by this review.
