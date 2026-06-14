"""
Thermoeye FastAPI Backend — MVP stub
Follows MVP_BACKEND_PLAN.md exactly.
All routes are stubbed with mock data; replace with real DB + workers in Phase 2.
"""
from datetime import datetime
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    AuditEvent, CaseCreate, CaseOut, LoginRequest,
    ReviewCreate, ReviewOut, ReviewDecision,
    SessionUser, UploadCompleteRequest, UploadPresignOut, UploadPresignRequest,
    ReportPreviewOut, AnalysisResult, DiseaseKind, RiskLevel,
)

app = FastAPI(title="Thermoeye Clinical API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_VERSION = "thermoeye-multidisease-ruleset-2026.06"

# ── In-memory stores (replace with PostgreSQL in Phase 2) ────────────────────
_sessions: dict[str, SessionUser] = {}
_cases: dict[str, dict] = {}
_reviews: dict[str, ReviewOut] = {}
_audit: list[AuditEvent] = []

MOCK_USERS = {
    "doctor@hospital.th": {
        "password": "demo",
        "user": SessionUser(
            id="USR-001",
            name="Dr. Nattapong",
            role="doctor",
            hospital_id="HOSP-001",
            hospital_name="Bangkok Neurology Hospital",
        ),
    }
}


def _audit_log(actor: SessionUser, action: str, target_type: str, target_id: str) -> None:
    _audit.append(AuditEvent(
        id=str(uuid4()),
        hospital_id=actor.hospital_id,
        actor_id=actor.id,
        actor_name=actor.name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        created_at=datetime.utcnow(),
    ))


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=SessionUser)
def login(body: LoginRequest):
    user_record = MOCK_USERS.get(body.email)
    if not user_record or user_record["password"] != body.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    session_id = str(uuid4())
    user = user_record["user"]
    _sessions[session_id] = user
    _audit_log(user, "user.login", "user", user.id)
    return user


@app.post("/auth/logout")
def logout():
    return {"success": True}


@app.get("/me", response_model=SessionUser)
def me():
    # In production: read session cookie
    return list(_sessions.values())[0] if _sessions else MOCK_USERS["doctor@hospital.th"]["user"]


# ── Cases ─────────────────────────────────────────────────────────────────────

@app.get("/cases")
def list_cases(status: str | None = None, risk_level: str | None = None):
    results = list(_cases.values())
    if status:
        results = [c for c in results if c["status"] == status]
    if risk_level:
        results = [c for c in results if c.get("risk_level") == risk_level]
    return results


@app.post("/cases", response_model=CaseOut, status_code=201)
def create_case(body: CaseCreate):
    case_id = f"TE-{datetime.utcnow().strftime('%Y%m')}-{str(uuid4())[:4].upper()}"
    case = {
        "id": case_id,
        "case_code": case_id,
        "hospital_id": "HOSP-001",
        "age": body.age,
        "sex": body.sex,
        "scan_type": body.scan_type,
        "eye_side": body.eye_side,
        "status": "intake",
        "created_at": datetime.utcnow(),
    }
    _cases[case_id] = case
    _audit_log(MOCK_USERS["doctor@hospital.th"]["user"], "case.create", "case", case_id)
    return case


@app.get("/cases/{case_id}")
def get_case(case_id: str):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


# ── Uploads ───────────────────────────────────────────────────────────────────

@app.post("/cases/{case_id}/uploads/presign", response_model=UploadPresignOut)
def presign_upload(case_id: str, body: UploadPresignRequest):
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    object_key = f"quarantine/{case_id}/{uuid4()}/{body.filename}"
    return UploadPresignOut(
        upload_url=f"http://localhost:9000/thermoeye/{object_key}?presigned=1",
        object_key=object_key,
        expires_in=900,
    )


@app.post("/cases/{case_id}/uploads/complete")
def complete_upload(case_id: str, body: UploadCompleteRequest):
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    _cases[case_id]["status"] = "quality_pending"
    _cases[case_id]["object_key"] = body.object_key
    _audit_log(MOCK_USERS["doctor@hospital.th"]["user"], "scan.upload_complete", "case", case_id)
    # In Phase 2: enqueue deidentify_scan_metadata + quality_check_scan tasks
    return {"status": "upload_complete", "next": "quality_check"}


# ── Pipeline ──────────────────────────────────────────────────────────────────

@app.post("/cases/{case_id}/quality-check")
def run_quality_check(case_id: str):
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    _cases[case_id]["status"] = "analysis_pending"
    return {"status": "pass", "score": 92, "failure_reason": None}


