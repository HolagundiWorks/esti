import { Button, FileUploaderButton, InlineNotification, Stack, Tile } from "@carbon/react";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { useEdition } from "../../lib/edition.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Cloud migration (owner). Export this studio as a JSON bundle, then import it
 * into a freshly provisioned EMPTY cloud tenant. The import is guarded server-
 * side (schema handshake + empty-target + verify-or-rollback), so a bad target
 * fails safely. v1 moves DB rows; object-store files follow the ops runbook.
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
    <Tile>
      <Stack gap={5}>
        <h3 className="esti-label">{community ? "Move to AORMS Pro" : "Cloud migration"}</h3>
        <p className="esti-label esti-label--secondary">
          {community
            ? "Package this whole company as a bundle, then import it into a fresh AORMS Pro workspace. Migration is one-way, Community → Pro."
            : "Import a company bundle exported from a Community/Lite install into this fresh, empty workspace. Import refuses a non-empty target and rolls back if verification fails."}
        </p>
        {pf && (
          <p className="esti-label--helper">
            {pf.counts.projects} projects · {pf.counts.clients} clients · {pf.counts.invoices} invoices ·{" "}
            {(pf.fileBytes / 1048576).toFixed(1)} MB files · schema {pf.schemaHead}
          </p>
        )}
        <Stack orientation="horizontal" gap={3}>
          {community ? (
            <Button onClick={download} disabled={busy}>
              {busy ? "Preparing…" : "Package company for Pro"}
            </Button>
          ) : (
            <FileUploaderButton
              labelText={importMut.isPending ? "Importing…" : "Import a company bundle"}
              buttonKind="primary"
              accept={[".json", "application/json"]}
              disableLabelChanges
              onChange={onFile}
              disabled={importMut.isPending}
            />
          )}
        </Stack>
        {msg && (
          <InlineNotification kind="success" lowContrast title="Migration" subtitle={msg} onCloseButtonClick={() => setMsg(null)} />
        )}
        {err && (
          <InlineNotification kind="error" lowContrast title="Migration failed" subtitle={err} onCloseButtonClick={() => setErr(null)} />
        )}
      </Stack>
    </Tile>
  );
}
