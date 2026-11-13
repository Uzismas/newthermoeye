"""Check which images in a folder the OCTA gate accepts or refuses (same code the service runs, no server needed).

Usage: backend/.venv/Scripts/python.exe scripts/check_octa_gate.py test-upload-images/not-octa
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
from app import octa_pipeline as P  # noqa: E402

FORMATS = {".png": ("image/png", "PNG"), ".jpg": ("image/jpeg", "JPEG"), ".jpeg": ("image/jpeg", "JPEG"), ".webp": ("image/webp", "WEBP"), ".tif": ("image/tiff", "TIFF"), ".tiff": ("image/tiff", "TIFF")}
folder = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "test-upload-images/not-octa")
files = sorted(p for p in folder.iterdir() if p.suffix.lower() in FORMATS)
if not files:
    sys.exit(f"No images in {folder}")
for p in files:
    mime, fmt = FORMATS[p.suffix.lower()]
    try:
        r = P.analyze_octa(p.read_bytes(), "scan" + p.suffix.lower(), mime_type=mime, expected_format=fmt)
        status = r["analysis_status"]
        why = r.get("failure_reason") or ""
        verdict = "ACCEPTED as OCTA" if status == "measured" else "REFUSED"
    except P.OCTAInputError as exc:
        verdict, why = "REFUSED", str(exc)
    print(f"{verdict:17} {p.name[:40]:41} {why[:110]}")
