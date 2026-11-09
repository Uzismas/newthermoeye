# Disease Data Feasibility — Phase 1

Status: DRAFT — Phase 1 output. Baseline date: 2026-10-01.

This document records the Phase 1 GO/NO-GO/NEEDS-EVIDENCE assessment for the three G1 gate
decisions. Each gate is independent; the segmentation and M1 demo paths remain open even if the
disease gate fails.

---

## Gate G1a — Demo asset permission gate

Question: Are there permitted OCTA images available for use in the M1 competition demonstration?

Evidence examined:
- ROSE-O dataset is present locally: 39 image/mask pairs (30 train, 9 test), Optovue AngioVue,
  3×3 mm, from Zenodo record 12775880.
- Archive SHA256: 41cd5f1bb32cceed91bb32640033b8af11c2d2759bd365fbcaa006c77d56f05f.
- DATASET_REVIEW_TH.md asserts the dataset is permitted without citing the specific Zenodo license.
- No AD/MCI disease labels are present; images carry no disease labels and must not be presented
  as AD or MCI cases.
- Internet reference images (9 items): all UNVERIFIED; ineligible for demo until rights are confirmed.

Decision: NEEDS-EVIDENCE.

ROSE-O is a published academic dataset. Research and academic presentation use is almost certainly
covered by its Zenodo license (expected CC BY 4.0 or similar), but the specific license text has not
been formally confirmed in this repository. A single action unblocks this gate: Saudi (or a team
member) reads the license field at https://zenodo.org/records/12775880 and records the license string
in DATA_ACCESS_AND_ETHICS.md with a date and their name.

Once confirmed, ROSE-O images are suitable as:
- Primary demo case: a real OCTA image showing vessel segmentation output and vessel density.
- Secondary demo case: a low-quality or degraded version demonstrating quality blocking.

They must be presented as "examples from the published ROSE-O dataset" and not labeled as any
disease case. Any disease label claim requires a separate gate (G1c) that is currently NO-GO.

---

## Gate G1b — Segmentation data permission gate

Question: Is the data used to train and evaluate the vessel segmentation model available under a
license that permits research training and reporting of derived metrics at a non-commercial student
competition?

Evidence examined:
- Same dataset as G1a: ROSE-O from Zenodo 12775880, 39 image/mask pairs, no confirmed license text.
- Training has already been completed using this dataset; Dice 0.7078 is the recorded result.
- Patient-independence caveat: GroupShuffleSplit groups are image-derived, not confirmed patient IDs.

Decision: NEEDS-EVIDENCE.

The same Zenodo license confirmation unblocks both G1a and G1b. Once the license is confirmed,
this gate can be marked GO, provided the patient-independence limitation is disclosed as follows in
all competition presentations: "Dice 0.7078 on the published 9-image ROSE-O test split; subject-level
independence is unconfirmed because group IDs are image-derived, not from clinical patient records."

---

## Gate G1c — Disease cohort feasibility gate

Question: Is there locally available data with disease labels (AD/MCI or other diagnoses) that could
support a separate disease classifier for Phase 9?

Evidence examined:
- No AD/MCI dataset is present in the repository.
- No other disease-label cohort is present (no APTOS 2019, no OCTDL, no clinical cohort).
- model_card.json: disease_classifier_available: false.
- DATASET_REVIEW_TH.md identifies candidate future datasets (OCTA-500, UK Biobank/AlzEye) but
  notes they require formal access applications and are not present locally.
- CLAIMS_EVIDENCE_MATRIX.md C2 classifies AD/MCI classification as a future research goal, not
  current implementation.

Decision: NO-GO.

No disease data is available to begin disease classifier development. Phase 9 cannot start.

This gate does not block M1. The M1 demo is fully independent of the disease track and is unaffected
by a NO-GO here.

To re-open this gate in a future phase, the following are required at minimum:
1. An authorized cohort with confirmed AD/MCI or related diagnosis labels at patient level.
2. Proper subject-level identifiers enabling a patient-independent train/validation/test split.
3. A documented data access agreement permitting model training use for this research purpose.
4. Ethics/IRB confirmation appropriate to the data source and intended use.
5. Review and approval by a qualified research advisor before any model fitting begins.

Until all five conditions are met, disease classifier development must not proceed.

---

## Summary table

| Gate | Question | Decision | What unblocks it |
| --- | --- | --- | --- |
| G1a — Demo asset | Permitted OCTA images for M1 demo? | NEEDS-EVIDENCE | Confirm ROSE-O Zenodo license text |
| G1b — Segmentation data | License covers training and metric reporting? | NEEDS-EVIDENCE | Same license confirmation as G1a |
| G1c — Disease cohort | Disease-label data available locally? | NO-GO | Acquire authorized disease cohort (future phase) |

The segmentation and M1 demo paths remain open. G1a and G1b are unblocked by a single
low-effort action: reading the Zenodo record license. G1c is a longer-horizon requirement
unrelated to M1 success.
