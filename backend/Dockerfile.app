FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 libgl1 libglib2.0-0 libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# PaddlePaddle 3.x CPU wheels live on Paddle’s index; PyPI alone often fails or lags.
ARG PADDLE_CPU_INDEX=https://www.paddlepaddle.org.cn/packages/stable/cpu/
RUN pip install --no-cache-dir \
    -i "${PADDLE_CPU_INDEX}" --trusted-host www.paddlepaddle.org.cn \
    "paddlepaddle>=3.0.0,<4.0.0"

COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[dev]"
# Warm models (PO 2.x vs 3.x ctor differs — mirror app/services/ocr.py).
RUN python - <<'PY'
from paddleocr import PaddleOCR
kw = dict(lang='de', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)
try:
    PaddleOCR(**kw)
except TypeError:
    PaddleOCR(lang='de')
PY

COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY tests/ ./tests/
COPY scripts/ ./scripts/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
