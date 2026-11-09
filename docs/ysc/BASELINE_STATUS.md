# Baseline Status — YSC Phase 0 Snapshot

Status: DRAFT — Phase 0 output. Baseline date: 2026-10-01.
Pipeline version: octa-measurement-2026.09.19

This document records the actual state of the repository on the Phase 0 baseline date. Its purpose is to give any AI agent or team member a single place to check what is real, what is broken, and what is not yet built before beginning Phase 1+.

---

## Model and inference

| Item | State |
| --- | --- |
| ONNX model file | Present: `backend/models/octa/octa_vessel_unet.onnx` (SHA256: 195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87) |
| Model scope | Vessel segmentation only. `disease_classifier_available: false` in model_card.json |
| Dice on test set | 0.7078 on 9-image ROSE-O published test split |
| Clinical validation | false — `clinically_validated: false` in model_card.json |
| Inference threshold | ONNX_THRESHOLD = 0.5 (fixed; not tunable from API today) |
| 16-bit OCTA input | Supported: `I;16` mode → `/65535` normalization in `octa_pipeline.py` |
| Augmentation in training | None. `OCTADataset.__getitem__` does resize + to_tensor only |

---

## Measurements

| Measurement | State | Notes |
| --- | --- | --- |
| Vessel density | Implemented | vessel pixels / all pixels × 100; unitless 0–100 |
| FAZ (anatomical) | NOT IMPLEMENTED | Central-rectangle non-vessel proxy exists but is not anatomical FAZ |
| Perfusion density | NOT IMPLEMENTED | null in model_card.json |
| Disease risk % | NOT IMPLEMENTED | No classifier; must never be derived from Dice, density, filename, or LLM text |

---

## Workflow

| Feature | State | Notes |
| --- | --- | --- |
| Upload → segmentation → overlay | Working | Core demo path confirmed |
| Image quality check | Working | Produces pass / blocked with reason |
| Researcher review step | Working | Note entry + approval before report |
| Research PDF generation | Working with known limitation | Thai/Unicode notes broken in PDF (Phase 5 blocker) |
| Case storage | In-memory only | Cases lost on browser refresh or server restart (Phase 3 blocker) |
| External provider code path | Present — default-off | `app/api/analyze/route.ts`: `externalReceipt()` transmits uploaded image bytes to Anthropic Messages API or Google Generative AI API when both `THERMOEYE_ALLOW_EXTERNAL_VISION=true` (server env) AND `allowExternal=true` (per-upload form field). Returns `unavailableAnalysis()` regardless of response. Must remain disabled during competition demo. |
| Hospital multi-tenancy / PACS | NOT IMPLEMENTED | Described in stale `MVP_BACKEND_PLAN.md`; that plan is superseded |

---

## Dataset and training provenance

| Item | State |
| --- | --- |
| Training dataset | ROSE-O (published open dataset) |
| Train/val/test split | GroupShuffleSplit on 39 image/mask pairs; group IDs are image-derived only |
| Patient independence | UNVERIFIED — group IDs come from filenames, not clinical patient records |
| Test set size | 9 images (published ROSE-O test split) |
| Image size at inference | 256×256 (resize in pipeline and training) |

---

## Internet reference images

| File | Rights status |
| --- | --- |
| `internet-reference-images/01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/02_diabetic-retinopathy_springer-fa-octa-comparison.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/03_diabetic-retinopathy_springer-montaged-octa.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/04_normal_eyewiki-healthy-octa-disc.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/05_glaucoma_eyewiki-glaucomatous-octa-disc.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/06_amd_amdbook-type1-cnv-octa.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/07_amd_amdbook-type2-cnv-octa.png` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/08_pathologic-myopia_eyerounds-oct-cnvm-lacquer-crack.jpg` | UNVERIFIED — requires documentary confirmation before use in competition materials |
| `internet-reference-images/09_pathologic-myopia_eyerounds-fundus-lacquer-crack.jpg` | UNVERIFIED — requires documentary confirmation before use in competition materials |

Per-image SHA256 hashes, source institutions, and per-image next steps are in docs/ysc/DATASET_REGISTER.md (DR-3) and docs/ysc/DATA_ACCESS_AND_ETHICS.md. None of these images may be used in competition materials until rights are confirmed. The M1 demo does not require any of them. See DECISIONS.md D4.

---

## Known blockers before M1 competition demo

Phase 3 blocker: Case storage is in-memory only. Cases are lost on browser refresh or server restart. The demo must work within this constraint (keep browser open, no server restart) until Phase 3 persistent storage is complete.

Phase 5 blocker: Thai/Unicode characters in researcher review notes do not render correctly in PDF output. Demo notes must be in ASCII/Latin script until Phase 5 resolves this.

Demo security requirement — session token: `features/clinical-console/server/store.ts` contains a prototype default session token that grants clinical console access to any request carrying it. The default value is active unless the `THERMOEYE_SESSION_TOKEN` environment variable is set to a different value. Before demo deployment, this env var must be set to a non-default value known only to the demo operator. The default token value must not be shared in any demo setup guide distributed to third parties. See also CLAIMS_EVIDENCE_MATRIX.md W7 and DEMO_SCOPE.md competition demo environment requirements.

Demo security requirement — external provider: The `THERMOEYE_ALLOW_EXTERNAL_VISION` environment variable must be unset or not equal to `true` during the competition demo. See BASELINE_STATUS Workflow table row for the full constraint and DEMO_SCOPE.md competition demo environment requirements.

---

## Stale files that must not be followed by AI agents

The following files exist in the repository but contain outdated plans that include mock disease outputs and features not present in current code. They have superseded notices at the top. AI agents must not treat them as current specifications.

`NEXT_DEVELOPMENT_PLAN.md` — lists mock disease outputs (Normal, Alzheimer Risk, Diabetic Retinopathy, Glaucoma, AMD, Hypertensive Retinopathy) that are not live; superseded by `YSC_MASTER_PLAN_EN.md`.

`MVP_BACKEND_PLAN.md` — describes hospital tenant model and mock AI job; superseded by `YSC_MASTER_PLAN_EN.md`.

---

## Presentation materials that conflict with current implementation

The following files in the project root were created before the current scope was locked. They must not be shown to YSC judges as representing current system capability without the reconciliation decision in DECISIONS.md D1 being resolved.

`Presentation Thermoeye For Alzheimer's Screening.pdf` — title claims AD screening capability not present in code.

`Poster Thermoeye For Alzheimer's Screening.pdf` — same issue.

`Thermoeye_System_Summary.html` / `.pdf` — review required; may contain disease claims not supported by current model_card.json.
