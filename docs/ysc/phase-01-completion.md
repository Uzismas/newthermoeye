# Phase 1 Completion Record

Phase: 1 — Verify datasets, sample rights, and disease-data feasibility
Status: PARTIAL
Date: 2026-10-01
Executed by: AI agent

---

## Files changed and deliverables

| File | Action |
| --- | --- |
| docs/ysc/DATASET_REGISTER.md | CREATED — full inventory of all locally present data items with SHA256 hashes, source, modality, annotation type, and permission status |
| docs/ysc/DATA_ACCESS_AND_ETHICS.md | CREATED — access basis, ethics notes, and required confirmation steps for each data category |
| docs/ysc/DISEASE_DATA_FEASIBILITY.md | CREATED — GO/NO-GO/NEEDS-EVIDENCE decisions for G1a (demo asset), G1b (segmentation data), G1c (disease cohort) |

---

## Verification evidence

All findings are based on direct inspection of repository files. No data was invented.

ROSE-O archive: confirmed present at backend/train/data/ROSE-O.zip,
SHA256 41cd5f1bb32cceed91bb32640033b8af11c2d2759bd365fbcaa006c77d56f05f.
Metadata CSV: 39 rows (30 train, 9 test), confirmed by `cut | sort | uniq -c`.
Subject IDs: all image-derived ("rose_o_train_01" etc.) — no clinical patient identifiers.

ONNX model: confirmed present at backend/models/octa/octa_vessel_unet.onnx,
SHA256 195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87.
Matches model_card.json artifact_sha256 — VERIFIED.

Internet reference images: 9 files confirmed present; SHA256 hashes computed and recorded in
DATASET_REGISTER.md. All 9 carry UNVERIFIED rights status per manifest.json use_note fields.

No AD/MCI cohort, no APTOS 2019, no ROSE.zip multi-layer, and no OCTA-500 found locally.

---

## Acceptance criteria

| Criterion | Result | Notes |
| --- | --- | --- |
| G1a — Demo asset gate | NEEDS-EVIDENCE | ROSE-O images available; Zenodo license text not confirmed in repo |
| G1b — Segmentation data gate | NEEDS-EVIDENCE | Same license confirmation unblocks both G1a and G1b |
| G1c — Disease cohort gate | NO-GO | No disease-label data present; Phase 9 cannot start |
| D4 closed (internet-reference-image rights) | PARTIAL | Rights confirmed as UNVERIFIED; D4 cannot be fully closed because Saudi has not made the final call on each image. See below. |

---

## Decision D4 — Status and recommended action

D4 in DECISIONS.md asked: can the internet reference images be used in competition materials?

Finding: None of the nine images have confirmed reuse rights for competition presentation use.
All nine must be treated as UNVERIFIED and excluded from competition materials until rights are
confirmed per the steps in DATA_ACCESS_AND_ETHICS.md.

IR-02 and IR-03 (Springer / BioMed Central) are likely CC BY 4.0 and can probably be confirmed
with a single check of the article license statement. The others require more effort.

IR-01 (Duke Eye Center) is the highest-risk item because institutional news images are typically
all-rights-reserved. If Saudi cannot confirm permission before the competition, this image should
be removed from all competition materials.

Recommended closure of D4: Saudi reads DATA_ACCESS_AND_ETHICS.md, confirms rights or removes
images for each of the nine items, and updates DECISIONS.md D4 with the final call.

This agent is not authorized to resolve D4 by inference. The decision remains OPEN in DECISIONS.md
pending Saudi's review.

---

## Scientific, privacy, licensing, and security limitations

- ROSE-O license text was not verified in this phase; Zenodo record 12775880 must be checked.
- Patient-independence of the ROSE-O train/test split is unconfirmed; group IDs are image-derived.
- No patient data was accessed or processed.
- No data was downloaded, uploaded to external services, or transmitted outside the repository.
- Disease outputs remain null; no classifier development was conducted.

---

## Human decisions or approvals still required

1. Saudi: Confirm ROSE-O license at https://zenodo.org/records/12775880 and record the license
   string and date in DATA_ACCESS_AND_ETHICS.md. This single action closes both G1a and G1b.

2. Saudi: For each of the nine internet reference images, check rights per
   DATA_ACCESS_AND_ETHICS.md and close D4 in DECISIONS.md with the confirmed decisions.

3. Saudi (or team): Resolve DECISIONS.md D1 (handling of Alzheimer's Screening materials) and
   D2 (origin of 70–80% accuracy claim) — these are not Phase 1 tasks but remain open blockers
   for G1.

4. If disease classifier development is ever pursued, all five prerequisites listed in
   DISEASE_DATA_FEASIBILITY.md under Gate G1c must be met, with advisor and ethics review,
   before Phase 9 begins.

---

## Next recommended phase

Phase 2 — Reliable offline runtime.

Phase 2 can proceed in parallel with the G1 license confirmation. It does not require G1 to be
fully closed. The M1 demo path is unaffected by G1c (NO-GO on disease data).
