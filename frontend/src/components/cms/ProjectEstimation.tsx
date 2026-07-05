/**
 * Cost Management › Estimation — import an `.aormsest` under this project and view
 * its costed Abstract / Materials, plus the project Rate Book. The selected
 * estimate (via `?est=`) is shared with the BOQ and BBS cost tabs.
 */
import {
  Dropdown,
  FileUploaderButton,
  InlineNotification,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { useUploadAuth } from "../../lib/uploadAuth.js";
import { trpc } from "../../lib/trpc.js";
import { AbstractTab, EstimateSummary, MaterialsTab, ProjectRateBook } from "./estimate/estimateViews.js";
import { useProjectEstimate } from "./estimate/useProjectEstimate.js";

export function ProjectEstimation({ projectId }: { projectId: string }) {
  const { authorizedFetch } = useUploadAuth();
  const utils = trpc.useUtils();
  const { estimates, selectedId, setSelected, costed, rateBook, loading } = useProjectEstimate(projectId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/estimate", (fd) => {
        fd.append("title", file.name.replace(/\.aormsest$|\.json$/i, ""));
        fd.append("projectId", projectId);
        fd.append("file", file);
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      await utils.estimates.list.invalidate();
      if (body.id) setSelected(body.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={4} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <Dropdown
          id="proj-estimate-select"
          className="esti-grow"
          titleText="Estimate"
          label="Select an imported estimate"
          items={estimates}
          itemToString={(it) => (it ? it.title : "")}
          selectedItem={estimates.find((e) => e.id === selectedId) ?? null}
          onChange={({ selectedItem }) => setSelected(selectedItem?.id ?? null)}
        />
        <FileUploaderButton
          labelText={busy ? "Importing…" : "Import .aormsest"}
          size="md"
          accept={[".aormsest", ".json"]}
          disableLabelChanges
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
          }}
        />
      </Stack>

      {error && (
        <InlineNotification kind="error" title="Import failed" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
      )}

      {rateBook && costed && (
        <Stack gap={2}>
          <span className="esti-label esti-label--helper">
            Rate book: {rateBook.name} ({rateBook.entryCount} rates
            {rateBook.projectOverrides ? `, ${rateBook.projectOverrides} project overrides` : ""})
          </span>
          <EstimateSummary c={costed} />
        </Stack>
      )}

      <DataState
        loading={loading}
        isEmpty={estimates.length === 0}
        columnCount={8}
        empty={{ title: "No estimates yet", description: "Import an .aormsest file exported from the Estimate app." }}
      >
        {costed ? (
          <Tabs>
            <TabList aria-label="Estimate detail" contained>
              <Tab>Abstract</Tab>
              <Tab>Materials</Tab>
              <Tab>Rate Book</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <AbstractTab c={costed} />
              </TabPanel>
              <TabPanel>
                <MaterialsTab c={costed} />
              </TabPanel>
              <TabPanel>
                <ProjectRateBook projectId={projectId} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <span className="esti-label esti-label--helper">Select an estimate to view its costing.</span>
        )}
      </DataState>
    </Stack>
  );
}
