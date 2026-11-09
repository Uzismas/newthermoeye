import { createCaseFromClinicalInput, createClinicalMetrics, normalizeCaseRecord } from "./clinical-analysis";
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
    confidenceScore: number | null;
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 1 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 18,
      brightness: 118,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 2 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 14,
      brightness: 130,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 3 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 44,
      brightness: 205,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 4 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 44,
      brightness: 200,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 5 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 42,
      brightness: 126,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 6 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 41,
      brightness: 126,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 7 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 30,
      brightness: 220,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 8 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 28,
      brightness: 205,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 9 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 43,
      brightness: 145,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 10 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 8,
      brightness: 70,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 11 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 4,
      brightness: 130,
      confidenceScore: null,
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
    sourceNote: "Synthetic OCTA-style image for workflow research; no patient diagnosis or disease ground truth.",
    context: "Synthetic measurement fixture 12 - research only, disease status indeterminate",
    metrics: {
      artifactScore: 5,
      brightness: 132,
      confidenceScore: null,
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

  return normalizeCaseRecord({
    ...caseRecord,
    context: `${definition.age}${definition.sex} - ${definition.context} - ${definition.scanType} ${definition.eye}`,
  });
});
