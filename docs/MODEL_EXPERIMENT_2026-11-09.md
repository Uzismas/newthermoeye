# OCTA vessel-segmentation experiment — 2026-11-09

Research only. Segmentation overlap (Dice) is **not** disease accuracy.

## Setup

- Data: ROSE-O published split — 30 train / 9 test images (image-derived IDs; patient independence unverified).
- Model: same SmallUNet as the deployed artifact, 256×256, BCE + soft-Dice, AdamW + OneCycle, 40 epochs, CPU.
- Selection: 3-fold cross-validation on the 30 train images only. The 9 test images were scored once, after the configuration was fixed.
- Script: `backend/train/train_octa_experiment.py`. Raw output: `backend/models/octa_candidate/{cv_report.json,experiment_report.json}`, logs `backend/models/{cv_run.log,final_run.log}`.

## Results

| Configuration | CV Dice (mean ± sd, 3 folds) |
| --- | --- |
| No augmentation | **0.709 ± 0.009** |
| Flip/rotate/affine/intensity augmentation | 0.687 ± 0.029 |

| Model on 9 test images | Dice | IoU | Sensitivity | Specificity |
| --- | --- | --- | --- | --- |
| Deployed artifact (re-scored today, same metric code) | 0.708 | 0.549 | 0.778 | 0.905 |
| Candidate (no-aug, trained on all 30) | 0.712 | 0.554 | 0.756 | 0.917 |

The deployed artifact's recorded Dice (0.7078) was reproduced exactly.

## Decision

**Not promoted.** The +0.005 Dice difference is smaller than the fold-to-fold spread and is measured on 9 images, so it is not evidence of a better model. The deployed artifact (`backend/models/octa/octa_vessel_unet.onnx`, SHA in `model_card.json`) is unchanged.

Augmentation at 40 epochs hurt; it likely needs a longer schedule, which is impractical on this CPU-only machine (~3.3 s per batch).

## What would actually move the number

1. More labelled OCTA vessel data (ROSE full set, OCTA-500 after licence check) — the largest lever.
2. A GPU to allow longer schedules and augmentation.
3. Patient-level IDs so the split can be trusted.

None of these produce a disease classifier. That still needs an ethics-approved, clinically labelled cohort (see `docs/HOSPITAL_COLLABORATION_BRIEF_TH.md`).
