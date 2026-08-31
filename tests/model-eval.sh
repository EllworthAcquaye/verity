#!/usr/bin/env bash
set -euo pipefail

python_bin="python3"
if [[ -x .venv/bin/python ]]; then python_bin=".venv/bin/python"; fi

"$python_bin" -m pytest -q apps/runner/evals/test_model_governance.py
