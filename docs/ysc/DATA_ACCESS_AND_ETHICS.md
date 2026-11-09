# Data Access and Ethics — Phase 1

Status: DRAFT — Phase 1 output. Baseline date: 2026-10-01.

This document records the access basis, ethical considerations, and permitted use for each data
category in the project. It does not confer permissions; it records what has been established and
what is still required before each category can be used in competition materials or training.

---

## ROSE-O (Zenodo 12775880)

Access basis: ROSE-O is a public academic dataset published on Zenodo. It was downloaded and used
to train the vessel segmentation model. DATASET_REVIEW_TH.md states the dataset is permitted
("ได้รับอนุญาตแล้ว") without citing the specific Zenodo record license text or URL.

Required evidence before competition use: The specific Zenodo record license (expected to be CC BY
4.0 or similar) must be confirmed by reading the Zenodo record at https://zenodo.org/records/12775880
and the license string must be noted in this document. The license must be checked to confirm it
covers: (a) research training use, (b) presentation of derived results at a non-commercial student
competition, and (c) publication of derived metrics (Dice score, vessel density measurements).

Current permission status: NEEDS-EVIDENCE. The same single confirmation unblocks both the demo
asset gate (G1a) and the segmentation data gate (G1b).

How to close this item: Saudi (or another team member) opens https://zenodo.org/records/12775880,
reads the license field, and adds the confirmed license string and date to this section. If the
license is CC BY 4.0 or equivalent, add: "License confirmed: CC BY 4.0, confirmed [date] by [name]."

Ethics: ROSE-O is a published, de-identified academic dataset. No patient-level identifiers are
present in the local files — all subject_id values in metadata.csv are image-derived file identifiers.
No IRB approval is required by this project to use a publicly released de-identified research dataset
for academic model training. If the project advances to any patient-facing application or clinical
deployment, a separate ethics review is required at that stage.

Patient independence limitation: The GroupShuffleSplit groups used in training are image-derived, not
confirmed patient-independent. This is a known limitation recorded in BASELINE_STATUS.md and
model_card.json. It must be disclosed as a caveat in any published or presented performance metric:
"Dice 0.7078 on the 9-image published ROSE-O test split; subject-level independence is unconfirmed
because group IDs are image-derived."

---

## Internet reference images (internet-reference-images/)

Access basis: Nine images were downloaded from publicly accessible web pages belonging to Duke Eye
Center, Springer Nature / Eye and Vision, EyeWiki / American Academy of Ophthalmology, AMD Book
(Wills Eye Hospital), and EyeRounds / University of Iowa. All manifest.json entries carry a use_note
stating "check reuse rights before public distribution." None have confirmed reuse rights for
competition presentation.

Current permission status: UNVERIFIED for all nine items. No documentary permission exists in this
repository for any of them.

Required steps before competition use of each image:

IR-01 (Duke Eye Center): The image appears on an institutional news page at
https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms.
Institutional news images are typically all-rights-reserved unless stated otherwise. Contact Duke
Eye Center communications to request written permission for non-commercial student competition use,
or confirm the page's explicit license terms. If permission cannot be confirmed before the competition,
this image must be removed from all competition materials.

IR-02 and IR-03 (Springer Nature / Eye and Vision): The source article at
https://eandv.biomedcentral.com/articles/10.1186/s40662-019-0160-3 is an open-access BioMed Central
article. BioMed Central articles are typically published under CC BY 4.0, which permits reuse with
attribution. Read the article's license statement, confirm it is CC BY 4.0, and record the license
string. If confirmed, these two images may be used in competition materials with proper citation.

IR-04 and IR-05 (EyeWiki / AAO): EyeWiki content may carry CC BY-SA or similar terms. Check the
specific image page and the EyeWiki image use policy at eyewiki.org to confirm the license. Record
the confirmed license string before use.

IR-06 and IR-07 (AMD Book): amdbook.org is an educational resource from Wills Eye Hospital. No
automatic open license applies. Check the site's terms of use or contact AMD Book for confirmation
of non-commercial competition presentation use.

IR-08 and IR-09 (EyeRounds / University of Iowa): EyeRounds case images are educational material.
Check https://eyerounds.org/about/terms.htm or equivalent for the terms of use, and confirm whether
non-commercial student competition presentation is covered.

Interim rule: Until rights are confirmed for each image, all nine must be removed from the
competition poster, slide deck, demo screen, and any PDF submitted to or displayed at YSC. The M1
demo does not require any of these images and is unaffected. See DECISIONS.md D4 for the decision
record.

---

## Data not present — disease cohort

No disease-cohort data (AD/MCI diagnosis labels, biomarker records, or any other clinical outcome
data) is present in this repository. If such data is acquired in future phases, the following
must be in place before any training or analysis begins: a documented data access agreement covering
the specific research purpose, confirmation of ethics/IRB approval for model training use, a
data-access register entry in this document, and review by a qualified advisor. This is in addition
to the standard license and permission checks required for all datasets.
