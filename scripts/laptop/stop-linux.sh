#!/usr/bin/env bash
# Stop the Eyezheimer website + AI started by start-linux.sh. Run: bash stop-linux.sh
set -eo pipefail
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
set +e; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1; set -e  # nvm is not safe under set -e
export THERMOEYE_PYTHON="$PWD/backend/.venv/bin/python"
node scripts/local-demo.mjs stop
