# AORMS — Python worker

Consumes the Redis Streams job bus (`esti:jobs`) published by the TypeScript
backend and runs the document/data-heavy jobs where Python is strongest:

- **`dxf_to_svg`** — DXF takeoff conversion with [`ezdxf`](https://ezdxf.dev).
- **`pdf_to_markdown`** — Knowledge Bank portal: PDF → Markdown via
  [`pymupdf4llm`](https://github.com/HolagundiWorks/hcw-markdown-tool) (HCW Markdown Tool pipeline).
- **`render_pdf`** — GST tax-invoice / bill-of-supply / drawing-set PDFs with
  WeasyPrint.
- **`reconcile_import`** — bank / 26AS / AIS / GSTR imports + matching with pandas.

These four job types are the complete handler set (`esti_worker/jobs/__init__.py`).
The AORMS cognition engine runs in the TypeScript backend
(`backend/src/modules/cognition/`); there are no Python cognition/ML worker jobs.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m esti_worker.main      # consumes the job bus
ruff check . && pytest          # lint + tests
```

See [docs/esti/ARCHITECTURE.md](../docs/esti/ARCHITECTURE.md) ADR-10.
