# Claims and Evidence Matrix

Status: DRAFT — Phase 0 output. Baseline date: 2026-10-01.
Reviewer: AI review of actual repository artifacts (model_card.json, octa_pipeline.py, train_octa_segmentation.py, NEXT_DEVELOPMENT_PLAN.md, MVP_BACKEND_PLAN.md, app/api/analyze/route.ts, features/clinical-console/server/store.ts).

This matrix maps every material claim in the submitted YSC proposal and existing presentation materials to repository evidence. A phase or demo must not assert a claim whose status is UNVERIFIED, CONTRADICTED, or NOT IMPLEMENTED.

---

## Legend

| Status | Meaning |
| --- | --- |
| VERIFIED | Directly confirmed in code or artifact |
| PARTIAL | Partially implemented; limitations documented |
| UNVERIFIED | Mentioned in plan/proposal; no direct experiment to cite |
| NOT IMPLEMENTED | Feature not present in current code |
| CONTRADICTED | Claim conflicts with verified artifact |

---

## Section A — Core model and segmentation

| # | Claim source | Claim | Evidence location | Status | Gap / allowed wording |
| --- | --- | --- | --- | --- | --- |
| A1 | README / model_card | OCTA vessel segmentation model exists and runs | `backend/models/octa/octa_vessel_unet.onnx` (SHA256: 195ff40…); `backend/app/octa_pipeline.py` | VERIFIED | May state: "We have an ONNX vessel segmentation model that runs on OCTA images." |
| A2 | model_card | Dice ≈ 0.7078 on 9-image test set | `model_card.json → test.dice = 0.707841674486796, test_rows = 9` | VERIFIED | Must state: "Dice 0.71 on 9 ROSE-O test images." Do NOT call this "70% accuracy" or "70% disease accuracy." |
| A3 | Proposal / presentations | "70–80% accuracy" in disease detection | No disease experiment found; Dice 0.7078 on segmentation is the only numeric result | CONTRADICTED | Must not use this phrase for disease performance. May use: "Dice ≈ 0.71 on 9-image segmentation test set." Origin of disease claim is unresolved — see DECISIONS.md D2. |
| A4 | NEXT_DEVELOPMENT_PLAN (stale) | Disease outputs: Normal, Alzheimer Risk, Diabetic Retinopathy, Glaucoma, AMD, Hypertensive Retinopathy | `model_card.json → disease_classifier_available: false` | CONTRADICTED | Old plan described mock fixture outputs. These are NOT live model outputs. Must not display or claim without genuine classifier. |
| A5 | model_card | Not clinically validated | `model_card.json → clinically_validated: false` | VERIFIED | Must include this caveat in all presentations. |
| A6 | model_card | Scope: vessel segmentation only; not AD/MCI classification or diagnosis | `model_card.json → scope` field | VERIFIED | Required statement in demo and materials. |

---

## Section B — Measurements

| # | Claim source | Claim | Evidence location | Status | Gap / allowed wording |
| --- | --- | --- | --- | --- | --- |
| B1 | octa_pipeline / contract | Vessel density is implemented | `octa_pipeline.py → measurement_definitions.vessel_density`: "Vessel pixels / all pixels … * 100" | VERIFIED | May state: "We measure vessel density as vessel-pixel fraction (0–100%)." Must include definition and units. |
| B2 | old UI / presentations | FAZ (foveal avascular zone) area measurement | `model_card.json → faz_risk_proxy`: "Non-vessel fraction in the central 30% rectangle * 100; not anatomical FAZ area or disease risk" | CONTRADICTED | Must NOT call this "FAZ area." Allowed: "unvalidated central-region non-vessel fraction proxy." Must be labelled as such in UI. |
| B3 | old UI / presentations | Perfusion density | `model_card.json → perfusion_density`: "Unavailable (null)" | NOT IMPLEMENTED | Must show as unavailable/null. Must not claim perfusion measurement exists. |
| B4 | plan Section 2 | 16-bit OCTA input supported | `octa_pipeline.py → _load_grayscale`: handles `I;16` mode with `/65535` normalization | VERIFIED | May state: "Supports 8-bit and unsigned 16-bit grayscale OCTA input." |

