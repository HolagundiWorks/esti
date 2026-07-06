/**
 * Cost Management › Estimation — import an `.aormsest` under this project and view
 * its costed Abstract / Materials, plus the project Rate Book. The selected
 * estimate (via `?est=`) is shared with the BOQ and BBS cost tabs.
 */
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  MenuItem,
  Stack,
  styled,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { useUploadAuth } from "../../lib/uploadAuth.js";
import { trpc } from "../../lib/trpc.js";
import { AbstractTab, EstimateSummary, MaterialsTab, ProjectRateBook } from "./estimate/estimateViews.js";
import { useProjectEstimate } from "./estimate/useProjectEstimate.js";

const HiddenInput = styled("input")({ display: "none" });

export function ProjectEstimation({ projectId }: { projectId: string }) {
  const { authorizedFetch } = useUploadAuth();
  const utils = trpc.useUtils();
  const { estimates, selectedId, setSelected, costed, rateBook, loading } = useProjectEstimate(projectId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

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
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <TextField
          id="proj-estimate-select"
          className="esti-grow"
          select
          size="small"
          label="Estimate"
          value={estimates.find((e) => e.id === selectedId)?.id ?? ""}
          onChange={(e) => setSelected(e.target.value || null)}
        >
          <MenuItem value="" disabled>Select an imported estimate</MenuItem>
          {estimates.map((it) => (
            <MenuItem key={it.id} value={it.id}>{it.title}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" component="label" disabled={busy}>
          {busy ? "Importing…" : "Import .aormsest"}
          <HiddenInput
            type="file"
            accept=".aormsest,.json"
            disabled={busy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
            }}
          />
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Import failed</AlertTitle>
          {error}
        </Alert>
      )}

      {rateBook && costed && (
        <Stack spacing={1}>
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
          <Box>
            <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} aria-label="Estimate detail">
              <Tab label="Abstract" />
              <Tab label="Materials" />
              <Tab label="Rate Book" />
            </Tabs>
            <Box sx={{ pt: 2 }}>
              {tab === 0 && <AbstractTab c={costed} />}
              {tab === 1 && <MaterialsTab c={costed} />}
              {tab === 2 && <ProjectRateBook projectId={projectId} />}
            </Box>
          </Box>
        ) : (
          <span className="esti-label esti-label--helper">Select an estimate to view its costing.</span>
        )}
      </DataState>
    </Stack>
  );
}
