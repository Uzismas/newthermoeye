"""
Thermoeye FastAPI Backend — MVP stub
Follows MVP_BACKEND_PLAN.md exactly.
All routes are stubbed with mock data; replace with real DB + workers in Phase 2.
"""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import (
    AuditEvent, CaseCreate, CaseOut, LoginRequest,
    ReviewCreate, ReviewOut, ReviewDecision,
    SessionUser, UploadCompleteRequest, UploadPresignOut, UploadPresignRequest,
    ReportPreviewOut, AnalysisResult, DiseaseKind, RiskLevel,
)
from app.octa_routes import router as octa_router
from app.octa_pipeline import PIPELINE_VERSION, PREPROCESSING_VERSION, inspect_model_readiness

app = FastAPI(title="Thermoeye Clinical API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(octa_router)


def _model_readiness():
    return inspect_model_readiness()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "thermoeye-local-backend"}


@app.get("/readiness")
def readiness_check():
    model = _model_readiness()
    ready = model["status"] == "ready"
    payload = {
        "status": "ready" if ready else "degraded",
        "backend": "ready", "engine": model["engine"],
        "pipeline_version": PIPELINE_VERSION, "preprocessing_version": PREPROCESSING_VERSION,
        "model": model,
    }
    return JSONResponse(payload, status_code=200 if ready else 503)

MODEL_VERSION = "octa-analysis-v2"

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
        created_at=datetime.now(timezone.utc),
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
    case_id = f"TE-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid4())[:4].upper()}"
    case = {
        "id": case_id,
        "case_code": case_id,
        "hospital_id": "HOSP-001",
        "age": body.age,
        "sex": body.sex,
        "scan_type": body.scan_type,
        "eye_side": body.eye_side,
        "status": "intake",
        "created_at": datetime.now(timezone.utc),
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
    return {"status": "not_evaluated", "score": None, "failure_reason": "No image decoded; use /octa/analyze."}


@app.post("/cases/{case_id}/analysis")
def run_analysis(case_id: str):
    """Legacy endpoint has no decoded image or classifier; all results unavailable."""
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    result = AnalysisResult(
        id=str(uuid4()),
        case_id=case_id,
        disease_kind=DiseaseKind.indeterminate,
        risk_level=RiskLevel.indeterminate,
        risk_score=None,
        confidence=None,
        vessel_density=None,
        faz_risk_proxy=None,
        perfusion_density=None,
        differentials=[],
        model_version=MODEL_VERSION,
        created_at=datetime.now(timezone.utc),
    )
    _cases[case_id]["status"] = "analysis_unavailable"
    _cases[case_id]["analysis"] = result.model_dump(mode="json")
    return result


@app.get("/cases/{case_id}/pipeline")
def get_pipeline(case_id: str):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return {
        "upload": "metadata_received" if case.get("object_key") else "not_received",
        "quarantine": "not_verified",
        "consent": "not_verified",
        "deidentification": "not_implemented",
        "quality": "not_evaluated",
        "analysis": "unavailable",
        "review": case["status"] == "report_ready",
        "report": "draft",
    }


# ── Doctor Review ─────────────────────────────────────────────────────────────

@app.post("/cases/{case_id}/review", response_model=ReviewOut, status_code=201)
def submit_review(case_id: str, body: ReviewCreate):
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if body.decision == ReviewDecision.approved:
        # This legacy API never decodes or persists image-analysis evidence.
        # A review click cannot make its unavailable analysis releasable.
        raise HTTPException(409, "Legacy case analysis is unavailable; report approval requires the console image-analysis workflow.")
    doctor = MOCK_USERS["doctor@hospital.th"]["user"]
    review = ReviewOut(
        id=str(uuid4()),
        case_id=case_id,
        reviewer_id=doctor.id,
        reviewer_name=doctor.name,
        decision=body.decision,
        note=body.note,
        follow_up_window=body.follow_up_window,
        created_at=datetime.now(timezone.utc),
    )
    _reviews[case_id] = review
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
        # Old in-memory approval/status values do not prove image analysis.
        report_number=None,
        release_status="draft",
        analysis=AnalysisResult(**analysis_data) if analysis_data else None,
        review=review_data,
    )


@app.post("/cases/{case_id}/report/release")
def release_report(case_id: str):
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    raise HTTPException(409, "Legacy case analysis is unavailable; no report can be released.")


@app.get("/cases/{case_id}/report/download")
def download_report(case_id: str):
    if case_id not in _cases:
        raise HTTPException(404, "Case not found")
    raise HTTPException(409, "Legacy case analysis is unavailable; no report is available for download.")


# ── Governance ────────────────────────────────────────────────────────────────

@app.get("/audit-log")
def get_audit_log(action: str | None = None, limit: int = 50):
    events = list(reversed(_audit))
    if action:
        events = [e for e in events if e.action == action]
    return events[:limit]


@app.get("/model-registry/current")
def model_registry():
    readiness = _model_readiness()
    return {
        "model_version": MODEL_VERSION,
        "diseases": [],
        "release_status": "research_only_demo_ruleset",
        "validation_auc": None,
        "validation_note": "Vessel segmentation only; no validated disease classifier. Artifact existence is not evidence of successful loading.",
        "threshold_version": None,
        "trained_on": None,
        "next_training": "After authorised dataset and patient-level validation",
        "image_pipeline": {
            "status": readiness["status"],
            "endpoint": "/octa/analyze",
            "segmentation_artifact_present": readiness["status"] in {"ready", "corrupt", "runtime_missing"},
            "engine": readiness["engine"],
            "model_hash": readiness["model_hash"],
            "model_version": readiness["model_version"],
            "error": readiness["error"],
            "trained_risk_classifier": False,
            "external_vision_provider": False,
        },
    }
