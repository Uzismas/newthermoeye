"""Deterministic input, engine, medical-safety and HTTP-contract regression tests."""
from __future__ import annotations

import base64
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import numpy as np
from PIL import Image, ImageDraw
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import octa_pipeline as pipeline
from app.octa_routes import analyze_octa_upload


def encoded(image: Image.Image, fmt: str = "PNG") -> bytes:
    stream = BytesIO()
    image.save(stream, format=fmt)
    return stream.getvalue()


def textured_gray(size: int = 128) -> Image.Image:
    image = Image.new("L", (size, size), 35)
    draw = ImageDraw.Draw(image)
    for offset in range(-20, size, 18):
        draw.line((offset, 0, offset + 48, size), fill=205, width=2)
        draw.line((0, offset, size, offset + 42), fill=160, width=2)
    return image


def textured_color(size: int = 128) -> Image.Image:
    gray = np.asarray(textured_gray(size), dtype=np.uint8)
    return Image.fromarray(np.stack([gray, np.roll(gray, 7, axis=1), np.roll(gray, 13, axis=0)], axis=2))


class OCTAPipelineInputTests(unittest.TestCase):
    def setUp(self):
        # Fixture tests must not depend on installed artifacts or environment.
        self.engine = patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "heuristic_research_baseline"})
        self.engine.start()
        self.addCleanup(self.engine.stop)

    def assert_safe(self, result):
        classification = result["classification"]
        self.assertEqual(classification["label"], "indeterminate")
        self.assertEqual(classification["risk_level"], "indeterminate")
        self.assertIsNone(classification["risk_score"])
        self.assertIsNone(classification["confidence"])
        self.assertEqual(classification["differentials"], [])
        self.assertEqual(result["metric_unit"], "percent_0_100")

    def test_grayscale_png_and_jpeg_generic_name(self):
        for fmt in ("PNG", "JPEG"):
            with self.subTest(fmt=fmt):
                result = pipeline.analyze_octa(encoded(textured_gray(), fmt), "scan.bin")
                self.assertEqual(result["input"]["original_mode"], "L")
                self.assertEqual(result["input"]["decoded_format"], fmt)
                self.assertEqual(result["modality_gate"]["status"], "passed")
                self.assertEqual(result["analysis_status"], "measured")
                self.assertGreater(result["measurements"]["vessel_density"], 0)
                self.assertIsNone(result["measurements"]["perfusion_density"])
                self.assert_safe(result)

    def test_generic_false_color_png_and_jpeg_warn_without_blocking(self):
        for fmt in ("PNG", "JPEG"):
            with self.subTest(fmt=fmt):
                result = pipeline.analyze_octa(encoded(textured_color(), fmt), "scan.bin")
                self.assertEqual(result["input"]["original_mode"], "RGB")
                self.assertEqual(result["modality_gate"]["status"], "passed_with_color_warning")
                self.assertEqual(result["analysis_status"], "measured")
                self.assert_safe(result)

    def test_rgba_and_palette_match_declared_luma_conversion(self):
        for image in (textured_color().convert("RGBA"), textured_color().convert("P")):
            with self.subTest(mode=image.mode):
                gray, _, _, metadata, _ = pipeline._load_grayscale(encoded(image))
                np.testing.assert_array_equal(gray, np.asarray(image.convert("L"), dtype=np.float32) / 255)
                self.assertEqual(metadata["original_mode"], image.mode)
                result = pipeline.analyze_octa(encoded(image), "scan.png")
                self.assertEqual(result["analysis_status"], "measured")
                self.assert_safe(result)

    def test_explicit_photo_terms_block_measurement_without_diagnosis(self):
        for name in ("face-photo.png", "skin-study.jpg", "acne-case.png", "fundus-image.png", "selfie.png"):
            with self.subTest(name=name):
                with patch.object(pipeline, "_heuristic_vessel_mask") as mask:
                    result = pipeline.analyze_octa(encoded(textured_color()), name)
                    mask.assert_not_called()
                self.assertEqual(result["analysis_status"], "modality_blocked")
                self.assertEqual(result["modality_gate"]["status"], "blocked")
                self.assertEqual(result["quality"]["status"], "passed")
                self.assertIsNone(result["measurements"])
                self.assertIn("filename", result["failure_reason"])
                self.assert_safe(result)

    def test_photo_gate_matches_terms_not_substrings(self):
        result = pipeline.analyze_octa(encoded(textured_gray()), "surface-octa.png")
        self.assertEqual(result["modality_gate"]["status"], "passed")
        self.assertFalse(result["modality_gate"]["validated_modality_classifier"])

    def test_low_quality_color_warning_remains_separate_from_quality_block(self):
        result = pipeline.analyze_octa(encoded(Image.new("RGB", (128, 128), (220, 80, 90))), "scan.png")
        self.assertEqual(result["modality_gate"]["status"], "passed_with_color_warning")
        self.assertEqual(result["analysis_status"], "quality_blocked")
        self.assertIsNone(result["measurements"])
        self.assertEqual(result["engine"], "none")
        self.assert_safe(result)

    def test_tiff_8_and_16_bit_use_fixed_normalization(self):
        image = textured_gray()
        u16 = Image.fromarray(np.asarray(image, dtype=np.uint16) * 257)
        gray8, _, _, _, _ = pipeline._load_grayscale(encoded(image, "TIFF"))
        gray16, _, _, metadata, _ = pipeline._load_grayscale(encoded(u16, "TIFF"))
        np.testing.assert_allclose(gray16, gray8, atol=1e-7)
        self.assertIn("65535", metadata["grayscale_conversion"])
        result = pipeline.analyze_octa(encoded(u16, "TIFF"), "scan.tiff")
        self.assertEqual(result["analysis_status"], "measured")
        # A dark 16-bit image must not become a bright image by normalization.
        dark = Image.fromarray(np.full((128, 128), 200, dtype=np.uint16))
        result = pipeline.analyze_octa(encoded(dark, "TIFF"), "scan.tiff")
        self.assertEqual(result["analysis_status"], "quality_blocked")
        self.assertLess(result["quality"]["brightness"], 1)

    def test_uint16_png_retains_values_instead_of_clipping_to_white(self):
        image = Image.fromarray(np.asarray(textured_gray(), dtype=np.uint16) * 257)
        gray, _, _, metadata, _ = pipeline._load_grayscale(encoded(image))
        self.assertLess(float(gray.max()), 1)
        self.assertGreater(float(gray.std()), 0.1)
        self.assertIn("65535", metadata["grayscale_conversion"])

    def test_tiff_preview_is_grayscale_png_retaining_aspect_without_metadata(self):
        source = textured_gray().resize((1024, 256))
        result = pipeline.analyze_octa(encoded(source, "TIFF"), "scan.tiff")
        preview_url = result["preview_data_url"]
        self.assertTrue(preview_url.startswith("data:image/png;base64,"))
        with Image.open(BytesIO(base64.b64decode(preview_url.split(",", 1)[1]))) as preview:
            self.assertEqual(preview.size, (512, 128))
            self.assertEqual(preview.mode, "L")
            self.assertEqual(preview.format, "PNG")
            self.assertEqual(preview.info, {})

    def test_empty_corrupt_tiny_and_wrong_decoded_format_are_rejected(self):
        fixtures = [(b"", "empty"), (b"not an image", "readable"), (encoded(Image.new("L", (32, 32))), "64x64"), (encoded(textured_gray(), "BMP"), "Decoded format")]
        for data, reason in fixtures:
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(pipeline.OCTAInputError, reason):
                    pipeline.analyze_octa(data, "scan.png")

    def test_dimension_limit_is_checked_before_pixel_load(self):
        image = unittest.mock.MagicMock()
        image.__enter__.return_value = image
        image.size = (4001, 4000)
        with patch.object(pipeline.Image, "open", return_value=image):
            with self.assertRaisesRegex(pipeline.OCTAInputError, "too many pixels"):
                pipeline.analyze_octa(b"header", "scan.png")
        image.load.assert_not_called()

    def test_multipage_and_float_tiff_require_explicit_single_image_export(self):
        stream = BytesIO()
        textured_gray().save(stream, format="TIFF", save_all=True, append_images=[textured_gray()])
        with self.assertRaisesRegex(pipeline.OCTAInputError, "Multi-frame"):
            pipeline.analyze_octa(stream.getvalue(), "scan.tiff")
        floating = Image.fromarray(np.zeros((128, 128), dtype=np.float32))
        with self.assertRaisesRegex(pipeline.OCTAInputError, "Unsupported image mode"):
            pipeline.analyze_octa(encoded(floating, "TIFF"), "scan.tiff")

    def test_fingerprint_scope_and_request_metadata(self):
        data = encoded(textured_gray())
        result = pipeline.analyze_octa(data, "patient-name.png", mime_type="image/png", request_id="request-1")
        self.assertEqual(result["provenance"]["input_sha256"], sha256(data).hexdigest())
        self.assertEqual(result["provenance"]["request_id"], "request-1")
        self.assertEqual(result["input"]["mime_type"], "image/png")
        self.assertEqual(result["preprocessing_version"], pipeline.PREPROCESSING_VERSION)
        self.assertNotIn("filename", result)
        self.assertEqual(result["provenance"]["clinical_use"], "not_clinically_validated")


class OCTAEngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "onnx_vessel_unet"})
        self.engine.start()
        self.addCleanup(self.engine.stop)
        self.data = encoded(textured_gray())

    def test_missing_artifact_is_unavailable_without_heuristic_fallback(self):
        with patch.object(pipeline, "ONNX_MODEL_PATHS", ()), patch.object(pipeline, "_heuristic_vessel_mask") as heuristic:
            result = pipeline.analyze_octa(self.data)
            heuristic.assert_not_called()
        self.assertEqual(result["analysis_status"], "unavailable")
        self.assertEqual(result["failure_reason"], "onnx_artifact_missing")
        self.assertEqual(result["engine"], "none")
        self.assertIsNone(result["measurements"])
        self.assertIsNone(result["model_version"])

    def test_failed_artifact_and_invalid_output_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact = Path(tmp) / "model.onnx"
            artifact.touch()
            with patch.object(pipeline, "ONNX_MODEL_PATHS", (artifact,)), patch.object(pipeline, "_onnx_session", side_effect=RuntimeError("private local path")):
                result = pipeline.analyze_octa(self.data)
            self.assertEqual(result["failure_reason"], "onnx_load_or_inference_failed")
            self.assertIsNone(result["measurements"])
            for bad_output in (np.zeros((1, 1, 64, 64)), np.full((1, 1, 256, 256), np.nan)):
                fake = SimpleNamespace(get_inputs=lambda: [SimpleNamespace(name="image")], run=lambda *_: [bad_output])
                with patch.object(pipeline, "ONNX_MODEL_PATHS", (artifact,)), patch.object(pipeline, "_onnx_session", return_value=(fake, "a" * 64)):
                    result = pipeline.analyze_octa(self.data)
                self.assertEqual(result["failure_reason"], "onnx_output_contract_mismatch")
                self.assertIsNone(result["measurements"])

    def test_input_dtype_sigmoid_threshold_resize_and_source_measurements(self):
        tensors = []
        logits = np.full((1, 1, 256, 256), -1000, dtype=np.float32)
        logits[:, :, :, :64] = 1000
        logits[:, :, :, 64:128] = 0  # sigmoid(0)=0.5: excluded by strict >.
        def run(_outputs, feeds):
            tensors.append(feeds["image"])
            return [logits]
        fake = SimpleNamespace(get_inputs=lambda: [SimpleNamespace(name="image")], run=run)
        with tempfile.TemporaryDirectory() as tmp:
            artifact = Path(tmp) / "model.onnx"
            artifact.touch()
            with patch.object(pipeline, "ONNX_MODEL_PATHS", (artifact,)), patch.object(pipeline, "_onnx_session", return_value=(fake, "a" * 64)):
                rectangular = textured_gray().resize((192, 128))
                result = pipeline.analyze_octa(encoded(rectangular))
        tensor = tensors[0]
        self.assertEqual(tensor.shape, (1, 1, 256, 256))
        self.assertEqual(tensor.dtype, np.float32)
        self.assertGreaterEqual(float(tensor.min()), 0)
        self.assertLessEqual(float(tensor.max()), 1)
        self.assertEqual(result["engine"], "onnx_vessel_unet")
        self.assertTrue(result["trained_model_connected"])
        self.assertEqual(result["threshold"], 0.5)
        self.assertEqual(result["measurements"]["vessel_density"], 25)
        self.assertEqual(result["measurements"]["faz_risk_proxy"], 100)
        self.assertEqual((result["measurements"]["mask_width"], result["measurements"]["mask_height"]), (192, 128))
        self.assertEqual(result["provenance"]["model_sha256"], "a" * 64)
        self.assertEqual(result["classification"]["label"], "indeterminate")
        self.assertIsNone(result["classification"]["confidence"])

    def test_input_contract_is_checked(self):
        fake = SimpleNamespace(get_inputs=lambda: [SimpleNamespace(shape=[1, 3, 256, 256], type="tensor(float)")])
        with patch.dict(sys.modules, {"onnxruntime": SimpleNamespace(InferenceSession=lambda *a, **kw: fake)}):
            with self.assertRaisesRegex(pipeline.OCTAEngineError, "input_contract"):
                pipeline._onnx_session.__wrapped__("unused", 0, 0)

    def test_heuristic_requires_explicit_selection_and_is_not_trained(self):
        with patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "heuristic_research_baseline"}), patch.object(pipeline, "_trained_vessel_mask") as trained:
            result = pipeline.analyze_octa(self.data)
            trained.assert_not_called()
        self.assertEqual(result["engine"], "heuristic_research_baseline")
        self.assertFalse(result["trained_model_connected"])
        self.assertIsNone(result["threshold"])
        self.assertIsNone(result["provenance"]["model_sha256"])
        with patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "typo"}):
            result = pipeline.analyze_octa(self.data)
        self.assertEqual(result["failure_reason"], "unsupported_segmentation_engine")
        self.assertIsNone(result["measurements"])


