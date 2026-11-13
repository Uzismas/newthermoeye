import os
import unittest
from unittest import mock

from fastapi import HTTPException

from app.octa_routes import require_backend_key


class BackendKeyTest(unittest.TestCase):
    def test_unset_key_allows_local_use(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("THERMOEYE_BACKEND_KEY", None)
            self.assertIsNone(require_backend_key(None))

    def test_set_key_rejects_missing_and_wrong(self):
        with mock.patch.dict(os.environ, {"THERMOEYE_BACKEND_KEY": "s3cret-value"}):
            for supplied in (None, "", "wrong"):
                with self.assertRaises(HTTPException) as ctx:
                    require_backend_key(supplied)
                self.assertEqual(ctx.exception.status_code, 401)

    def test_set_key_accepts_correct(self):
        with mock.patch.dict(os.environ, {"THERMOEYE_BACKEND_KEY": "s3cret-value"}):
            self.assertIsNone(require_backend_key("s3cret-value"))


if __name__ == "__main__":
    unittest.main()
