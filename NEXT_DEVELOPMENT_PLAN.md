# Thermoeye Next Development Plan

Last updated: 2026-06-15

## Current Status

- Web app runs as a Next.js clinical-console demo.
- Upload workflow works with deterministic fixture images in `test-upload-images/`.
- Reference/demo cases are wired through `features/clinical-console/reference-cases.ts`.
- Publicly served demo case assets live in `public/clinical-cases/`.
- Internet reference images from medical/research pages live in:
  - `internet-reference-images/`
  - `public/internet-reference-images/`
- Current disease outputs:
  - Normal
  - Alzheimer Risk
  - Diabetic Retinopathy
  - Glaucoma
  - AMD
  - Hypertensive Retinopathy
  - Pathologic Myopia
  - Quality Blocked
- Autism is not implemented as a model output yet.
- Important limitation: current behavior is demo/ruleset + filename fixtures, not a trained medical model.

## Next Priority

1. Make the test workflow honest and stable.
2. Build a real data pipeline for training/validation.
3. Train a small baseline model per disease group.
4. Replace fixture-only logic with model-backed inference.
5. Add clinical validation/reporting safeguards before claiming real use.

## Phase 1: Data And Reference Organization

- [ ] Create a `datasets/` folder outside git or add it to `.gitignore` if local datasets are large.
- [ ] Create a dataset manifest format:
  - `image_path`
  - `source`
  - `license`
  - `disease_label`
  - `modality`
  - `split`
  - `notes`
- [ ] Separate image types clearly:
  - OCTA
  - OCT
  - Fundus
  - Research figure/composite image
  - Synthetic/demo image
- [ ] Do not train on composite article figures unless intentionally using them only as UI/reference examples.
- [ ] Add a README explaining which images are allowed for:
  - UI demo
  - internal testing
  - model training
  - public presentation

## Phase 2: Dataset Acquisition

- [ ] Download/prepare real datasets for each condition where licensing allows use.
- [ ] Candidate dataset groups:
  - Diabetic Retinopathy: APTOS, Messidor-style data, EyePACS-style data if available
  - Glaucoma: RIM-ONE, REFUGE-style optic disc datasets
  - AMD: OCT datasets such as Kermany OCT where license allows
  - Hypertensive/Vascular: STARE, DRIVE, vessel segmentation datasets
  - Pathologic Myopia: PALM/myopia datasets where license allows
  - Alzheimer/OCTA: hardest category; likely needs paper datasets, institutional data, or manual literature-derived prototype only
- [ ] Record license and source URL for every dataset before use.
- [ ] Keep downloaded datasets out of the app bundle and out of `public/`.

## Phase 3: Training Baseline

- [ ] Decide first model scope:
  - Option A: binary models per disease
  - Option B: one multi-class model
  - Recommended first: binary/one-vs-rest baseline per disease because labels and modalities differ.
- [ ] Build preprocessing scripts:
  - resize/crop
  - normalize color/grayscale
  - split train/validation/test
  - reject low-quality images
- [ ] Add `backend/train/` pipeline updates:
  - dataset loader
  - metrics logger
  - model checkpoint export
  - confusion matrix output
- [ ] Track metrics:
  - accuracy
  - sensitivity/recall
  - specificity
  - AUROC
  - calibration
  - false negative examples
- [ ] Save model cards per disease.

## Phase 4: Inference API

- [ ] Replace fixture-only upload analysis with backend inference.
- [ ] Add endpoint:
  - `POST /api/analyze` for image upload
  - model output includes primary disease, score, confidence, quality gate, and differential scores
- [ ] Keep current deterministic fixtures for demo testing, but label them as fixtures.
- [ ] Add a feature flag:
  - `NEXT_PUBLIC_ANALYSIS_MODE=fixture|ruleset|model`
- [ ] Add clear UI badge showing which analysis mode is active.

## Phase 5: UI Improvements

- [ ] Add a dedicated Test Images page or panel linking to expected cases.
- [ ] Show source/provenance for each reference case in the analysis view.
- [ ] Show whether the case came from:
  - upload
  - fixture
  - internet reference
  - synthetic demo
  - trained model inference
- [ ] Add warning copy when using non-diagnostic demo mode.
- [ ] Add visual comparison between uploaded image and reference image class.
- [ ] Add reviewer notes per disease, not only Alzheimer-oriented wording.

## Phase 6: Backend And Persistence

- [ ] Add real database persistence.
- [ ] Persist:
  - cases
  - uploads
  - analysis outputs
  - reviews
  - audit events
  - source metadata
- [ ] Add authenticated sessions with secure cookies.
- [ ] Add hospital/tenant authorization boundaries.
- [ ] Add object storage for raw and processed images.
- [ ] Add background workers for image processing and model inference.

## Phase 7: Validation And Safety

- [ ] Add clinician-facing disclaimer for demo/model mode.
- [ ] Add quality gate before inference.
- [ ] Prevent report release for:
  - quality blocked scans
  - unsupported modality
  - model confidence below threshold
  - missing doctor review
- [ ] Add validation report export:
  - dataset summary
  - metrics
  - known limitations
  - intended use
  - not-for-diagnosis statement until clinically validated

## Phase 8: Deployment

- [ ] Create `.env.example` for all required settings.
- [ ] Add production Docker setup.
- [ ] Add CI checks:
  - lint
  - typecheck
  - build
  - smoke
  - a11y
- [ ] Add deployment notes for:
  - web app
  - inference backend
  - database
  - storage
  - secrets

## Immediate Next Session Checklist

1. Confirm whether the next goal is real model training or UI/product polish.
2. If training: choose one disease to train first, preferably Diabetic Retinopathy or Glaucoma because public datasets are easier to obtain.
3. Create dataset manifest and `.gitignore` rules for local datasets.
4. Download one allowed dataset and build the first preprocessing script.
5. Add a visible analysis-mode badge to the app so demo output cannot be mistaken for trained model output.

## Current Commands

Use these from `D:\Themoeye\project\teng1`:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run dev
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run build
```

## Current Useful Folders

- `test-upload-images/`: images for predictable upload workflow testing.
- `internet-reference-images/`: downloaded internet reference images with metadata.
- `public/internet-reference-images/`: same reference images served by the web app.
- `public/clinical-cases/`: demo/reference case images used by seeded cases.
- `features/clinical-console/reference-cases.ts`: reference case definitions and controlled metrics.
- `features/clinical-console/components/cases-view.tsx`: upload fixture mapping and browser analysis fallback.
