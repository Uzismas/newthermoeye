# Phase 0 Completion Record

Phase: 0 — Scope, claims, and baseline
Status: COMPLETE
Date: 2026-10-01
Executed by: AI agent (retrospective record created 2026-10-01 after adversarial review; cleanup edits applied 2026-10-01)

---

## Files changed and deliverables

| File | Action |
| --- | --- |
| docs/ysc/CLAIMS_EVIDENCE_MATRIX.md | CREATED — maps every material claim to VERIFIED / PARTIAL / UNVERIFIED / NOT IMPLEMENTED / CONTRADICTED |
| docs/ysc/DEMO_SCOPE.md | CREATED — defines M1 demo scope, approved four-minute script, and approved Q&A wording |
| docs/ysc/BASELINE_STATUS.md | CREATED — snapshot of model, measurements, workflow, dataset provenance, and stale files |
| docs/ysc/DECISIONS.md | CREATED — records four open human decisions D1–D4 blocking G1 and G4 |

---

## Verification evidence

All findings are based on direct inspection of repository artifacts. No data was invented.

ONNX model: confirmed present at backend/models/octa/octa_vessel_unet.onnx,
SHA256 195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87.
model_card.json confirms: disease_classifier_available: false, clinically_validated: false,
Dice 0.7078, test_rows: 9, scope: vessel segmentation only.

octa_pipeline.py: vessel density formula confirmed (vessel pixels / all pixels × 100).
Central-rectangle proxy confirmed as non-anatomical FAZ. perfusion_density confirmed null.
ONNX_THRESHOLD = 0.5, MAX_BYTES = 8 MB, PIPELINE_VERSION = "octa-measurement-2026.09.19".

metadata.csv: 39 rows confirmed (30 train, 9 test). All subject_id values are image-derived
("rose_o_train_01" etc.) — no clinical patient identifiers present.

Internet reference images: manifest.json confirms 9 images present; all carry use_note
"check reuse rights before public distribution." Phase 0 BASELINE_STATUS.md recorded only
1 of 9 images in its rights table — the remaining 8 were not inventoried until Phase 1.

app/api/analyze/route.ts: external provider code path confirmed present (Anthropic Messages
API and Google Generative AI). Gated by THERMOEYE_ALLOW_EXTERNAL_VISION=true on the server
AND per-upload allowExternal=true in the form. Disabled by default. This code path was not
documented in any Phase 0 deliverable.

features/clinical-console/server/store.ts: default session token "pilot-doctor" confirmed
active unless THERMOEYE_SESSION_TOKEN env var is set. Not documented in Phase 0.

---

## Acceptance criteria

| Criterion | Result | Notes |
| --- | --- | --- |
| CLAIMS_EVIDENCE_MATRIX.md created | PASS | All material claims mapped with evidence citations |
| DEMO_SCOPE.md created | PASS | Approved script and Q&A wording documented |
| BASELINE_STATUS.md created | PASS | All 9 internet-reference-images listed; external provider code path and session token documented as known constraints |
| DECISIONS.md created | PASS | D1–D4 correctly recorded as open; D4 body lists all 9 internet-reference-images with source table |
| D1–D4 left open (not resolved by inference) | PASS | No human decision was closed by inference |
| Material contradictions identified | PASS | A3 (70–80% accuracy), A4 (mock disease outputs), B2 (FAZ area), C1 (Alzheimer's Screening title) all marked CONTRADICTED with direct evidence |
| No claims invented | PASS | All claims traced to code or named artifacts |
| G0 gate | COMPLETE | All six gaps resolved; primary deliverables present, substantive, and updated |

---

## Gaps identified by adversarial review — all resolved 2026-10-01

Gap 1 (RESOLVED): External provider code path documented in BASELINE_STATUS.md Workflow table, CLAIMS_EVIDENCE_MATRIX.md W6, and DEMO_SCOPE.md competition demo environment requirements section.

Gap 2 (RESOLVED): Default session token documented in BASELINE_STATUS.md Known blockers section and CLAIMS_EVIDENCE_MATRIX.md W7.

Gap 3 (RESOLVED): BASELINE_STATUS.md internet-reference-images table updated to list all 9 images with UNVERIFIED status and cross-references to DATASET_REGISTER.md DR-3 and DATA_ACCESS_AND_ETHICS.md.

Gap 4 (RESOLVED): DECISIONS.md D4 body updated to reference all 9 internet-reference-images with a source table, consistent with Phase 1 findings.

Gap 5 (RESOLVED): CLAIMS_EVIDENCE_MATRIX.md reviewer note updated to include app/api/analyze/route.ts and features/clinical-console/server/store.ts.

Gap 6 (RESOLVED): CLAIMS_EVIDENCE_MATRIX.md Section D renamed to Section W (prefix W1–W7) to eliminate collision with DECISIONS.md D1–D4.

---

## Scientific, privacy, licensing, and security limitations

- No patient data was accessed or processed during Phase 0.
- No data was downloaded, uploaded to external services, or transmitted outside the repository.
- Disease outputs remain null; no disease classifier development was conducted.
- The external provider code path was not activated during this phase.
- ROSE-O license text was not formally verified in Phase 0; confirmed as NEEDS-EVIDENCE in Phase 1.

---

## Human decisions or approvals still required

All four Phase 0 decisions remain open as of this record date:

D1: Saudi must decide how to handle the "For Alzheimer's Screening" presentation materials
    before the YSC competition. See DECISIONS.md D1 for the three options. Blocks G1.

D2: Saudi must determine the origin of the "70–80% accuracy" claim and establish correct
    wording for all competition materials. See DECISIONS.md D2. Blocks G1.

D3: Saudi must choose between "Thermoeye" and "Eyezheimer" as the canonical product name.
    See DECISIONS.md D3. Blocks G4.

D4: Saudi must confirm or deny reuse rights for each of the nine internet-reference-images
    before using any in competition materials. See DECISIONS.md D4 and Phase 1
    DATA_ACCESS_AND_ETHICS.md for per-image steps. Blocks G1.

---

## Next recommended phase

Phase 1 — Data rights and disease feasibility.

Phase 1 has already been executed; see docs/ysc/phase-01-completion.md (2026-10-01).
The six gaps listed above should be addressed as Phase 0 cleanup tasks, either before
Phase 2 begins or carried forward as explicitly documented limitations.
