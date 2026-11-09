# Dataset Register — Phase 1

Status: DRAFT — Phase 1 output. Baseline date: 2026-10-01.

This register inventories every data item available locally as of the Phase 1 baseline date. For
each item it records: source, version, modality, SHA256 hash, annotation type, permission status,
and allowed use. Items with UNVERIFIED or NEEDS-EVIDENCE status must not be used in competition
materials or the live demo until that status is resolved.

---

## DR-1 — ROSE-O segmentation dataset

| Field | Value |
| --- | --- |
| Role | Training and evaluation data for vessel segmentation |
| Source | ROSE dataset, Zenodo record 12775880 |
| Dataset name | ROSE-O |
| Version | As downloaded from Zenodo record 12775880 |
| Local archive | backend/train/data/ROSE-O.zip |
| Archive SHA256 | 41cd5f1bb32cceed91bb32640033b8af11c2d2759bd365fbcaa006c77d56f05f |
| Expanded metadata | backend/train/data/octa/metadata.csv (39 data rows) |
| Image count | 39 image/mask pairs: 30 train, 9 test (per metadata.csv and published ROSE-O split) |
| Modality | OCTA en-face |
| Device | Optovue AngioVue |
| Scan size | 3×3 mm |
| Layer | SVC/SCC (superficial capillary complex) |
| Annotation type | Binary vessel masks (.tif) |
| Subject identifiers | Image-derived only; all metadata.csv subject_id values are image IDs, not clinical patient records |
| Patient independence | UNVERIFIED — GroupShuffleSplit groups are image-derived; true patient-independence unconfirmed |
| Disease labels | None present |
| License status | NEEDS-EVIDENCE — Zenodo license text not formally cited in this repository |
| Allowed use (provisional) | Research training and evaluation; pending license confirmation for competition presentation |
| Burned-in identifiers | Not individually inspected; none expected for this published academic OCTA dataset |

Individual image hashes are not recorded at file level in this register. If a competition submission
requires per-image checksums, run sha256sum against each .tif in backend/train/data/octa/images/
and backend/train/data/octa/vessel_masks/ and append to this register.

---

## DR-2 — OCTA vessel segmentation ONNX artifact

| Field | Value |
| --- | --- |
| Role | Deployed inference model |
| Local path | backend/models/octa/octa_vessel_unet.onnx |
| SHA256 | 195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87 |
| Derived from | SmallUNet trained on DR-1 (ROSE-O); source checkpoint at backend/models/octa/octa_vessel_unet.pt |
| Test performance | Dice 0.7078 on 9-image published ROSE-O test split (model_card.json) |
| Disease classifier | None — disease_classifier_available: false in model_card.json |
| Clinical validation | Not performed — clinically_validated: false in model_card.json |
| Permission notes | Derived artifact from DR-1; inherits DR-1 license requirements |

---

## DR-3 — Internet reference images

These are third-party images downloaded from published web sources. They are not training data, not
patient records, and not annotated with ground truth. They appear in earlier presentation materials
(poster, PDF). Rights for competition presentation use are UNVERIFIED for all nine items.

| ID | File | Source | SHA256 | Rights status |
| --- | --- | --- | --- | --- |
| IR-01 | 01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg | Duke Eye Center | 79a08cfcb9dfc8ba19e2ad961445c5a7f2614010219c50828056ab6e2977ee5e | UNVERIFIED |
| IR-02 | 02_diabetic-retinopathy_springer-fa-octa-comparison.png | Eye and Vision / Springer Nature | 1ec9d91ccd0aae9a00010d3ac81a0402b8664661bab208e79cb90400618bd53a | UNVERIFIED |
| IR-03 | 03_diabetic-retinopathy_springer-montaged-octa.png | Eye and Vision / Springer Nature | bb35c00529c8a62690f44073b2a2357ab1347910c1bb6e1d9213bcb52a540a13 | UNVERIFIED |
| IR-04 | 04_normal_eyewiki-healthy-octa-disc.png | EyeWiki / AAO | 98f77f1a200a4f235c2ce0c2ed5db4ed502bb0889f6640e7e0cc1462c76b0613 | UNVERIFIED |
| IR-05 | 05_glaucoma_eyewiki-glaucomatous-octa-disc.png | EyeWiki / AAO | 7cc15f0aa98d9dbfa4ec57ce6e39a94de652bb0bce9be481caaf42350faf7449 | UNVERIFIED |
| IR-06 | 06_amd_amdbook-type1-cnv-octa.png | AMD Book | a59646e7e56a9bbc1aa34e16d1e1b95899b6ec63e9b1a21688407b155aa81628 | UNVERIFIED |
| IR-07 | 07_amd_amdbook-type2-cnv-octa.png | AMD Book | 2f245c79aed12e67d7feba5354333edf136253f626045036e45b1d91e99eade7 | UNVERIFIED |
| IR-08 | 08_pathologic-myopia_eyerounds-oct-cnvm-lacquer-crack.jpg | EyeRounds / University of Iowa | a7bba472d64ce47bc1d9d86d17635daf9be85b73a134790b30ff5a8f8e0ef735 | UNVERIFIED |
| IR-09 | 09_pathologic-myopia_eyerounds-fundus-lacquer-crack.jpg | EyeRounds / University of Iowa | 2cad5ee36a50a71d7bef25fbdbbdd6307206f1c631e62b070de0034909747e1a | UNVERIFIED |

Source URLs for each image are recorded in internet-reference-images/manifest.json.

None of these images may be used in YSC competition materials (poster, slide deck, demo screen,
PDF) until reuse rights for competition presentation have been confirmed in writing from the
respective source. The M1 demo does not require any of these images.

---

## Items not found locally

| Item | Expected use | Status |
| --- | --- | --- |
| AD/MCI cohort with diagnosis labels | Disease classifier training (Phase 9) | NOT PRESENT |
| APTOS 2019 DR dataset | DR branch training (train_dr.py) | NOT PRESENT (setup instructions exist) |
| ROSE.zip multi-layer (SVC/DVC/IVC) | Extended segmentation training | NOT PRESENT (only ROSE-O.zip present) |
| OCTA-500 | External segmentation set or pretraining | NOT PRESENT |

---

## How to update this register

When new data is acquired or rights are confirmed, add or update the relevant entry with:
the date of change, the new license string or permission reference, and the agent or person making
the change. Do not delete prior status entries; mark them superseded with date.
