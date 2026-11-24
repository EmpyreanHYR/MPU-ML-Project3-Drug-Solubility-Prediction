#!/usr/bin/env bash
# Build the archived V1 report. Its LaTeX source now lives outside the repository.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
REPORT_DIR="${1:-$TASK_REPO_ROOT/../旧文件备份/Assignment_Report}"
if [[ ! -f "$REPORT_DIR/Assignment-main.tex" ]]; then
  echo "Report source not found: $REPORT_DIR/Assignment-main.tex" >&2
  echo "Usage: $0 [path-to-report-dir]  (default: ../旧文件备份/Assignment_Report)" >&2
  exit 1
fi
cd "$REPORT_DIR"
latexmk -xelatex -interaction=nonstopmode -halt-on-error Assignment-main.tex
