#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$TASK_REPO_ROOT/Assignment_Report"
latexmk -xelatex -interaction=nonstopmode -halt-on-error Assignment-main.tex
