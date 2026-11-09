# Demo Scope — YSC M1 Competition Demonstration

Status: DRAFT — Phase 0 output. Baseline date: 2026-10-01.

This document defines what the competition demo shows, what it explicitly does not show, and the exact wording to use. All judges' Q&A answers must be consistent with this scope.

---

## What the demo shows (in scope for M1)

The demo presents a retinal OCTA vessel-analysis research prototype that does the following in a single repeatable workflow:

1. Upload a permitted OCTA fundus image (grayscale, JPEG/PNG/WebP/TIFF, minimum 64×64 px).
2. Run real ONNX-based vessel segmentation using `octa_vessel_unet.onnx`.
3. Display the original image alongside the predicted vessel mask/overlay.
4. Report vessel density as a defined, unitless percentage (vessel pixels / all pixels × 100).
5. Report image quality status (pass / blocked with reason).
6. Show processing time with an honest clock boundary (to be defined during Phase 7 measurement).
7. Allow a researcher to enter a review note and approve the analysis for report generation.
8. Generate a downloadable research PDF that includes: case ID, thumbnail pair, vessel density with definition, model/preprocessing version, timestamp, provenance hash, reviewer role, review note, and research-only limitations disclaimer.

This is what M1 is and nothing more. Every other feature either does not exist yet or is explicitly excluded from the M1 demo path.

---

## What the demo explicitly does NOT show (out of scope for M1)

The following must not be claimed, displayed, implied, or presented to judges as current capability:

- Alzheimer's disease prediction, classification, screening, or detection of any kind.
- MCI (mild cognitive impairment) classification.
- Disease risk percentages, probabilities, or scores of any kind.
- Longitudinal or early-detection claims.
- Any disease output labeled "Normal", "Alzheimer Risk", "Diabetic Retinopathy", "Glaucoma", "AMD", or "Hypertensive Retinopathy." These existed as mock fixtures in an older plan and have no live classifier behind them.
- Anatomical FAZ (foveal avascular zone) area measurement. The central-rectangle proxy is not anatomical FAZ.
- Perfusion density (null/unavailable in the current implementation).
- Hospital integration, PACS, DICOMweb, or multi-tenant clinical deployment.
- Production-grade patient data protection or clinical validation of any kind.
- AUC > 0.90 or any disease-classifier performance metric as a current result.

---

## Permitted demo inputs

For M1, only the following categories of images may be used during the demonstration:

| Category | Permission requirement | Use |
| --- | --- | --- |
| Permitted OCTA sample (positive result) | Documentary permission confirmed in Phase 1 DATASET_REGISTER | Primary demo case: shows real mask and measurement |
| Permitted low-quality OCTA sample | Same as above, or a clearly synthetic degraded version | Secondary demo case: shows quality-blocked failure state |
| Invalid / wrong modality input | Clearly synthetic or publicly licensed non-OCTA image | Tertiary demo case: shows input rejection with an informative error |

No image may be presented as an "AD patient" or "MCI case" without genuine clinical labels and Phase 1 disease gate approval.

---

## Competition demo environment requirements

Before the competition demo, the following environment settings must be confirmed on the demo server.

`THERMOEYE_ALLOW_EXTERNAL_VISION` must be unset or must not equal `true`. If this variable is set to `true` and a request also carries `allowExternal=true` in the upload form, the application will transmit uploaded image bytes to an external vision API (Anthropic Messages API or Google Generative AI API). This code path is present in `app/api/analyze/route.ts`, returns no AI analysis result, but does transmit image data to an external service. It must remain disabled for all competition use.

`THERMOEYE_SESSION_TOKEN` must be set to a non-default value before the demo. The application contains a prototype default session token in `features/clinical-console/server/store.ts` that grants clinical console access to any request carrying it. The default value must be replaced with a value known only to the demo operator and must not be shared or included in any demo setup guide distributed to third parties.

---

## Agreed demonstration narrative (four-minute script outline)

The following structure is approved for M1. Fill in confirmed details during Phase 8.

1. Problem framing (~45 sec): OCTA can reveal retinal vascular changes; automated vessel analysis could make this faster and more reproducible. Note that AD screening is the long-term research goal, not the current implementation.
2. Live demo run (~90 sec): Upload permitted OCTA image → wait → show mask overlay → read vessel density aloud → advance to review → add a note → generate and open PDF.
3. What we built (~45 sec): U-Net ONNX model trained on ROSE-O open dataset, Dice ≈ 0.71 on 9-image test set, local FastAPI + Next.js stack, offline-capable.
4. Failure/robustness (~30 sec): Show low-quality rejection or invalid-input blocking — the system knows its limits.
5. Research direction and honest gap (~30 sec): "AD screening requires authorized clinical data, a patient-independent study, and a separate validation pipeline. This is our next research step."

---

## What to say when judges ask about Alzheimer's detection

Exact approved answer: "Alzheimer's detection is our research goal, but it is not implemented in this demo. What you are seeing is vessel segmentation and density measurement. To validate a disease classifier, we would need an authorized cohort with confirmed diagnoses and a patient-independent evaluation. We have designed the system architecture to support that as a future step."

Do not say: "We detect Alzheimer's with 70-80% accuracy." Do not point to Dice as disease accuracy.
