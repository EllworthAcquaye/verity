#!/usr/bin/env bash
set -euo pipefail

if [[ -x .venv/bin/pip-audit ]]; then
  .venv/bin/pip-audit --strict -r apps/runner/requirements.txt
else
  python3 -m pip_audit --strict -r apps/runner/requirements.txt
fi