---

## Section C — Alzheimer's and disease claims

| # | Claim source | Claim | Evidence location | Status | Gap / allowed wording |
| --- | --- | --- | --- | --- | --- |
| C1 | Poster, PDF title | "For Alzheimer's Screening" | No AD classifier in repository; `model_card.json → disease_classifier_available: false` | CONTRADICTED | These materials must NOT be shown as representing current system capability. Must be reconciled before competition — see DECISIONS.md D1. |
| C2 | Proposal | AD/MCI classification as project goal | Proposal scope — future M2 goal, not current implementation | NOT IMPLEMENTED (future goal) | May state: "Our research goal is to investigate whether OCTA vessel features can support AD/MCI screening. This has not yet been validated." |
| C3 | old plan / internet-reference-images | "alzheimer-risk" labelled reference image | `internet-reference-images/01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg` | UNVERIFIED | Rights for demo/presentation use of this image need documentary confirmation. See Phase 1 / DATASET_REGISTER. |
| C4 | proposal | Longitudinal / early detection claim | No longitudinal data; no prospective risk model | NOT IMPLEMENTED | Must not claim early detection or future risk prediction. Research goal only, requires separate study design. |

---

## Section W — Workflow and application

| # | Claim source | Claim | Evidence location | Status | Gap / allowed wording |
| --- | --- | --- | --- | --- | --- |
| W1 | README / engineering report | Upload → analysis → review → report workflow | Confirmed present in Next.js + FastAPI stack | VERIFIED | Core demo story. |
| W2 | plan Section 2 | Case review and research report generation | Confirmed in features/clinical-console/ | VERIFIED | May demo this. Reports must include provenance and null disease fields. |
| W3 | plan Section 2 | Case storage in memory only | `plan Section 2 → "browser refresh loses image/mask previews"` | VERIFIED LIMITATION | Must not claim persistent case storage until Phase 3 is complete. Server restart = cases lost. |
| W4 | plan Section 2 | Thai/Unicode PDF limitation | `plan Section 2 → "PDF export cannot currently render arbitrary Thai/Unicode notes"` | VERIFIED LIMITATION | Must not demo Thai notes in PDF until Phase 5 resolves this. |
| W5 | old plans | Hospital multi-tenancy, PACS integration | `MVP_BACKEND_PLAN.md` (superseded) | NOT IMPLEMENTED | Must not claim hospital integration in M1. |
| W6 | app/api/analyze/route.ts | External provider code path: uploads image bytes to Anthropic Messages API or Google Generative AI API when `THERMOEYE_ALLOW_EXTERNAL_VISION=true` and `allowExternal=true` (per upload). Disabled by default. Returns `unavailableAnalysis()`. | `app/api/analyze/route.ts → externalReceipt()` | VERIFIED — default-off | Must remain disabled (env var unset) for all competition use. Image bytes are transmitted regardless of the response if activated. |
| W7 | features/clinical-console/server/store.ts | Prototype default session token grants clinical console access to any request carrying it unless overridden by `THERMOEYE_SESSION_TOKEN` env var. | `features/clinical-console/server/store.ts → sessionCookieValue` | VERIFIED LIMITATION | Default token must be overridden before demo deployment. Token value must not appear in any guide distributed to third parties. |

---

## Section E — Naming

| # | Claim source | Claim | Evidence location | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| E1 | Live app | Product name: Thermoeye | Observed in app and root directory | VERIFIED (current app name) | Conflicts with proposal name — see DECISIONS.md D3. |
| E2 | Proposal, poster, PDF | Product name: Eyezheimer | Submitted proposal and presentation materials | VERIFIED (proposal name) | Team must choose one consistent name. Decision cannot be deferred past Phase 4. |

---

## Allowed summary statement for M1 demo

"We have built and evaluated a retinal OCTA vessel-analysis research prototype. It segments vessel structure using an ONNX U-Net model (Dice ≈ 0.71 on a 9-image ROSE-O test set), measures vessel density, and generates a provenance-linked research report. Alzheimer's screening is a separate, future validation objective that requires authorized clinical data and an independent study design."

This statement may be used verbatim. Any stronger claim requires new evidence added to this matrix with verified source and status.
