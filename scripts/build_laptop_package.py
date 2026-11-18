"""Build a zip for running Eyezheimer (website + AI) on a Linux laptop.
Run: python scripts/build_laptop_package.py  ->  D:/Themoeye/Eyezheimer_Laptop_Linux.zip
Contents: files tracked or newly added in git (no secrets, no node_modules, no build output), the ONNX model,
the 9 ROSE-O test images, and the Linux scripts at the top level. Never include .env files.
"""
import subprocess, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path("D:/Themoeye/Eyezheimer_Laptop_Linux.zip")
TOP = "Eyezheimer"
# Not needed to run the app; large or unrelated.
SKIP_PREFIXES = ("docs/", "promo-claude/", "internet-reference-images/", "LogoNew/", ".github/", "test-assets/", "web/", "backend/train/", "Poster ", "Presentation ")
EXTRA = ["backend/models/octa/octa_vessel_unet.onnx", *[f"test-upload-images/real-octa/rose_o_test_{i:02d}.png" for i in range(1, 10)]]
SCRIPTS = ["setup-linux.sh", "start-linux.sh", "stop-linux.sh"]

listed = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT, capture_output=True, check=True).stdout.decode("utf-8").split("\0")
files = sorted({f for f in listed if f and (ROOT / f).is_file() and not f.startswith(SKIP_PREFIXES) and not Path(f).name.startswith(".env")} | set(EXTRA))
files = [f for f in files if not f.startswith(("ต้นแบบ",))]  # Thai-named design-mockup folder
assert not any(Path(f).name.startswith(".env") for f in files), "a .env file would leak secrets"
for need in ["package.json", "package-lock.json", "scripts/local-demo.mjs", "backend/requirements-local.txt", "backend/app/main.py", "backend/models/octa/model_card.json", *EXTRA]:
    assert need in files and (ROOT / need).is_file(), f"missing {need}"

def add(z: zipfile.ZipFile, src: Path, arc: str, executable: bool = False):
    info = zipfile.ZipInfo.from_file(src, arc)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (0o100755 if executable else 0o100644) << 16  # keep Unix permissions for unzip on Linux
    z.writestr(info, src.read_bytes())

with zipfile.ZipFile(OUT, "w") as z:
    for f in files:
        add(z, ROOT / f, f"{TOP}/{f}", executable=f.endswith(".sh"))
    for s in SCRIPTS:
        add(z, ROOT / "scripts/laptop" / s, f"{TOP}/{s}", executable=True)
    add(z, ROOT / "scripts/laptop/README-LAPTOP-TH.txt", f"{TOP}/README-LAPTOP-TH.txt")
print(f"{OUT}  {OUT.stat().st_size / 1e6:.1f} MB  ({len(files) + len(SCRIPTS) + 1} files)")
