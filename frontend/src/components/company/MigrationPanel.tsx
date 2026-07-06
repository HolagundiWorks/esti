import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { useEdition } from "../../lib/edition.js";
import { trpc } from "../../lib/trpc.js";

// Visually-hidden native file input (styled component, not a raw control tag).
const HiddenFileInput = styled("input")({ display: "none" });

/**
 * Cloud migration (owner). Export this studio as a JSON bundle, then import it
 * into a freshly provisioned EMPTY cloud tenant. Material UI.
 */
export function MigrationPanel() {
  const utils = trpc.useUtils();
  const { community } = useEdition();
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
        <Typography variant="h6" component="h3">{community ? "Move to AORMS Pro" : "Cloud migration"}</Typography>
        <Typography variant="body2" color="text.secondary">
          {community
            ? "Package this whole company as a bundle, then import it into a fresh AORMS Pro workspace. Migration is one-way, Community → Pro."
            : "Import a company bundle exported from a Community/Lite install into this fresh, empty workspace. Import refuses a non-empty target and rolls back if verification fails."}
        </Typography>
        {pf && (
          <Typography variant="caption" color="text.secondary">
            {pf.counts.projects} projects · {pf.counts.clients} clients · {pf.counts.invoices} invoices ·{" "}
            {(pf.fileBytes / 1048576).toFixed(1)} MB files · schema {pf.schemaHead}
          </Typography>
        )}
        <Stack direction="row" spacing={1}>
          {community ? (
            <Button variant="contained" onClick={download} disabled={busy}>
              {busy ? "Preparing…" : "Package company for Pro"}
            </Button>
          ) : (
            <Button variant="contained" component="label" disabled={importMut.isPending}>
              {importMut.isPending ? "Importing…" : "Import a company bundle"}
              <HiddenFileInput type="file" accept=".json,application/json" onChange={onFile} />
            </Button>
          )}
        </Stack>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
      </Stack>
    </Box>
  );
}
