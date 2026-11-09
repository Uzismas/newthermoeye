# Thermoeye engineering verification report

## Current result

The live Next.js workflow now represents the connected artifact honestly: a
local OCTA vessel-segmentation pipeline. It does not diagnose Alzheimer disease,
MCI, retinal disease, or any other condition. Disease output is indeterminate,
with null risk and confidence, and the UI/PDF never turns segmentation or
quality numbers into a clinical conclusion.

## Flow and changes

1. Browser preflight checks file size, signature, MIME and explicit photograph
   filename signals.
2. `/api/analyze` sends the image to loopback FastAPI by default. It does not
   fabricate browser measurements when the service fails.
3. `/octa/analyze` decodes once, applies modality and quality gates, then runs
   the verified ONNX vessel U-Net (`[1,1,256,256]`, float32, luma input,
   sigmoid, threshold 0.5, nearest resize back to source dimensions). An
   explicit heuristic engine is available only for research experiments.
4. `normalizeLocalResult` produces `octa-analysis-v2`, preserving nulls and
   converting a declared unit once.
5. A signed receipt protects the normalized result when the case is saved.
6. The memory-only case store selects the saved case after confirmation, and
   all views consume the same canonical measurements.
7. Review and PDF release remain locked for blocked/unavailable cases. PDF text
   fails closed for unsupported Unicode rather than corrupting notes.

## Files changed in this engineering pass

The workspace already contained unrelated edits, which were preserved. This
pass owns the following safety/contract changes (the total Git diff also
contains earlier work):

| Area | Files |
| --- | --- |
| Canonical data and upload | `features/clinical-console/{types.ts,analysis-contract.ts,clinical-analysis.ts,image-input.ts,case-state.ts,analysis-presentation.ts}`, `app/api/analyze/route.ts` |
| Backend | `backend/app/{octa_pipeline.py,octa_routes.py,main.py,models.py}`, `backend/models/octa/model_card.json` |
| Storage and integrity | `features/clinical-console/server/{store.ts,analysis-receipt.ts}`, `app/api/uploads/queue/route.ts`, case review/report API routes |
| State and UI | `features/clinical-console/ThermoeyeConsole.tsx`, `components/{cases-view,analysis-view,dashboard-view,report-view,insights-view,performance-view,governance-view}.tsx`, `mock-data.ts`, `reference-cases.ts`, `app/layout.tsx` |
| Research PDFs | `features/clinical-console/pdf-text.ts`, `server/{report-pdf,insights-pdf,research-pdf}.ts`, report and insights download routes |
| Regression | `scripts/{clinical-format-regression,analysis-contract-regression,state-regression,integration-fixture,api-flow,smoke-flow,modality-gate-flow,register-test-typescript}.mjs`, `scripts/ui-safety-regression.cjs`, `scripts/generate-octa-fixtures.py`, `backend/test_octa_pipeline.py`, `backend/train/smoke_octa_pipeline.py`, `package.json` |
| Archived entry points | `web/index.html`, `public/project-summary.html`, `scripts/generate-test-scans.py`, `scripts/real-reference-flow.mjs` |
| Configuration/documentation | `.env.example`, `.gitignore`, `README.md`, `WORKLIST.md`, `backend/train/OCTA_PIPELINE_TH.md`, `docs/ANALYSIS_CONTRACT.md`, this report, `docs/examples/octa-analysis.json` |

## Before and after

The prior browser fixture path could derive disease-looking values from a file
name or canvas image and could render a 0–100 value as `0.16`. The current path
removes filename fixtures and browser heuristics, uses explicit units (`16%`
and `0.16%` remain distinct), preserves null, and exposes engine/gate/model
provenance. Color OCTA is accepted when valid; photograph filename signals,
corrupt data, tiny images, and MIME mismatches fail closed.

Additional bugs reproduced and fixed during integration: null confidence was
rejected by a stale validator; measured uploads could retain stale selection;
legacy approved states could bypass research report gates; long PDF content
was truncated; and locale-specific Thai month names made an otherwise ASCII
report fail export. Reviews now store ISO timestamps. Tampered/unsigned
analysis results cannot enter the queue. Archived static pages no longer
execute or display obsolete disease scoring, and the synthetic scan generator
no longer writes fabricated disease/confidence outputs. The additional
accessibility pass updated `scripts/a11y-flow.mjs` and fixed the unavailable
scan placeholder contrast in `app/globals.css`.

## Verification

Run from `D:\Themoeye\project\teng1`:

```powershell
npm run typecheck
npm run lint
npm run build
npm run clinical-format-test
npm run contract-test
npm run state-test
npm run ui-safety-test
npm run modality-test
npm run api
npm run smoke
backend\.venv\Scripts\python.exe -m unittest -v backend\test_octa_pipeline.py
git diff --check
```

Run the dataset and artifact checks from `D:\Themoeye\project\teng1\backend`:

```powershell
.\.venv\Scripts\python.exe train\preflight_octa.py --data-dir train\data\octa
.\.venv\Scripts\python.exe train\smoke_octa_pipeline.py
```

Results verified on 2026-09-19 (Node 24.15.0, Next 16.2.6, project Python venv):

