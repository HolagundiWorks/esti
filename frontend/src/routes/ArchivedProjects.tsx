import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useRef, useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const HiddenInput = styled("input")({ display: "none" });

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

/**
 * Per-project file archive: package the project's object-store files to a
 * downloadable bundle and remove them to reclaim cloud storage. DB records
 * (invoices/receivables) stay. Restore re-uploads from the bundle.
 */
function FileArchiveModal({
  project,
  onClose,
  onDone,
}: {
  project: { id: string; ref: string; title: string };
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const previewQ = trpc.projectArchive.preview.useQuery({ projectId: project.id });
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const p = previewQ.data;
  const today = new Date().toISOString().slice(0, 10);

  const archive = trpc.projectArchive.archive.useMutation({
    meta: { errorTitle: "Couldn't archive the project files" },
  });
  const restore = trpc.projectArchive.restore.useMutation({
    meta: { errorTitle: "Couldn't restore the project files" },
  });

  async function archiveAndDownload() {
    setBusy(true);
    setError(null);
    try {
      // Package first (so the user keeps a restorable bundle), then reclaim.
      const bundle = await utils.projectArchive.export.fetch({ projectId: project.id });
      downloadJson(bundle, `esti-files-${project.ref}-${today}.json`);
      const res = await archive.mutateAsync({ projectId: project.id });
      onDone(`${project.ref}: archived ${res.removedCount} file(s), reclaimed ${formatBytes(res.reclaimedBytes)}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const bundle = JSON.parse(await file.text());
      const res = await restore.mutateAsync(bundle);
      onDone(`${project.ref}: restored ${res.restoredCount} file(s)`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed — is this the right bundle file?");
    } finally {
      setBusy(false);
    }
  }

  const archived = !!p?.filesArchivedAt;

  return (
    <Dialog aria-labelledby="archived-projects-files-title" open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle id="archived-projects-files-title">{`Files — ${project.ref} · ${project.title}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {previewQ.isLoading && <Typography>Reading files…</Typography>}
          {p && !archived && (
            <>
              <Typography>
                This project holds <strong>{p.fileCount}</strong> file(s). Archiving downloads a bundle
                you can re-import later, then removes{" "}
                <strong>{p.removableCount}</strong> of them from cloud storage to reclaim{" "}
                <strong>{formatBytes(p.reclaimableBytes)}</strong>.
                {p.sharedCount > 0 &&
                  ` ${p.sharedCount} file(s) are shared with other projects and are kept.`}
              </Typography>
              <Typography variant="body2" className="esti-label esti-label--helper">
                Records (invoices, receivables, decisions) stay — only the stored files move to the
                bundle. Keep the downloaded file safe: it is the only way to restore them.
              </Typography>
              <Button variant="contained" disabled={busy || p.fileCount === 0} onClick={archiveAndDownload}>
                {busy ? "Archiving…" : "Download package & archive files"}
              </Button>
            </>
          )}
          {p && archived && (
            <>
              <Typography>
                Files were archived on{" "}
                <strong>
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                    new Date(p.filesArchivedAt as string),
                  )}
                </strong>
                , reclaiming <strong>{formatBytes(p.filesArchivedBytes)}</strong>. Upload the bundle to
                restore them.
              </Typography>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => restoreRef.current?.click()}
              >
                {busy ? "Restoring…" : "Restore from bundle"}
              </Button>
              <HiddenInput
                ref={restoreRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void restoreFromFile(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
          {error && (
            <Alert severity="error">
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function ArchivedProjects() {
  const utils = trpc.useUtils();
  const archived = trpc.projectOffice.listArchived.useQuery();

  const [message, setMessage] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; ref: string; title: string } | null>(null);
  const [purgePassword, setPurgePassword] = useState("");
  const [fileTarget, setFileTarget] = useState<{ id: string; ref: string; title: string } | null>(null);

  const restore = trpc.projectOffice.restore.useMutation({
    meta: { errorTitle: "Couldn't restore the project" },
    onSuccess: (project) => {
      setMessage(`${project.title} restored to active projects`);
      utils.projectOffice.listArchived.invalidate();
      utils.projectOffice.list.invalidate();
    },
  });


  const purge = trpc.projectOffice.purge.useMutation({
    meta: { errorTitle: "Couldn't purge the project" },
    onSuccess: () => {
      setMessage(`${purgeTarget?.title ?? "Project"} marked for purge`);
      setPurgeTarget(null);
      setPurgePassword("");
      utils.projectOffice.listArchived.invalidate();
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Reference", flex: 1, minWidth: 120 },
    { field: "title", headerName: "Project", flex: 1.6, minWidth: 180 },
    { field: "status", headerName: "Status", flex: 1, minWidth: 120 },
    {
      field: "archivedAt",
      headerName: "Archived",
      flex: 1,
      minWidth: 140,
      renderCell: (params) =>
        params.row.archivedAt
          ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
              new Date(params.row.archivedAt),
            )
          : "—",
    },
    {
      field: "purgeAfter",
      headerName: "Purge after",
      flex: 1,
      minWidth: 130,
      renderCell: (params) => {
        const pastRetention = params.row.purgeAfter ? params.row.purgeAfter <= today : true;
        const color = pastRetention ? "red" : "gray";
        return params.row.purgeAfter ? (
          <StatusDot color={color} label={params.row.purgeAfter} />
        ) : (
          "—"
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 90,
      renderCell: (params) => {
        const project = params.row;
        const pastRetention = project.purgeAfter ? project.purgeAfter <= today : true;
        return (
          <RowActionsMenu
            actions={[
              {
                label: "Restore",
                disabled: restore.isPending,
                onClick: () => restore.mutate({ id: project.id }),
              },
              {
                label: "Export",
                onClick: async () => {
                  const data = await utils.projectOffice.exportData.fetch({ id: project.id });
                  downloadJson(data, `esti-export-${project.ref}-${today}.json`);
                },
              },
              {
                label: "Files",
                onClick: () =>
                  setFileTarget({ id: project.id, ref: project.ref, title: project.title }),
              },
              {
                label: "Purge",
                danger: true,
                disabled: !pastRetention,
                onClick: () =>
                  setPurgeTarget({ id: project.id, ref: project.ref, title: project.title }),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <RailLayout
        title="Archived projects"
        description="Retained projects hidden from active work. Restore preserves full history. Export downloads a JSON bundle before permanent purge. Purge is irreversible and requires the retention period to have expired (default 90 days after archive)."
      >
        <PageBreadcrumb items={[{ label: "Admin" }, { label: "Archived projects" }]} />
        {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          <AlertTitle>Done</AlertTitle>
          {message}
        </Alert>
      )}
      {restore.error && (
        <Alert severity="error">
          <AlertTitle>Restore failed</AlertTitle>
          {restore.error.message}
        </Alert>
      )}
      {purge.error && (
        <Alert severity="error">
          <AlertTitle>Purge failed</AlertTitle>
          {purge.error.message}
        </Alert>
      )}

      <DataState
        loading={archived.isLoading}
        isEmpty={(archived.data?.length ?? 0) === 0}
        columnCount={6}
        empty={{
          title: "No archived projects",
          description: "Projects archived from their Settings tab will appear here.",
        }}
      >
        <DataGrid
          rows={archived.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
      </RailLayout>

      {fileTarget && (
        <FileArchiveModal
          project={fileTarget}
          onClose={() => setFileTarget(null)}
          onDone={(msg) => {
            setMessage(msg);
            utils.projectOffice.listArchived.invalidate();
          }}
        />
      )}

      <Dialog
        aria-labelledby="archived-projects-purge-title"
        open={!!purgeTarget}
        onClose={() => {
          setPurgeTarget(null);
          setPurgePassword("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="archived-projects-purge-title">{`Purge ${purgeTarget?.ref ?? ""} — ${purgeTarget?.title ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              This permanently retires the project. It is removed from the archive and can never be
              restored or accessed in the workspace again; its records are retained only as a sealed
              audit trail, not in any project view. This action cannot be undone. Export the project
              data first if you need an offline record.
            </Typography>
            <TextField
              id="purge-password"
              label="Admin password (confirm identity)"
              type="password"
              autoComplete="new-password"
              value={purgePassword}
              onChange={(e) => setPurgePassword(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={() => {
              setPurgeTarget(null);
              setPurgePassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!purgePassword || purge.isPending}
            onClick={() => {
              if (!purgeTarget) return;
              purge.mutate({ id: purgeTarget.id, password: purgePassword });
            }}
          >
            {purge.isPending ? "Purging…" : "Confirm purge"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
