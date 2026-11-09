"""FastAPI routes for local OCTA image measurement."""

import json
import logging
import re
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.octa_pipeline import MAX_BYTES, OCTAInputError, analyze_octa


router = APIRouter(prefix="/octa", tags=["OCTA local inference"])
MIME_FORMATS = {
    "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP",
    "image/tiff": "TIFF", "image/tif": "TIFF", "image/x-tiff": "TIFF",
}
logger = logging.getLogger("thermoeye.octa")


@router.post("/analyze")
async def analyze_octa_upload(image: UploadFile = File(...)):
    if not image.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A filename is required.")
    content_type = (image.content_type or "").split(";", 1)[0].strip().lower()
    # Some browsers report TIFF as application/octet-stream. The payload is
    # still decoded by Pillow below, so an explicit TIFF extension is enough
    # to preserve support without accepting arbitrary MIME types.
    tiff_extension = bool(re.search(r"\.tiff?$", image.filename or "", flags=re.IGNORECASE))
    if content_type not in MIME_FORMATS and not (content_type in {"", "application/octet-stream"} and tiff_extension):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG, WebP, or TIFF images are supported.")
    # Missing/octet-stream TIFF MIME is accepted only if its decoded format is
    # actually TIFF. Other allowed MIME values must agree with decoded bytes.
    expected_format = MIME_FORMATS.get(content_type, "TIFF")
    # Bound memory before reading an arbitrarily large upload into the worker.
    data = await image.read(MAX_BYTES + 1)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image is larger than 8 MB.")
    request_id = str(uuid4())
    try:
        result = await run_in_threadpool(analyze_octa, data, image.filename, mime_type=content_type or None, request_id=request_id, expected_format=expected_format)
    except OCTAInputError as exc:
        logger.info(json.dumps({"event": "octa_input_rejected", "request_id": request_id, "failure_reason": str(exc)}))
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    logger.info(json.dumps({
        "event": "octa_analyzed", "request_id": request_id,
        "input_sha256": result["provenance"]["input_sha256"],
        "input": result["input"], "analysis_status": result["analysis_status"],
        "modality_gate": result["modality_gate"], "quality": result["quality"],
        "engine": result["engine"], "model_version": result["model_version"],
        "preprocessing_version": result["preprocessing_version"],
        "metric_unit": result["metric_unit"], "timestamp": result["provenance"]["timestamp"],
        "failure_reason": result["failure_reason"],
    }))
    return result
