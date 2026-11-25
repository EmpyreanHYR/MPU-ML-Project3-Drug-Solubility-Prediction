#!/bin/bash
# Finder does not inherit the PATH of an interactive terminal.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")" || exit 1
source scripts/env.sh
if [ -x .venv/bin/python ]; then
  .venv/bin/python hehaoyang/run.py launch_studio.py "$@"
elif command -v uv >/dev/null 2>&1; then
  uv run --frozen python hehaoyang/run.py launch_studio.py "$@"
else
  echo "Cannot find the project Python environment or uv."
  echo "Install uv, then run: uv sync --frozen"
  read -r -p "Press Enter to close..."
  exit 1
fi
result=$?
if [ "$result" -ne 0 ] && [ "$result" -ne 130 ]; then
  echo "Studio could not start. See the error above."
  read -r -p "Press Enter to close..."
fi
exit "$result"
