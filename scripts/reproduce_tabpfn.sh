#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
# The original public v2 checkpoint and its license are retained in tabpfn_probe/.
# Run reproduce.sh first; this stage verifies and reuses its inner OOF predictions.
.venv/bin/python scripts/run_tabpfn_combination_v3.py all
.venv/bin/python scripts/export_tabpfn_combination_v3.py
.venv/bin/python scripts/summarize_combination_v3.py
