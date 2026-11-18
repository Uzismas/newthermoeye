#!/usr/bin/env bash
# Start the Eyezheimer website + AI on this laptop. Run: bash start-linux.sh
set -eo pipefail
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
set +e; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1; set -e  # nvm is not safe under set -e
[ -x backend/.venv/bin/python ] || { echo "Run  bash setup-linux.sh  first."; exit 1; }
export THERMOEYE_PYTHON="$PWD/backend/.venv/bin/python"
export THERMOEYE_BACKEND_KEY=""   # local demo: the website and AI talk on this laptop only
node scripts/local-demo.mjs start
URL="http://127.0.0.1:3000"
echo
echo "Open $URL  (login is pre-filled; press Enter research console)"
echo "Test images: $PWD/test-upload-images/real-octa"
command -v xdg-open >/dev/null 2>&1 && (xdg-open "$URL" >/dev/null 2>&1 &) || true
