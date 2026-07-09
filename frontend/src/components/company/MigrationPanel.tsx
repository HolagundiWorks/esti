import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { trpc } from "../../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

/** Import or export a studio bundle between workspaces (owner). */
export function MigrationPanel() {
  const utils = trpc.useUtils();
  const preflightQ = trpc.migration.preflight.useQuery();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const importMut = trpc.migration.import.useMutation({
    onSuccess: (r) => setMsg(r.diff.ok ? "Bundle imported and verified." : "Imported, but verification did not pass."),
    onError: (e) => setErr(e.message),
  });

  async function download() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const bundle = await utils.migration.export.fetch();
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aorms-studio-bundle.json";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Studio bundle downloaded.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not export the studio bundle.");
    }
    setBusy(false);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    setMsg(null);
    try {
      const bundle = JSON.parse(await f.text());
      importMut.mutate(bundle);
    } catch {
      setErr("That file is not a valid studio bundle.");
    }
  }

  const pf = preflightQ.data;
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h3">Studio migration</Typography>
        <Typography variant="body2" color="text.secondary">
          Export this workspace as a JSON bundle, or import a bundle into a fresh empty
          workspace. Import refuses a non-empty target and rolls back if verification fails.
        </Typography>
        {pf && (
          <Typography variant="caption" color="text.secondary">
            {pf.counts.projects} projects · {pf.counts.clients} clients · {pf.counts.invoices} invoices ·{" "}
            {(pf.fileBytes / 1048576).toFixed(1)} MB files · schema {pf.schemaHead}
          </Typography>
        )}
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={download} disabled={busy}>
            {busy ? "Preparing…" : "Export bundle"}
          </Button>
          <Button variant="contained" component="label" disabled={importMut.isPending}>
            {importMut.isPending ? "Importing…" : "Import bundle"}
            <HiddenFileInput type="file" accept=".json,application/json" onChange={onFile} />
          </Button>
        </Stack>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
      </Stack>
    </Box>
  );
}
