#!/usr/bin/env bash
# Source from anywhere; all task-generated caches remain in the repository.
if [ -n "${ZSH_VERSION:-}" ]; then
  TASK_ENV_FILE="${(%):-%x}"
else
  TASK_ENV_FILE="${BASH_SOURCE[0]}"
fi
TASK_REPO_ROOT="$(cd "$(dirname "$TASK_ENV_FILE")/.." && pwd)"
export UV_CACHE_DIR="$TASK_REPO_ROOT/.cache/uv"
export UV_PYTHON_INSTALL_DIR="$TASK_REPO_ROOT/.cache/python"
export TMPDIR="$TASK_REPO_ROOT/.cache/tmp"
export MPLCONFIGDIR="$TASK_REPO_ROOT/.cache/matplotlib"
export XDG_CACHE_HOME="$TASK_REPO_ROOT/.cache"
export HF_HOME="$TASK_REPO_ROOT/.cache/huggingface"
export TORCH_HOME="$TASK_REPO_ROOT/.cache/torch"
export PYTHONPYCACHEPREFIX="$TASK_REPO_ROOT/.cache/pycache"
export OMP_NUM_THREADS=2
export OPENBLAS_NUM_THREADS=2
export MKL_NUM_THREADS=2
mkdir -p "$TMPDIR" "$MPLCONFIGDIR"
