# ESTI AORMS Python worker (ezdxf / WeasyPrint / pymupdf4llm / pandas)
FROM python:3.12-slim

# WeasyPrint system deps (pango/cairo/gdk-pixbuf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY worker/ ./

CMD ["python", "-m", "esti_worker.main"]
