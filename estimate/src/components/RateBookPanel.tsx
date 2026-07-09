import { DocumentImport } from "@carbon/icons-react";
import { Button, Stack, Tag, Tile } from "@carbon/react";
import { useRef } from "react";
import { loadEmbeddedCpwdPack, loadPackFromFile } from "../lib/loadPack.js";
import { useStore } from "../store.js";

/** Step 1 — load a rate library pack (CPWD DSR embedded or import). */
export function RateBookPanel() {
  const index = useStore((s) => s.rateBookIndex);
  const loading = useStore((s) => s.rateBookLoading);
  const error = useStore((s) => s.rateBookError);
  const loadRateBook = useStore((s) => s.loadRateBook);
  const setLoading = useStore((s) => s.setRateBookLoading);
  const setError = useStore((s) => s.setRateBookError);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadEmbedded() {
    setLoading(true);
    setError(null);
    try {
      const pack = await loadEmbeddedCpwdPack();
      loadRateBook(pack);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load CPWD pack");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const pack = await loadPackFromFile(file);
      loadRateBook(pack);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid pack file");
    } finally {
      setLoading(false);
    }
  }

  const pack = index?.pack;

  return (
    <Tile>
      <Stack gap={4}>
        <div>
          <h2 className="est-h2">Rate book</h2>
          <p className="est-help">
            A <strong>rate book</strong> is the priced schedule (CPWD DSR). Each <strong>rate item</strong> has a
            code, full <strong>specification</strong> text, unit, and rate. <strong>Recipes</strong> link items to
            materials (e.g. cement quintals per m³ of concrete).
          </p>
        </div>

        <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "center" }}>
          <Button onClick={() => void loadEmbedded()} disabled={loading}>
            {loading ? "Loading…" : "Load CPWD DSR 2021"}
          </Button>
          <Button kind="tertiary" renderIcon={DocumentImport} onClick={() => fileRef.current?.click()} disabled={loading}>
            Import pack…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.pack.json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </Stack>

        {error && <p className="est-help" style={{ color: "var(--cds-support-error)" }}>{error}</p>}

        {pack && index && (
          <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
            <Tag type="blue">{pack.edition}</Tag>
            <Tag type="gray">{pack.rateItems.length.toLocaleString("en-IN")} rate items</Tag>
            <Tag type="gray">{pack.workItems.length.toLocaleString("en-IN")} work items</Tag>
            <Tag type="teal">{pack.recipes.length} recipes</Tag>
            <Tag type="purple">{pack.rateItems.filter((r) => r.derivations.length > 0).length} with derivations</Tag>
            <Tag type="gray">{pack.materials.length} materials</Tag>
          </Stack>
        )}

        {!pack && !loading && (
          <p className="est-help">Load a rate book before adding items from the schedule.</p>
        )}
      </Stack>
    </Tile>
  );
}
