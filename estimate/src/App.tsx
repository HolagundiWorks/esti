import { Download, Reset } from "@carbon/icons-react";
import { Button, Stack, Tag, TextInput, Tile } from "@carbon/react";
import { useMemo, useState } from "react";
import { modelToDraft, previewCost, sealEstimate } from "./core/build.js";
import { BbsPanel } from "./components/BbsPanel.js";
import { ItemsPanel } from "./components/ItemsPanel.js";
import { MaterialsPanel } from "./components/MaterialsPanel.js";
import { SavedPanel } from "./components/SavedPanel.js";
import { downloadJson, inr } from "./lib/download.js";
import { useStore } from "./store.js";

const PREVIEW_CREATED_AT = "2000-01-01T00:00:00.000Z"; // stable for preview; export uses real time

export function App() {
  const model = useStore((s) => s.model);
  const setMeta = useStore((s) => s.setMeta);
  const reset = useStore((s) => s.reset);
  const [status, setStatus] = useState<string | null>(null);

  // Live preview — re-cost the model against its own as-estimated rates.
  const preview = useMemo(() => {
    try {
      const draft = modelToDraft(model, PREVIEW_CREATED_AT);
      return { costed: previewCost(draft), error: null as string | null };
    } catch (e) {
      return { costed: null, error: e instanceof Error ? e.message : "preview failed" };
    }
  }, [model]);

  async function exportFile() {
    setStatus(null);
    try {
      const draft = modelToDraft(model, new Date().toISOString());
      const file = await sealEstimate(draft);
      const name = (model.estimateName || "estimate").replace(/[^\w.-]+/g, "-").toLowerCase();
      downloadJson(`${name}.aormsest`, file);
      setStatus(`Exported ${name}.aormsest — import it in AORMS › project › Cost Management.`);
    } catch (e) {
      setStatus(e instanceof Error ? `Export failed: ${e.message}` : "Export failed");
    }
  }

  const costed = preview.costed;
  return (
    <div className="est-shell">
      <header className="est-header">
        <Stack gap={2}>
          <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
            <img src="/esti-mark.png" alt="" aria-hidden className="est-mark" />
            <h1 className="est-h1">AORMS Estimate</h1>
            <Tag type="cool-gray" size="sm">offline · exports .aormsest</Tag>
          </Stack>
          <p className="est-help">
            Measure once, derive everything. Enter items and measurements, model steel, then export a sealed{" "}
            <code>.aormsest</code> to import and re-cost in AORMS.
          </p>
        </Stack>
      </header>

      <Tile className="est-meta">
        <div className="est-field-grid">
          <TextInput id="est-name" labelText="Estimate name" value={model.estimateName} onChange={(e) => setMeta({ estimateName: e.target.value })} />
          <TextInput id="est-project" labelText="Project name" value={model.projectName ?? ""} onChange={(e) => setMeta({ projectName: e.target.value })} />
          <TextInput id="est-rb-code" labelText="Rate book code" value={model.rateBookCode} onChange={(e) => setMeta({ rateBookCode: e.target.value })} />
          <TextInput id="est-rb-name" labelText="Rate book name" value={model.rateBookName} onChange={(e) => setMeta({ rateBookName: e.target.value })} />
        </div>
        <Stack orientation="horizontal" gap={4} style={{ alignItems: "center", flexWrap: "wrap" }}>
          {costed ? (
            <>
              <Tag type="blue" size="md">Abstract {inr(costed.abstract.totalCostedPaise)}</Tag>
              {costed.abstract.totalLeadPaise ? <Tag type="cyan" size="md">Lead {inr(costed.abstract.totalLeadPaise)}</Tag> : null}
              <Tag type="teal" size="md">
                Steel {costed.steel.totalWeightKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
              </Tag>
              <Tag type="gray" size="md">{model.items.length} items</Tag>
            </>
          ) : (
            <Tag type="red" size="md">Preview error: {preview.error}</Tag>
          )}
          <Button renderIcon={Download} onClick={exportFile} disabled={model.items.length === 0}>
            Export .aormsest
          </Button>
          <Button kind="ghost" renderIcon={Reset} onClick={reset}>Reset</Button>
        </Stack>
        {status && <p className="est-help">{status}</p>}
      </Tile>

      <SavedPanel />

      <main className="est-main">
        <ItemsPanel />
        <MaterialsPanel />
        <BbsPanel />
      </main>
    </div>
  );
}
