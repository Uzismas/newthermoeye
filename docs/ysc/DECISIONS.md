# Decisions Log

Status: DRAFT — Phase 0 output. Baseline date: 2026-10-01.

This file records open decisions that cannot be deferred and decisions that have been resolved. Every entry that is still open must be closed before the gate it blocks. AI agents must not proceed past a gate if the decisions blocking that gate are still open.

---

## Open decisions

### D1 — How to handle "For Alzheimer's Screening" in existing presentation materials

Gate blocked: G1 (Phase 1)

The existing poster and PDF are titled "Thermoeye For Alzheimer's Screening." The current model has `disease_classifier_available: false` and is scoped to vessel segmentation only. These materials will be seen by YSC judges and must either be corrected or withdrawn before the competition.

Options:

A. Revise title and content of poster and PDF to accurately describe the research prototype and its vessel-segmentation scope. Prepare a new version for the competition.

B. Present the existing materials as "preliminary concept" and use an updated live demo and verbal presentation that corrects the record, with explicit judge Q&A wording from DEMO_SCOPE.md.

C. Withdraw the poster and PDF entirely; demo only the live system.

Decision owner: Saudi (project lead). Must be resolved before Phase 1 DATASET_REGISTER gate.

Current state: OPEN

---

### D2 — Origin and status of the "70–80% accuracy" claim

Gate blocked: G1 (Phase 1)

The CLAIMS_EVIDENCE_MATRIX (A3) records this claim as CONTRADICTED. No disease-classification experiment has been found in the repository that produced this number. Dice 0.7078 on segmentation is the only numeric result in model_card.json.

The team must determine: where did this number come from? Options include a misread of the Dice coefficient, a figure from a reference paper incorrectly attributed to this system, or an earlier prototype experiment not tracked in this repository.

The answer determines how to respond to judges who ask about accuracy. If the number came from a reference paper, the team must cite the paper and clarify it is not a result of this system. If it came from a misread of Dice, the approved wording in DEMO_SCOPE.md applies.

Decision owner: Saudi. Must be resolved before Phase 1 gate so that all competition materials use correct wording.

Current state: OPEN

---

### D3 — Product name: Thermoeye or Eyezheimer

Gate blocked: G4 (Phase 4, UI polish)

The live application uses "Thermoeye." The submitted YSC proposal and presentation materials use "Eyezheimer." Both names appear in the repository. The competition requires a consistent name across all submitted materials and the live demo.

Options:

A. Adopt "Thermoeye" as the canonical name; update proposal materials and presentations to match.

B. Adopt "Eyezheimer" as the canonical name; update the live application and all code references to match.

C. Use both with a formal relationship (e.g., "Eyezheimer powered by Thermoeye" or "Thermoeye [Eyezheimer]"), subject to YSC submission rules allowing this.

Decision owner: Saudi. Must be resolved before Phase 4 gate so UI, PDF headers, and competition materials are consistent.

Current state: CLOSED — 2026-10-02

Resolution: Saudi chose Option B on 2026-10-02. "Eyezheimer" is now the canonical product name. The live application UI strings, document title, report header, sidebar aria-label, and image alt text have been updated to "Eyezheimer". The logo image file remains `thermoeye-logo-logoremovebg.png` (filename only — no user-visible text affected). Competition materials (presentation PDFs, poster) still use "Eyezheimer" and no changes to those files are required. File `ThermoeyeConsole.tsx` retains its filename (renaming the file is not required to satisfy G4; only user-visible strings matter).

---

### D4 — Image rights for internet-reference-images/

Gate blocked: G1 (Phase 1)

Nine images are present in `internet-reference-images/`. All nine carry the use_note "check reuse rights before public distribution" in `internet-reference-images/manifest.json`. All nine are recorded as UNVERIFIED in Phase 1 DATASET_REGISTER.md (DR-3). None may be used in competition materials (poster, slide deck, demo screen, research PDF) until reuse rights for competition presentation have been confirmed in writing from the respective source institution.

Per-image SHA256 hashes and source URLs are in DATASET_REGISTER.md DR-3 and DATA_ACCESS_AND_ETHICS.md.

| ID | File | Provisional source |
| --- | --- | --- |
| IR-01 | 01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg | Duke Eye Center |
| IR-02 | 02_diabetic-retinopathy_springer-fa-octa-comparison.png | Eye and Vision / Springer Nature |
| IR-03 | 03_diabetic-retinopathy_springer-montaged-octa.png | Eye and Vision / Springer Nature |
| IR-04 | 04_normal_eyewiki-healthy-octa-disc.png | EyeWiki / AAO |
| IR-05 | 05_glaucoma_eyewiki-glaucomatous-octa-disc.png | EyeWiki / AAO |
| IR-06 | 06_amd_amdbook-type1-cnv-octa.png | AMD Book |
| IR-07 | 07_amd_amdbook-type2-cnv-octa.png | AMD Book |
| IR-08 | 08_pathologic-myopia_eyerounds-oct-cnvm-lacquer-crack.jpg | EyeRounds / University of Iowa |
| IR-09 | 09_pathologic-myopia_eyerounds-fundus-lacquer-crack.jpg | EyeRounds / University of Iowa |

Decision owner: Saudi. Per-image next steps (contact, email template, fallback) are in DATA_ACCESS_AND_ETHICS.md. If rights cannot be confirmed for an image, that image must be removed from all competition materials.

Current state: OPEN

---

## Resolved decisions

### D3 resolved — 2026-10-02

Saudi chose Option B: "Eyezheimer" is the canonical product name. See full resolution note under the D3 entry above.

---

## How to close a decision

To close a decision, add a "Resolution" subsection under the entry with: the date, the chosen option, who made the call, and any follow-up tasks created. Change the "Current state" line to CLOSED — [date]. Do not delete the original options; keep them for audit trail.

---

## Progress log — 2026-11-09 (after YSC round-1 feedback: site not credible, untested, model weak)

Actions taken by engineering (the project lead has not yet formally closed D1/D2/D4; these are the repo-side steps already done):

- D1: Public surfaces no longer claim Alzheimer's screening. `/` is now an honest landing page; `web/index.html` (GitHub Pages) was replaced; the old fabricated-data mockup and `public/project-summary.html` were moved to `docs/archive/` (not served). Login copy changed to "research prototype". **Still required from the team:** new poster and slide deck. The existing PDFs ("For Alzheimer's Screening") are binary files and were not edited; do not present them to judges.
- D2: Still OPEN. The "70–80% accuracy" figure has no source in the repository; do not use it anywhere.
- D4: `public/internet-reference-images/` (duplicate) and the four Frontiers figures in `public/research/` were moved out of the served `public/` tree into `internet-reference-images/`. Rights remain UNVERIFIED; nothing deleted.
- Security: in production builds the session token is no longer the literal `pilot-doctor`; set `THERMOEYE_SESSION_TOKEN` for any deployment beyond a trusted machine.
