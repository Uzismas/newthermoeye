import builtins
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from app import main, octa_pipeline


class RuntimeReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        root = Path(self.temp.name)
        self.model = root / "octa_vessel_unet.onnx"
        self.legacy = root / "legacy.onnx"
        self.card = root / "model_card.json"
        self.paths = patch.object(octa_pipeline, "ONNX_MODEL_PATHS", (self.model, self.legacy))
        self.paths.start()

    def tearDown(self):
        self.paths.stop()
        self.temp.cleanup()

    def write_card(self, digest):
        self.card.write_text(json.dumps({"artifact_sha256": digest}), encoding="utf-8")

    def test_missing_model_is_degraded_with_actionable_error(self):
        response = main.readiness_check()
        self.assertEqual(response.status_code, 503)
        model = json.loads(response.body)["model"]
        self.assertEqual(model["status"], "missing")
        self.assertIn("Restore", model["error"])
        self.assertEqual(model["model_hash"], None)

    def test_hash_mismatch_reports_model_hash_and_version(self):
        self.model.write_bytes(b"not-the-reviewed-model")
        digest = hashlib.sha256(self.model.read_bytes()).hexdigest()
        self.write_card("0" * 64)

        model = octa_pipeline.inspect_model_readiness()
        self.assertEqual(model["status"], "corrupt")
        self.assertEqual(model["model_hash"], digest)
        self.assertEqual(model["model_version"], f"octa-vessel-unet-sha256:{digest}")
        self.assertIn("does not match", model["error"])
        self.assertNotIn(self.temp.name, model["error"])

    def test_unloadable_model_is_corrupt_even_when_hash_matches_card(self):
        self.model.write_bytes(b"not-an-onnx-file")
        digest = hashlib.sha256(self.model.read_bytes()).hexdigest()
        self.write_card(digest)

        model = octa_pipeline.inspect_model_readiness()
        self.assertEqual(model["status"], "corrupt")
        self.assertEqual(model["model_hash"], digest)
        self.assertIn("could not be loaded", model["error"])

    def test_missing_onnx_runtime_has_a_separate_actionable_status(self):
        self.model.write_bytes(b"runtime-not-importable")
        digest = hashlib.sha256(self.model.read_bytes()).hexdigest()
        self.write_card(digest)
        original_import = builtins.__import__

        def without_onnx_runtime(name, *args, **kwargs):
            if name == "onnxruntime":
                raise ImportError("simulated missing runtime")
            return original_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=without_onnx_runtime):
            model = octa_pipeline.inspect_model_readiness()

        self.assertEqual(model["status"], "runtime_missing")
        self.assertIn("virtual environment", model["error"])

    def test_real_artifact_readiness_reports_onnx_hash_and_version(self):
        self.paths.stop()
        try:
            model = octa_pipeline.inspect_model_readiness()
        finally:
            self.paths.start()
        self.assertEqual(model["status"], "ready")
        self.assertEqual(model["model_hash"], "195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87")
        self.assertEqual(model["model_version"], f"octa-vessel-unet-sha256:{model['model_hash']}")


if __name__ == "__main__":
    unittest.main()