@app.post("/cases/{case_id}/analysis")
def run_analysis(case_id: str):
    """Mock multi-disease analysis — returns primary disease + differentials."""
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    result = AnalysisResult(
        id=str(uuid4()),
        case_id=case_id,
        disease_kind=DiseaseKind.alzheimer_risk,
        risk_level=RiskLevel.high,
        risk_score=0.74,
        confidence=0.88,
        vessel_density=28.0,
        faz_risk_proxy=52.0,
        perfusion_density=36.0,
        differentials=[
            {"kind": "diabetic_retinopathy", "score": 22, "label": "Diabetic Retinopathy"},
        ],
        model_version=MODEL_VERSION,
        created_at=datetime.utcnow(),
    )
    _cases[case_id]["status"] = "review_pending"
    _cases[case_id]["analysis"] = result.model_dump(mode="json")
    return result


@app.get("/cases/{case_id}/pipeline")
def get_pipeline(case_id: str):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return {
        "upload": "done",
        "quarantine": "done",
        "consent": "done",
        "deidentification": "done",
        "quality": case["status"] not in ("intake",),
        "analysis": case["status"] in ("review_pending", "report_ready"),
        "review": case["status"] == "report_ready",
        "report": "draft",
    }


# ── Doctor Review ─────────────────────────────────────────────────────────────

@app.post("/cases/{case_id}/review", response_model=ReviewOut, status_code=201)
def submit_review(case_id: str, body: ReviewCreate):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if body.decision == ReviewDecision.approved and case.get("status") == "quality_blocked":
        raise HTTPException(400, "Cannot approve a quality-blocked case")
    doctor = MOCK_USERS["doctor@hospital.th"]["user"]
    review = ReviewOut(
        id=str(uuid4()),
        case_id=case_id,
        reviewer_id=doctor.id,
        reviewer_name=doctor.name,
        decision=body.decision,
        note=body.note,
        follow_up_window=body.follow_up_window,
        created_at=datetime.utcnow(),
    )
    _reviews[case_id] = review
    if body.decision == ReviewDecision.approved:
        _cases[case_id]["status"] = "report_ready"
    _audit_log(doctor, "review.submit", "case", case_id)
    return review


@app.get("/cases/{case_id}/review", response_model=ReviewOut)
def get_review(case_id: str):
    review = _reviews.get(case_id)
    if not review:
        raise HTTPException(404, "No review found")
    return review


# ── Reports ───────────────────────────────────────────────────────────────────

@app.get("/cases/{case_id}/report/preview", response_model=ReportPreviewOut)
def report_preview(case_id: str):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    analysis_data = case.get("analysis")
    review_data = _reviews.get(case_id)
    return ReportPreviewOut(
        case_id=case_id,
        report_number=f"RPT-{case_id}" if case["status"] == "report_ready" else None,
        release_status="approved" if case["status"] == "report_ready" else "draft",
        analysis=AnalysisResult(**analysis_data) if analysis_data else None,
        review=review_data,
    )


@app.post("/cases/{case_id}/report/release")
def release_report(case_id: str):
    review = _reviews.get(case_id)
    if not review or review.decision != ReviewDecision.approved:
        raise HTTPException(400, "Report can only be released after doctor approval")
    doctor = MOCK_USERS["doctor@hospital.th"]["user"]
    _audit_log(doctor, "report.release", "case", case_id)
    return {"report_number": f"RPT-{case_id}", "status": "released"}


@app.get("/cases/{case_id}/report/download")
def download_report(case_id: str):
    review = _reviews.get(case_id)
    if not review or review.decision != ReviewDecision.approved:
        raise HTTPException(403, "Report not yet approved for download")
    doctor = MOCK_USERS["doctor@hospital.th"]["user"]
    _audit_log(doctor, "report.download", "case", case_id)
    return {"download_url": f"http://localhost:9000/thermoeye/reports/{case_id}.pdf?presigned=1"}


# ── Governance ────────────────────────────────────────────────────────────────

@app.get("/audit-log")
def get_audit_log(action: str | None = None, limit: int = 50):
    events = list(reversed(_audit))
    if action:
        events = [e for e in events if e.action == action]
    return events[:limit]


@app.get("/model-registry/current")
def model_registry():
    return {
        "model_version": MODEL_VERSION,
        "diseases": ["alzheimer_risk", "diabetic_retinopathy", "glaucoma", "amd", "hypertensive_retinopathy", "pathologic_myopia"],
        "release_status": "validated",
        "validation_auc": 0.923,
        "threshold_version": "thresh-2026.06",
        "trained_on": "2026-05-12",
        "next_retraining": "2026-07-12",
    }
