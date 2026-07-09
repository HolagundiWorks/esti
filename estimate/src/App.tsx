import { Download, Reset } from "@carbon/icons-react";
import { Button, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Tag, TextInput, Tile } from "@carbon/react";
import { useMemo, useState } from "react";
import { BoqPreviewPanel } from "./components/BoqPreviewPanel.js";
import { BbsPanel } from "./components/BbsPanel.js";
import { ItemsPanel } from "./components/ItemsPanel.js";
import { MaterialsPanel } from "./components/MaterialsPanel.js";
import { ModelGraphPanel } from "./components/ModelGraphPanel.js";
import { RateBookPanel } from "./components/RateBookPanel.js";
import { RateItemPicker } from "./components/RateItemPicker.js";
import { SavedPanel } from "./components/SavedPanel.js";
import { SteelSchedulePanel } from "./components/SteelSchedulePanel.js";
import { modelToDraft, previewCost, sealEstimate } from "./core/build.js";
import { totalSteelKg } from "./core/bbsCompute.js";
import { downloadJson, inr } from "./lib/download.js";
import { useStore } from "./store.js";

const PREVIEW_CREATED_AT = "2000-01-01T00:00:00.000Z";

export function App() {
  const model = useStore((s) => s.model);
  const rateBookIndex = useStore((s) => s.rateBookIndex);
  const setMeta = useStore((s) => s.setMeta);
  const reset = useStore((s) => s.reset);
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const preview = useMemo(() => {
    try {
      const draft = modelToDraft(model, PREVIEW_CREATED_AT, rateBookIndex);
      return { costed: previewCost(draft), error: null as string | null };
    } catch (e) {
      return { costed: null, error: e instanceof Error ? e.message : "preview failed" };
    }
  }, [model, rateBookIndex]);

  async function exportFile() {
    setStatus(null);
    try {
      const draft = modelToDraft(model, new Date().toISOString(), rateBookIndex);
      const file = await sealEstimate(draft);
      const name = (model.estimateName || "estimate").replace(/[^\w.-]+/g, "-").toLowerCase();
      downloadJson(`${name}.aormsest`, file);
      setStatus(`Exported ${name}.aormsest — import in AORMS › Project › Cost Management.`);
    } catch (e) {
      setStatus(e instanceof Error ? `Export failed: ${e.message}` : "Export failed");
    }
  }

  const costed = preview.costed;
  const steelKg = totalSteelKg(model.bbs);
  const canExport =
    (model.items.length > 0 && model.items.some((i) => i.code)) || model.bbs.length > 0;

  return (
    <div className="est-shell">
      <header className="est-header">
        <Stack gap={2}>
          <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
            <img src="/esti-mark.png" alt="" aria-hidden className="est-mark" />
            <h1 className="est-h1">AORMS Estimate</h1>
            <Tag type="cool-gray" size="sm">CPWD rate book · offline</Tag>
          </Stack>
          <p className="est-help">
            Load a rate book → pick items from CPWD DSR → measure → materials derive from recipes → export{" "}
            <code>.aormsest</code> for AORMS.
          </p>
        </Stack>
      </header>

      <Tile className="est-meta">
        <div className="est-field-grid">
          <TextInput id="est-name" labelText="Estimate name" value={model.estimateName} onChange={(e) => setMeta({ estimateName: e.target.value })} />
          <TextInput id="est-project" labelText="Project name" value={model.projectName ?? ""} onChange={(e) => setMeta({ projectName: e.target.value })} />
          <TextInput id="est-rb-code" labelText="Rate book code" value={model.rateBookCode} readOnly />
          <TextInput id="est-rb-name" labelText="Rate book name" value={model.rateBookName} readOnly />
        </div>
        <Stack orientation="horizontal" gap={4} style={{ alignItems: "center", flexWrap: "wrap" }}>
          {costed ? (
            <>
              <Tag type="blue" size="md">Abstract {inr(costed.abstract.totalCostedPaise)}</Tag>
              {costed.abstract.totalLeadPaise ? <Tag type="cyan" size="md">Lead {inr(costed.abstract.totalLeadPaise)}</Tag> : null}
              <Tag type="gray" size="md">{model.items.length} items</Tag>
              <Tag type="teal" size="md">{costed.materials.rows.length} materials</Tag>
              {steelKg > 0 && (
                <Tag type="purple" size="md">
                  Steel {steelKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
                </Tag>
              )}
            </>
          ) : (
            <Tag type="red" size="md">Preview error: {preview.error}</Tag>
          )}
          <Button renderIcon={Download} onClick={exportFile} disabled={!canExport}>
            Export .aormsest
          </Button>
          <Button kind="ghost" renderIcon={Reset} onClick={reset}>Reset</Button>
        </Stack>
        {status && <p className="est-help">{status}</p>}
      </Tile>

      <SavedPanel />

      <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex ?? 0)}>
        <TabList aria-label="Estimate workflow">
          <Tab>1 · Rate book</Tab>
          <Tab disabled={!rateBookIndex}>2 · Add items</Tab>
          <Tab disabled={!rateBookIndex}>3 · Measure</Tab>
          <Tab disabled={!rateBookIndex}>4 · Model graph</Tab>
          <Tab disabled={!rateBookIndex}>5 · BOQ &amp; materials</Tab>
          <Tab>6 · BBS / steel</Tab>
        </TabList>
        <TabPanels>
          <TabPanel><RateBookPanel /></TabPanel>
          <TabPanel>
            <Stack gap={5}>
              <RateItemPicker />
            </Stack>
          </TabPanel>
          <TabPanel><ItemsPanel /></TabPanel>
          <TabPanel><ModelGraphPanel /></TabPanel>
          <TabPanel>
            <Stack gap={7}>
              <BoqPreviewPanel costed={costed} />
              <MaterialsPanel />
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack gap={7}>
              <BbsPanel />
              <SteelSchedulePanel />
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
