#!/usr/bin/env bash
set -euo pipefail

python_bin="python3"
if [[ -x .venv/bin/python ]]; then python_bin=".venv/bin/python"; fi

"$python_bin" -m pytest -q \
  apps/runner/tests/test_contracts.py \
  apps/runner/tests/test_evaluator.py \
  apps/runner/tests/test_generator.py