| Check | Final result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run build` | PASS, exit 0, production routes generated |
| `npm run clinical-format-test` | PASS, 16%, 0.16%, null/invalid formatting |
| `npm run contract-test` | PASS, units/nulls/provenance/gates/legacy disease suppression |
| `npm run state-test` | PASS, nullable validation, transient previews, stale snapshot protection, release gates |
| `npm run ui-safety-test` | PASS, SSR states, no fake gauges, shared values, real returned masks, PDF pagination |
| `npm run api` | PASS, auth, HMAC tamper/unsigned rejection, distinct saved results, duplicates, release guards, PDF/DICOM and Unicode-note preservation |
| `npm run smoke` | PASS, Chrome headless: two uploads → selected values → review/report → PDF download audit |
| `npm run a11y` | PASS, zero axe violations across login, dashboard, intake, report, governance, mobile governance; fixed unavailable-image placeholder contrast |
| `npm run modality-test` | PASS, real local FastAPI + production Next + actual ONNX, color/RGBA/palette/TIFF16, decoder/MIME/filename/quality gates, exact normalized values, hash/model provenance, save/review/PDF and backend unavailable |
| Backend `unittest -v` | PASS, 29 tests |
| OCTA preflight | PASS, 39 rows/39 subject identifiers, existing image/mask pairs |
| Real ONNX smoke | PASS, artifact execution and medical-safety contract |
| `git diff --check` | PASS, exit 0; Windows LF→CRLF advisories only |

Early API/browser runs failed against a stale build; after rebuilding, the
remaining locale/PDF failure was reproduced and fixed. All required final
commands above passed. The two training checks must use the backend working
directory; running the same relative script path from the root fails with
file-not-found. That command-path error was corrected and both checks passed.

Latest PDF QA regenerated research report/insights samples, rendered them with
Poppler, and checked page layout and the long-note end marker. The new central
non-vessel label fits and safety/provenance content is retained. Poppler emitted
host-font warnings for Symbol/ArialUnicode, which are not used by these ASCII
samples; all six latest rendered pages were legible with no clipping.

The API flow and browser smoke flow use an isolated deterministic local
transport fixture; they do not call an external provider. The backend suite
uses deterministic mocked sessions for engine edge cases; the smoke and
real-stack modality checks exercise the actual ONNX artifact. Its SHA-256 is
`195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87`.

## Example measured response

This excerpt is from the actual `/api/analyze` response for the deterministic
synthetic grayscale fixture in the real-stack test. Full sanitized output is
in [examples/octa-analysis.json](examples/octa-analysis.json); image payloads
and receipt are omitted. It is execution evidence, not clinical ground truth.

```json
{
  "schemaVersion": "octa-analysis-v2",
  "analysisStatus": "measured",
  "engine": "onnx_vessel_unet",
  "modelTask": "vessel_segmentation",
  "trainedModelConnected": true,
  "metricUnit": "percent_0_100",
  "primaryDisease": "indeterminate",
  "riskLevel": "indeterminate",
  "riskScore": null,
  "confidence": null,
  "differentials": [],
  "vesselDensity": 20.69,
  "fazRisk": 78.76,
  "perfusion": null,
  "qualityScore": 75.64
}
```

`fazRisk` is the compatibility key for central non-vessel fraction, not FAZ
area or disease risk. The canonical contract is documented field by field in
[ANALYSIS_CONTRACT.md](ANALYSIS_CONTRACT.md).

## Remaining limitations and follow-up

The artifact is a segmentation model and has no disease classifier validation.
The modality preflight is heuristic, not a clinical modality classifier. The
case store is memory-only and is not suitable for multi-user production use.
Authentication remains demo authentication with a shared session token and no
tenant isolation; it must not be exposed as a production patient-data service.
The case store retains user-entered demographic/context/review text; metadata
whitelisting and omission of filenames do not establish de-identification or
consent. Images/previews/masks are intentionally not persisted and will be
unavailable after page reload. Generic photographs can pass the filename gate,
and color conversion can change the model input domain.
DICOM export is metadata-only and is not connected to PACS/DICOMweb. The
bundled PDF writer cannot render Thai or other unsupported Unicode notes; the
console preserves those notes and returns HTTP 422 for such a PDF until an
approved embedded Unicode font renderer is available. A future classifier must
have patient-level splits, held-out and external validation, calibration,
subgroup analysis, a model card, governance approval, and a separate contract
before any disease field can change.

Attempted PDF renderer dependency installation was rejected by the automatic
approval review with “This model is unavailable on the selected Channel.” No
dependency was installed or bypass attempted. The implemented HTTP 422 guard
prevents silent text loss, but full Thai PDF support remains unresolved.

The model card records vessel Dice 0.70784 on the published 9-image ROSE-O test
split. This pass verifies the installed artifact and runtime, not independent
reproduction of that training metric. The 39 subject identifiers from preflight
are image-derived identifiers; available metadata does not establish 39 unique
patients or a patient-independent test split. Dice is never disease accuracy.

Production follow-up needs durable scoped storage/backups, individual secure
sessions and tenant authorization, upload/resource limits at the serving proxy,
retention/access audit policy, validated input modality and acquisition
criteria, and an approved deployment configuration. No external provider,
deployment, merge, or push was performed. Historical planning documents,
datasets, original images, and the unused SVG/source archive are retained;
they are not live patient-analysis evidence. The older real-reference browser
script was updated for safety but was not included in the verified regression
matrix above.