class OCTARouteTests(unittest.IsolatedAsyncioTestCase):
    def upload(self, data, name="scan.png", mime="image/png"):
        return UploadFile(BytesIO(data), filename=name, headers=Headers({"content-type": mime}))

    async def test_tiff_mime_aliases_octet_stream_and_empty_mime(self):
        data = encoded(textured_gray(), "TIFF")
        with patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "heuristic_research_baseline"}):
            for mime in ("image/tiff", "image/tif", "image/x-tiff", "application/octet-stream", ""):
                with self.subTest(mime=mime):
                    result = await analyze_octa_upload(self.upload(data, "scan.TIFF", mime))
                    self.assertEqual(result["input"]["decoded_format"], "TIFF")

    async def test_upload_validation_rejects_empty_missing_name_and_fake_image(self):
        fixtures = [(b"", "scan.png", "image/png", 400), (b"invalid", "", "image/png", 400), (b"invalid", "scan.txt", "text/plain", 415), (b"invalid", "scan.png", "image/png", 422), (encoded(textured_gray(), "BMP"), "scan.png", "image/png", 422)]
        for data, name, mime, status in fixtures:
            with self.subTest(name=name, mime=mime):
                with self.assertRaises(HTTPException) as exc:
                    await analyze_octa_upload(self.upload(data, name, mime))
                self.assertEqual(exc.exception.status_code, status)

    async def test_mime_mismatch_is_rejected_before_engine_runs(self):
        fixtures = [
            ("PNG", "image/jpeg", "scan.jpg"), ("TIFF", "image/png", "scan.png"),
            ("PNG", "application/octet-stream", "scan.tiff"), ("PNG", "", "scan.tiff"),
        ]
        for fmt, mime, name in fixtures:
            with self.subTest(fmt=fmt, mime=mime), patch.object(pipeline, "_trained_vessel_mask") as trained:
                with self.assertRaises(HTTPException) as exc:
                    await analyze_octa_upload(self.upload(encoded(textured_gray(), fmt), name, mime))
                self.assertEqual(exc.exception.status_code, 422)
                self.assertIn("MIME", exc.exception.detail)
                trained.assert_not_called()

    async def test_mime_parameter_normalization_and_generic_filename(self):
        with patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "heuristic_research_baseline"}):
            result = await analyze_octa_upload(self.upload(encoded(textured_gray()), "scan.bin", "IMAGE/PNG; charset=binary"))
        self.assertEqual(result["input"]["decoded_format"], "PNG")

    async def test_oversized_upload_reads_only_limit_plus_one(self):
        upload = self.upload(b"placeholder")
        upload.read = AsyncMock(return_value=b"x" * (pipeline.MAX_BYTES + 1))
        with self.assertRaises(HTTPException) as exc:
            await analyze_octa_upload(upload)
        self.assertEqual(exc.exception.status_code, 413)
        upload.read.assert_awaited_once_with(pipeline.MAX_BYTES + 1)

    async def test_structured_diagnostics_do_not_log_filename_or_image(self):
        data = encoded(textured_gray())
        with patch.dict("os.environ", {"OCTA_SEGMENTATION_ENGINE": "heuristic_research_baseline"}), self.assertLogs("thermoeye.octa", level="INFO") as logs:
            result = await analyze_octa_upload(self.upload(data, "Patient-Identifier-123.png"))
        output = " ".join(logs.output)
        self.assertNotIn("Patient-Identifier", output)
        self.assertNotIn("base64", output)
        self.assertNotIn("preview_data_url", output)
        self.assertIn(result["provenance"]["input_sha256"], output)
        self.assertIn(result["provenance"]["request_id"], output)


