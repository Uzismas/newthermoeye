from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserRole(str, Enum):
    doctor = "doctor"
    staff = "staff"
    admin = "admin"


class RiskLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    blocked = "blocked"


class DiseaseKind(str, Enum):
    normal = "normal"
    alzheimer_risk = "alzheimer_risk"
    diabetic_retinopathy = "diabetic_retinopathy"
    glaucoma = "glaucoma"
    amd = "amd"
    hypertensive_retinopathy = "hypertensive_retinopathy"
    pathologic_myopia = "pathologic_myopia"
    quality_blocked = "quality_blocked"


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SessionUser(BaseModel):
    id: str
    name: str
    role: UserRole
    hospital_id: str
    hospital_name: str


# ── Cases ─────────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    age: int
    sex: str  # "M" | "F"
    scan_type: str
    eye_side: str  # "OD" | "OS" | "OU"
    consent_screening: bool
    consent_research: bool = False
    consent_training: bool = False


class CaseOut(BaseModel):
    id: str
    case_code: str
    hospital_id: str
    age: int
    sex: str
    scan_type: str
    eye_side: str
    status: str
    created_at: datetime


# ── Uploads ───────────────────────────────────────────────────────────────────

class UploadPresignRequest(BaseModel):
    case_id: str
    filename: str
    content_type: str


class UploadPresignOut(BaseModel):
    upload_url: str
    object_key: str
    expires_in: int


class UploadCompleteRequest(BaseModel):
    object_key: str
    checksum: str
    scan_type: str
    eye_side: str


# ── Analysis ──────────────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    id: str
    case_id: str
    disease_kind: DiseaseKind
    risk_level: RiskLevel
    risk_score: float
    confidence: float
    vessel_density: float
    faz_risk_proxy: float
    perfusion_density: float
    differentials: list[dict]
    model_version: str
    created_at: datetime


# ── Review ────────────────────────────────────────────────────────────────────

class ReviewDecision(str, Enum):
    pending = "Pending review"
    approved = "Approved for release"
    follow_up = "Follow-up required"
    rescan = "Rescan requested"


class ReviewCreate(BaseModel):
    decision: ReviewDecision
    note: str
    follow_up_window: str = "Routine"


class ReviewOut(BaseModel):
    id: str
    case_id: str
    reviewer_id: str
    reviewer_name: str
    decision: ReviewDecision
    note: str
    follow_up_window: str
    created_at: datetime


# ── Report ────────────────────────────────────────────────────────────────────

class ReportPreviewOut(BaseModel):
    case_id: str
    report_number: Optional[str]
    release_status: str  # "draft" | "approved" | "released"
    analysis: Optional[AnalysisResult]
    review: Optional[ReviewOut]


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditEvent(BaseModel):
    id: str
    hospital_id: str
    actor_id: str
    actor_name: str
    action: str
    target_type: str
    target_id: str
    created_at: datetime
