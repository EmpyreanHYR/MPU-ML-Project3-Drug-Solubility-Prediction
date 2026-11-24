#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$TASK_REPO_ROOT"
exec uv run --frozen uvicorn hehaoran.webapp.server:app --host 127.0.0.1 --port "${PORT:-8502}"
