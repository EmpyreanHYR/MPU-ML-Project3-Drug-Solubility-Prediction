#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
TASK_EXPERIMENT_PYTHON=.venv/bin/python
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_pilot.py
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_nested.py freeze
for family in RichExtraTrees RichCatBoost MultiViewKernel TabM; do
  "$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_nested.py nested --family "$family"
done
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_nested.py blend
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_nested.py collect
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py run_combination_nested.py deploy
"$TASK_EXPERIMENT_PYTHON" huangyaorong/run.py export_combination_variants.py
"$TASK_EXPERIMENT_PYTHON" scripts/analyze_combination_v3.py
"$TASK_EXPERIMENT_PYTHON" scripts/summarize_combination_v3.py
