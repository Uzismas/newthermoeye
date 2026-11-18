#!/usr/bin/env bash
# One-time setup on Linux Mint / Ubuntu. Needs internet. Run: bash setup-linux.sh
set -eo pipefail
cd "$(dirname "$0")"
echo "== Eyezheimer laptop setup (one time, needs internet) =="

# 1. Node.js 24 (the launcher requires exactly v24) via nvm, installed in your home folder without sudo.
export NVM_DIR="$HOME/.nvm"
set +e; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; set -e  # nvm is not safe under set -e
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]; then
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    command -v curl >/dev/null 2>&1 || { echo "curl is missing. Run: sudo apt install curl   then run this script again."; exit 1; }
    echo "-- Installing nvm (Node version manager, official script)"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    set +e; . "$NVM_DIR/nvm.sh"; set -e
  fi
  echo "-- Installing Node.js 24"
  set +e; nvm install 24 && nvm alias default 24; set -e
fi
set +e; nvm use 24 >/dev/null 2>&1; set -e
command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" = "24" ] || { echo "Node.js 24 could not be installed. Check the internet connection and run this script again."; exit 1; }
echo "Node $(node -v)"

# 2. Python environment for the AI backend.
command -v python3 >/dev/null 2>&1 || { echo "python3 is missing. Run: sudo apt install python3 python3-venv   then run this script again."; exit 1; }
if [ ! -x backend/.venv/bin/python ]; then
  echo "-- Creating Python environment"
  python3 -m venv backend/.venv || { rm -rf backend/.venv; echo "Run: sudo apt install python3-venv   then run this script again."; exit 1; }
fi
echo "-- Installing AI packages (FastAPI, ONNX Runtime, NumPy, Pillow)"
backend/.venv/bin/python -m pip install --upgrade pip --quiet
backend/.venv/bin/python -m pip install -r backend/requirements-local.txt --quiet

# 3. Website packages and production build.
echo "-- Installing website packages"
npm ci --no-audit --no-fund
echo "-- Building the website (a few minutes)"
THERMOEYE_PYTHON="$PWD/backend/.venv/bin/python" node scripts/local-demo.mjs build

chmod +x start-linux.sh stop-linux.sh 2>/dev/null || true
echo
echo "Setup finished. From now on, no internet is needed: run  bash start-linux.sh"
