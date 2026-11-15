# Dataset request emails (OCTA-500 and ROSE)

Fill in the `<...>` parts, then send from your own email. Both datasets are for academic, non-commercial research only.
Keep downloaded data out of git (put it in `backend/train/data/`, which is ignored).

---

## 1. OCTA-500 (password for the IEEE DataPort files)

- Dataset page: https://ieee-dataport.org/open-access/octa-500 (log in to IEEE DataPort to download the zip files)
- Send to: chen2qiang@njust.edu.cn
- Subject (exact format required): `OCTA500: <school or organization>: <your full name>`

```
Dear Prof. Chen,

I am a high-school student at <school name>, <city>, Thailand, working on a science project
under the supervision of <teacher name>. Our project, "Eyezheimer", studies retinal OCTA
biomarkers (vessel density and foveal avascular zone area) that research has linked to
Alzheimer's disease.

Organization details: <school name, address, teacher name and email>
Main works: an OCTA vessel segmentation model trained on 30 ROSE-O images (Dice 0.70 on
the 9 test images) and an automatic FAZ measurement (Dice 0.87 against expert FAZ labels).
Intended use: train and evaluate vessel and FAZ segmentation on OCTA-500 (3 mm and 6 mm),
for academic, non-commercial research only. We will cite your Medical Image Analysis 2024
paper and will not redistribute the data.

Could you please share the password for the OCTA-500 files?

Thank you very much,
<your full name>
<school name>
```

---

## 2. ROSE (full ROSE-1 and the Alzheimer / control group of each subject)

- Dataset page: https://imed.nimte.ac.cn/dataofrose.html
- Send to: yitian.zhao@nimte.ac.cn (cc: yalin.zheng@liverpool.ac.uk)
- Subject: `ROSE: <school or organization>: <your full name>: academic research`

```
Dear Prof. Zhao,

I am a high-school student at <school name>, Thailand, working on a science project under the
supervision of <teacher name>. We used the public ROSE-O images to train an OCTA vessel
segmentation model and to measure the foveal avascular zone (FAZ).

Organization details: <school name, address, teacher name and email>
Main works: vessel segmentation (Dice 0.70) and automatic FAZ area (Dice 0.87 against the
ROSE-O FAZ labels) on the 9 ROSE-O test images.
Intended use: academic, non-commercial research only; we will cite your IEEE TMI 2020 paper and
will not redistribute the data.

We would like to request:
1. The full ROSE-1 dataset (SVC, DVC and IVC images with annotations).
2. If possible, the group of each ROSE-1 subject (Alzheimer's disease or healthy control),
   and which ROSE-O images belong to which subject. We would use these only to test whether
   FAZ area differs between the groups, as reported in the literature.

Thank you very much for considering our request,
<your full name>
<school name>
```
