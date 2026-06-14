import { createCaseFromClinicalInput, createClinicalMetrics } from "./clinical-analysis";
import type { CaseRecord } from "./types";

type ReferenceCaseDefinition = {
  age: number;
  caseCode: string;
  context: string;
  eye: CaseRecord["eye"];
  fileName: string;
  imageUrl: string;
  scanType: string;
  sex: CaseRecord["sex"];
  sourceAsset: string;
  sourceNote: string;
  metrics: {
    artifactScore: number;
    brightness: number;
    confidenceScore: number;
    contrast: number;
    qualityScore: number;
    sharpness: number;
    vesselDensity: number;
  };
};

export const referenceCaseDefinitions: ReferenceCaseDefinition[] = [
  {
    caseCode: "TE-REF-ALZ-01",
    age: 67,
    sex: "F",
    scanType: "OCTA macula",
    eye: "OD",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-ALZ-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/alzheimer-risk-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for Alzheimer-risk screening workflow.",
    context: "Alzheimer-risk reference case - low vessel density and perfusion proxy",
    metrics: {
      artifactScore: 18,
      brightness: 118,
      confidenceScore: 88,
      contrast: 44,
      qualityScore: 96,
      sharpness: 82,
      vesselDensity: 20,
    },
  },
  {
    caseCode: "TE-REF-ALZ-02",
    age: 72,
    sex: "M",
    scanType: "OCTA macula",
    eye: "OS",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-ALZ-02/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/alzheimer-risk-02.jpg",
    sourceNote: "Synthetic OCTA-style reference case for moderate Alzheimer-risk screening workflow.",
    context: "Alzheimer-risk reference case - moderate FAZ and perfusion-risk signal",
    metrics: {
      artifactScore: 14,
      brightness: 130,
      confidenceScore: 86,
      contrast: 38,
      qualityScore: 91,
      sharpness: 76,
      vesselDensity: 32,
    },
  },
  {
    caseCode: "TE-REF-DR-01",
    age: 49,
    sex: "M",
    scanType: "OCTA macula",
    eye: "OD",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-DR-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/diabetic-ret-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for diabetic retinopathy screening workflow.",
    context: "Diabetic retinopathy reference case - FAZ enlargement and bright lesion proxy",
    metrics: {
      artifactScore: 44,
      brightness: 205,
      confidenceScore: 82,
      contrast: 62,
      qualityScore: 84,
      sharpness: 74,
      vesselDensity: 25,
    },
  },
  {
    caseCode: "TE-REF-DR-02",
    age: 52,
    sex: "F",
    scanType: "OCTA macula",
    eye: "OS",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-DR-02/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/diabetic-ret-02.jpg",
    sourceNote: "Synthetic OCTA-style reference case for diabetic retinopathy screening workflow.",
    context: "Diabetic retinopathy reference case - capillary dropout and exudate proxy",
    metrics: {
      artifactScore: 44,
      brightness: 200,
      confidenceScore: 81,
      contrast: 58,
      qualityScore: 86,
      sharpness: 72,
      vesselDensity: 25,
    },
  },
  {
    caseCode: "TE-REF-GLA-01",
    age: 58,
    sex: "F",
    scanType: "OCTA disc",
    eye: "OS",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-GLA-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/glaucoma-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for glaucoma screening workflow.",
    context: "Glaucoma reference case - low contrast and peripapillary perfusion proxy",
    metrics: {
      artifactScore: 42,
      brightness: 126,
      confidenceScore: 84,
      contrast: 2,
      qualityScore: 83,
      sharpness: 70,
      vesselDensity: 39,
    },
  },
  {
    caseCode: "TE-REF-GLA-02",
    age: 61,
    sex: "M",
    scanType: "OCTA disc",
    eye: "OD",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-GLA-02/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/glaucoma-02.jpg",
    sourceNote: "Synthetic OCTA-style reference case for glaucoma screening workflow.",
    context: "Glaucoma reference case - RNFL dropout pattern proxy",
    metrics: {
      artifactScore: 41,
      brightness: 126,
      confidenceScore: 83,
      contrast: 5,
      qualityScore: 84,
      sharpness: 69,
      vesselDensity: 41,
    },
  },
  {
    caseCode: "TE-REF-AMD-01",
    age: 78,
    sex: "F",
    scanType: "OCTA macula",
    eye: "OD",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-AMD-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/amd-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for AMD screening workflow.",
    context: "AMD reference case - drusen/CNV brightness and RPE integrity proxy",
    metrics: {
      artifactScore: 30,
      brightness: 220,
      confidenceScore: 80,
      contrast: 45,
      qualityScore: 89,
      sharpness: 68,
      vesselDensity: 48,
    },
  },
  {
    caseCode: "TE-REF-AMD-02",
    age: 80,
    sex: "M",
    scanType: "OCTA macula",
    eye: "OS",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-AMD-02/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/amd-02.jpg",
    sourceNote: "Synthetic OCTA-style reference case for AMD screening workflow.",
    context: "AMD reference case - age-weighted macular degeneration signal",
    metrics: {
      artifactScore: 28,
      brightness: 205,
      confidenceScore: 80,
      contrast: 42,
      qualityScore: 90,
      sharpness: 68,
      vesselDensity: 45,
    },
  },
  {
    caseCode: "TE-REF-HTN-01",
    age: 50,
    sex: "M",
    scanType: "OCTA widefield",
    eye: "OU",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-HTN-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/hypertensive-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for hypertensive retinopathy screening workflow.",
    context: "Hypertensive retinopathy reference case - high contrast and vessel irregularity proxy",
    metrics: {
      artifactScore: 43,
      brightness: 145,
      confidenceScore: 78,
      contrast: 78,
      qualityScore: 82,
      sharpness: 72,
      vesselDensity: 58,
    },
  },
  {
    caseCode: "TE-REF-PM-01",
    age: 32,
    sex: "F",
    scanType: "OCTA macula",
    eye: "OS",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-PM-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/pathologic-myopia-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for pathologic myopia screening workflow.",
    context: "Pathologic myopia reference case - low brightness and chorioretinal atrophy proxy",
    metrics: {
      artifactScore: 8,
      brightness: 70,
      confidenceScore: 83,
      contrast: 12,
      qualityScore: 92,
      sharpness: 69,
      vesselDensity: 34,
    },
  },
  {
    caseCode: "TE-REF-NORM-01",
    age: 41,
    sex: "F",
    scanType: "OCTA macula",
    eye: "OD",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-NORM-01/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/normal-octa-01.jpg",
    sourceNote: "Synthetic OCTA-style reference case for normal screening workflow.",
    context: "Normal reference case - preserved vessel density and image quality",
    metrics: {
      artifactScore: 4,
      brightness: 130,
      confidenceScore: 92,
      contrast: 36,
      qualityScore: 98,
      sharpness: 80,
      vesselDensity: 58,
    },
  },
  {
    caseCode: "TE-REF-NORM-02",
    age: 45,
    sex: "M",
    scanType: "OCTA macula",
    eye: "OU",
    fileName: "scan.jpg",
    imageUrl: "/clinical-cases/TE-REF-NORM-02/scan.jpg",
    sourceAsset: "test-assets/scans/synthetic-realistic/normal-octa-02.jpg",
    sourceNote: "Synthetic OCTA-style reference case for normal screening workflow.",
    context: "Normal reference case - normal perfusion and low artifact proxy",
    metrics: {
      artifactScore: 5,
      brightness: 132,
      confidenceScore: 93,
      contrast: 38,
      qualityScore: 98,
      sharpness: 81,
      vesselDensity: 62,
    },
  },
];

export const referenceCases: CaseRecord[] = referenceCaseDefinitions.map((definition) => {
  const metrics = createClinicalMetrics({
    ...definition.metrics,
    imageHeight: 512,
    imageWidth: 512,
  });

  const caseRecord = createCaseFromClinicalInput({
    age: definition.age,
    caseCode: definition.caseCode,
    eye: definition.eye,
    fileName: definition.fileName,
    metrics,
    scanType: definition.scanType,
    sex: definition.sex,
    uploadedImageUrl: definition.imageUrl,
  });

  return {
    ...caseRecord,
    context: `${definition.age}${definition.sex} - ${definition.context} - ${definition.scanType} ${definition.eye}`,
    status: caseRecord.riskLevel === "low" ? "Report ready" : "Review pending",
  };
});
