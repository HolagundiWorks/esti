# AORMS — Python worker

Consumes the Redis Streams job bus (`esti:jobs`) published by the TypeScript
backend and runs the document/data-heavy jobs where Python is strongest:

- **`dxf_to_svg`** — DXF takeoff conversion with [`ezdxf`](https://ezdxf.dev).
- **`render_pdf`** — GST tax-invoice / bill-of-supply / drawing-set PDFs with
  WeasyPrint.
- **`reconcile_import`** — bank / 26AS / AIS / GSTR imports + matching with pandas.
- **cognition jobs** — anomaly recognition, prediction, graph reasoning, and
  AI/ML monitoring for the AORMS cognition engine. Deterministic business truth
  still belongs to the TypeScript backend; Python supplies derived signals.

## Cognition stack

- `scikit-learn`: anomaly recognition and clustering.
- `xgboost-cpu`: first local prediction models without CUDA dependencies.
- `networkx`: dependency graph reasoning support.
- `durable-rules`: optional Python rules engine for worker-side experiments.
- `mlflow`: model/run tracking.
- `evidently`: data drift and model monitoring.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m esti_worker.main      # consumes the job bus
ruff check . && pytest          # lint + tests
```

See [docs/esti/ARCHITECTURE.md](../docs/esti/ARCHITECTURE.md) ADR-10.
