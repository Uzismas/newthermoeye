export type ViewId =
  | "dashboard"
  | "tasks"
  | "cases"
  | "patients"
  | "analysis"
  | "report"
  | "insights"
  | "performance"
  | "governance"
  | "settings";

export type RiskLevel = "low" | "moderate" | "high" | "blocked" | "indeterminate";

export type DiseaseKind =
  | "normal"
  | "alzheimer_risk"
  | "diabetic_retinopathy"
  | "glaucoma"
  | "amd"
  | "hypertensive_retinopathy"
  | "pathologic_myopia"
  | "indeterminate"
  | "quality_blocked";

export type DifferentialSignal = {
  kind: DiseaseKind;
  label: string;
  score: number;
  evidence: string[];
};

export type ClinicalClassification = {
  kind: DiseaseKind;
  riskLevel: RiskLevel;
  riskScore: number | null;
  label: string;
  finding: string;
  recommendation: string;
  evidence: string[];
  differentials?: DifferentialSignal[];
};

export type CaseRecord = {
  id: string;
  age: number;
  sex: "F" | "M";
  scanType: string;
  eye: "OD" | "OS" | "OU";
  riskLevel: RiskLevel;
  riskScore: number | null;
  qualityLabel: string;
  status: string;
  context: string;
  confidence: number | null;
  density: string;
  heatmap: string;
  note: string;
  uploadedImageUrl?: string;
  uploadedFileName?: string;
  analysisMetrics?: BaselineAnalysisMetrics;
  clinicalClassification?: ClinicalClassification;
  analysisReceipt?: string;
};

export type VisionResult = {
  primaryDisease: DiseaseKind;
  riskLevel: RiskLevel;
  riskScore: number | null;
  confidence: number | null;
  label: string;
  finding: string;
  recommendation: string;
  evidence: string[];
  vesselDensity: number | null;
  fazRisk: number | null;
  perfusion: number | null;
  qualityScore: number | null;
  differentials: { kind: DiseaseKind; label: string; score: number; evidence: string[] }[];
  segmentationMaskDataUrl?: string;
  segmentationEngine?: "onnx_vessel_unet" | "heuristic_research_baseline";
  trainedModelConnected?: boolean;
  engine?: "onnx_vessel_unet" | "heuristic_research_baseline" | "ruleset" | "none" | "external_provider";
  schemaVersion?: "octa-analysis-v2";
  analysisStatus?: "measured" | "quality_blocked" | "modality_blocked" | "unavailable";
  modelVersion?: string | null;
  modelTask?: string | null;
  preprocessingVersion?: string | null;
  threshold?: number | null;
  failureReason?: string | null;
  requestId?: string | null;
  fileHash?: string | null;
  timestamp?: string | null;
  mimeType?: string | null;
  decodedFormat?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  brightness?: number | null;
  contrast?: number | null;
  sharpness?: number | null;
  artifactScore?: number | null;
  sourceMetricUnit?: "percent_0_100" | "fraction_0_1" | null;
  previewDataUrl?: string;
  inputMode?: string;
  colorConversion?: string;
  modalityGateReason?: string;
  modalityGateStatus?: string;
  qualityStatus?: "passed" | "blocked" | "not_evaluated";
  metricUnit?: "percent_0_100" | "fraction_0_1";
};

export type BaselineAnalysisMetrics = {
  brightness: number | null;
  contrast: number | null;
  sharpness: number | null;
  vesselDensity: number | null;
  qualityScore: number | null;
  confidenceScore: number | null;
  fazRiskProxy: number | null;
  artifactScore: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  perfusionDensityProxy: number | null;
  demoEngineVersion: string;
  visionResult?: VisionResult;
};

export type AuditEvent = {
  time: string;
  message: string;
};

export type ReviewDecision = "Pending review" | "Approved for release" | "Rescan requested" | "Follow-up required";

export type ReviewRecord = {
  decision: ReviewDecision;
  note: string;
  reviewer: string;
  followUpWindow: "Routine" | "30 days" | "90 days" | "Rescan first";
  updatedAt: string;
};

export type SessionUser = {
  name: string;
  role: "Doctor" | "Hospital staff" | "Admin";
  hospital: string;
};

export type CaseAction = "add_to_patient" | "second_review" | "export_dicom" | "delete_scan";

export type CaseActionState = {
  patientRecordAdded?: boolean;
  secondReviewRequested?: boolean;
  updatedAt?: string;
};
