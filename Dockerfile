# ==============================================================================
# SOLAR Studio v5.0 — Multi-Stage Production Dockerfile (Python 3.12 + RDKit)
# ==============================================================================
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-install-project --no-dev

# ==============================================================================
# Stage 2: Minimal Runtime Image
# ==============================================================================
FROM python:3.12-slim-bookworm AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxrender1 \
    libxext6 \
    libsm6 \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    SOLAR_WORKERS=4 \
    SOLAR_RATE_LIMIT=240

COPY datasets ./datasets
COPY models ./models
COPY output ./output
COPY src ./src
COPY songjiayun ./songjiayun
COPY yuchunshen ./yuchunshen
COPY huangyaorong ./huangyaorong
COPY hehaoyang ./hehaoyang


EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" || exit 1

CMD ["uvicorn", "hehaoyang.webapp.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
