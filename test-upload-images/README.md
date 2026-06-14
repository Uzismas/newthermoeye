# Thermoeye Upload Test Images

Use these folders to test the web upload screen at `/console/cases`.

Important: this is a deterministic demo/ruleset workflow, not a clinically trained diagnostic model. The app has not been trained from these 14 test images. For known filenames below, the app maps the file to controlled demo metrics so the expected result is stable.

## Current Training Status

- Real trained model: not yet.
- Current behavior: rule-based screening demo + optional Vision API fallback if API keys are configured.
- Known fixture images: deterministic expected result by filename.
- Unknown uploaded images: analyzed by `/api/analyze` if an AI API key exists, otherwise browser canvas fallback/ruleset. Unknown images should not be treated as medical truth.
- Autism output: not supported in the current `DiseaseKind` list, so the app cannot output Autism as a disease result yet.

## Expected Folders

| Folder | Expected primary result |
| --- | --- |
| `01_EXPECT_Alzheimer_Risk` | Alzheimer Risk |
| `02_EXPECT_Diabetic_Retinopathy` | Diabetic Retinopathy |
| `03_EXPECT_Glaucoma` | Glaucoma |
| `04_EXPECT_AMD` | AMD |
| `05_EXPECT_Hypertensive_Retinopathy` | Hypertensive Retinopathy |
| `06_EXPECT_Pathologic_Myopia` | Pathologic Myopia |
| `07_EXPECT_Normal` | Normal |
| `08_EXPECT_Quality_Blocked` | Quality Blocked |
| `09_AUTISM_NOT_SUPPORTED` | Not Autism. Current app maps this placeholder to Alzheimer-risk style demo metrics because Autism is not implemented. |

## How To Test

1. Open `http://localhost:3000/console/cases`.
2. Choose one image from a folder.
3. Keep or change case code/age/sex.
4. Click `Queue secure screening`.
5. The app opens Analysis Results and shows the expected disease signal percentage.

## Expected Percentages For Fixture Names

| File prefix | Expected result |
| --- | --- |
| `TE-REF-ALZ-01` | Alzheimer Risk, about 71% |
| `TE-REF-ALZ-02` | Alzheimer Risk, about 46% |
| `TE-REF-DR-01` | Diabetic Retinopathy, about 65% |
| `TE-REF-DR-02` | Diabetic Retinopathy, about 64% |
| `TE-REF-GLA-01` | Glaucoma, about 42% |
| `TE-REF-GLA-02` | Glaucoma, about 36% |
| `TE-REF-AMD-01` | AMD, about 53% |
| `TE-REF-AMD-02` | AMD, about 47% |
| `TE-REF-HTN-01` | Hypertensive Retinopathy, about 48% |
| `TE-REF-PM-01` | Pathologic Myopia, about 44% |
| `TE-REF-NORM-01` | Normal, about 12% |
| `TE-REF-NORM-02` | Normal, about 12% |
| `upload-demo-quality-blocked-octa` | Quality Blocked |
| `autism-not-supported-placeholder` | Not Autism; current app cannot output Autism |