class LegacyAnalysisSafetyTests(unittest.TestCase):
    def test_legacy_analysis_and_quality_do_not_fabricate_measurements(self):
        from app import main
        with patch.dict(main._cases, {"TEST-LEGACY": {"id": "TEST-LEGACY", "status": "intake"}}, clear=True):
            quality = main.run_quality_check("TEST-LEGACY")
            self.assertEqual(quality["status"], "not_evaluated")
            self.assertIsNone(quality["score"])
            result = main.run_analysis("TEST-LEGACY").model_dump(mode="json")
            self.assertEqual(result["disease_kind"], "indeterminate")
            self.assertEqual(result["risk_level"], "indeterminate")
            self.assertEqual(result["differentials"], [])
            for key in ("risk_score", "confidence", "vessel_density", "faz_risk_proxy", "perfusion_density"):
                self.assertIsNone(result[key])
            preview = main.report_preview("TEST-LEGACY").model_dump(mode="json")
            self.assertEqual(preview["analysis"], result)
            progress = main.get_pipeline("TEST-LEGACY")
            self.assertEqual(progress["analysis"], "unavailable")
            self.assertEqual(progress["quality"], "not_evaluated")
            self.assertEqual(progress["upload"], "not_received")
            self.assertEqual(progress["quarantine"], "not_verified")
            self.assertEqual(progress["deidentification"], "not_implemented")

    def test_legacy_approval_is_rejected_without_mutating_case_review_or_audit(self):
        from app import main
        from app.models import ReviewCreate, ReviewDecision
        approval = ReviewCreate(decision=ReviewDecision.approved, note="Approve")
        for state in ("intake", "analysis_unavailable", "quality_blocked", "report_ready"):
            with self.subTest(state=state), patch.dict(main._cases, {"TEST-LEGACY": {"id": "TEST-LEGACY", "status": state}}, clear=True), patch.dict(main._reviews, {}, clear=True), patch.object(main, "_audit", []):
                with self.assertRaises(HTTPException) as exc:
                    main.submit_review("TEST-LEGACY", approval)
                self.assertEqual(exc.exception.status_code, 409)
                self.assertEqual(main._cases["TEST-LEGACY"]["status"], state)
                self.assertEqual(main._reviews, {})
                self.assertEqual(main._audit, [])

    def test_stale_legacy_approval_cannot_release_download_or_mark_preview_approved(self):
        from datetime import datetime, timezone
        from app import main
        from app.models import ReviewOut, ReviewDecision
        stale_review = ReviewOut(id="OLD-REVIEW", case_id="TEST-LEGACY", reviewer_id="TEST", reviewer_name="Test Reviewer", decision=ReviewDecision.approved, note="Old approval", follow_up_window="Routine", created_at=datetime.now(timezone.utc))
        with patch.dict(main._cases, {"TEST-LEGACY": {"id": "TEST-LEGACY", "status": "report_ready"}}, clear=True), patch.dict(main._reviews, {"TEST-LEGACY": stale_review}, clear=True), patch.object(main, "_audit", []):
            for action in (main.release_report, main.download_report):
                with self.subTest(action=action.__name__):
                    with self.assertRaises(HTTPException) as exc:
                        action("TEST-LEGACY")
                    self.assertEqual(exc.exception.status_code, 409)
            preview = main.report_preview("TEST-LEGACY")
            self.assertEqual(preview.release_status, "draft")
            self.assertIsNone(preview.report_number)
            self.assertEqual(main._audit, [])

    def test_legacy_follow_up_review_remains_available(self):
        from app import main
        from app.models import ReviewCreate, ReviewDecision
        with patch.dict(main._cases, {"TEST-LEGACY": {"id": "TEST-LEGACY", "status": "analysis_unavailable"}}, clear=True), patch.dict(main._reviews, {}, clear=True), patch.object(main, "_audit", []):
            review = main.submit_review("TEST-LEGACY", ReviewCreate(decision=ReviewDecision.rescan, note="Acquire a usable scan"))
            self.assertEqual(review.decision, ReviewDecision.rescan)
            self.assertEqual(main._cases["TEST-LEGACY"]["status"], "analysis_unavailable")
            self.assertEqual(len(main._audit), 1)

    def test_registry_has_no_disease_models_or_validation_claims(self):
        from app import main
        result = main.model_registry()
        self.assertEqual(result["diseases"], [])
        self.assertIsNone(result["validation_auc"])
        self.assertFalse(result["image_pipeline"]["trained_risk_classifier"])


if __name__ == "__main__":
    unittest.main()
