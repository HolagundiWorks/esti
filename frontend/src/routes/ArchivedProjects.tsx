import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

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
  const p = previewQ.data;
  const today = new Date().toISOString().slice(0, 10);

  const archive = trpc.projectArchive.archive.useMutation();
  const restore = trpc.projectArchive.restore.useMutation();

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
    <Modal
      open
      modalHeading={`Files — ${project.ref} · ${project.title}`}
      passiveModal
      onRequestClose={onClose}
    >
      <Stack gap={5}>
        {previewQ.isLoading && <p>Reading files…</p>}
        {p && !archived && (
          <>
            <p>
              This project holds <strong>{p.fileCount}</strong> file(s). Archiving downloads a bundle
              you can re-import later, then removes{" "}
              <strong>{p.removableCount}</strong> of them from cloud storage to reclaim{" "}
              <strong>{formatBytes(p.reclaimableBytes)}</strong>.
              {p.sharedCount > 0 &&
                ` ${p.sharedCount} file(s) are shared with other projects and are kept.`}
            </p>
            <p className="esti-label--helper">
              Records (invoices, receivables, decisions) stay — only the stored files move to the
              bundle. Keep the downloaded file safe: it is the only way to restore them.
            </p>
            <Button kind="primary" disabled={busy || p.fileCount === 0} onClick={archiveAndDownload}>
              {busy ? "Archiving…" : "Download package & archive files"}
            </Button>
          </>
        )}
        {p && archived && (
          <>
            <p>
              Files were archived on{" "}
              <strong>
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                  new Date(p.filesArchivedAt as string),
                )}
              </strong>
              , reclaiming <strong>{formatBytes(p.filesArchivedBytes)}</strong>. Upload the bundle to
              restore them.
            </p>
            <FileUploaderButton
              labelText={busy ? "Restoring…" : "Restore from bundle"}
              accept={[".json"]}
              disableLabelChanges
              disabled={busy}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0];
                if (f) void restoreFromFile(f);
              }}
            />
          </>
        )}
        {error && <InlineNotification kind="error" title="Error" subtitle={error} lowContrast hideCloseButton />}
      </Stack>
    </Modal>
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
    onSuccess: (project) => {
      setMessage(`${project.title} restored to active projects`);
      utils.projectOffice.listArchived.invalidate();
      utils.projectOffice.list.invalidate();
    },
  });


  const purge = trpc.projectOffice.purge.useMutation({
    onSuccess: () => {
      setMessage(`${purgeTarget?.title ?? "Project"} marked for purge`);
      setPurgeTarget(null);
      setPurgePassword("");
      utils.projectOffice.listArchived.invalidate();
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack gap={7}>
      <PageHeader
        title="Archived projects"
        description="Retained projects hidden from active work. Restore preserves full history. Export downloads a JSON bundle before permanent purge. Purge is irreversible and requires the retention period to have expired (default 90 days after archive)."
      />

      {message && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle={message}
          lowContrast
          onCloseButtonClick={() => setMessage(null)}
        />
      )}
      {restore.error && (
        <InlineNotification
          kind="error"
          title="Restore failed"
          subtitle={restore.error.message}
          hideCloseButton
          lowContrast
        />
      )}
      {purge.error && (
        <InlineNotification
          kind="error"
          title="Purge failed"
          subtitle={purge.error.message}
          hideCloseButton
          lowContrast
        />
      )}

      <DataState
        loading={archived.isLoading}
        isEmpty={(archived.data?.length ?? 0) === 0}
        columnCount={6}
        empty={{
          title: "No archived projects",
          description:
            "Projects archived from their Settings tab will appear here.",
        }}
      >
        <TableContainer title="Retained project archive">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Archived</TableHeader>
                <TableHeader>Purge after</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(archived.data ?? []).map((project) => {
                const pastRetention = project.purgeAfter
                  ? project.purgeAfter <= today
                  : true;
                return (
                  <TableRow key={project.id}>
                    <TableCell>{project.ref}</TableCell>
                    <TableCell>{project.title}</TableCell>
                    <TableCell>{project.status}</TableCell>
                    <TableCell>
                      {project.archivedAt
                        ? new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                          }).format(new Date(project.archivedAt))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {project.purgeAfter ? (
                        <Tag
                          type={pastRetention ? "red" : "gray"}
                          size="sm"
                        >
                          {project.purgeAfter}
                        </Tag>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack orientation="horizontal" gap={2}>
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={restore.isPending}
                          onClick={() => restore.mutate({ id: project.id })}
                        >
                          Restore
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={async () => {
                            const data = await utils.projectOffice.exportData.fetch(
                              { id: project.id },
                            );
                            downloadJson(
                              data,
                              `esti-export-${project.ref}-${today}.json`,
                            );
                          }}
                        >
                          Export
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            setFileTarget({ id: project.id, ref: project.ref, title: project.title })
                          }
                        >
                          Files
                        </Button>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          disabled={!pastRetention}
                          onClick={() =>
                            setPurgeTarget({
                              id: project.id,
                              ref: project.ref,
                              title: project.title,
                            })
                          }
                        >
                          Purge
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

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

      <Modal
        open={!!purgeTarget}
        danger
        modalHeading={`Purge ${purgeTarget?.ref ?? ""} — ${purgeTarget?.title ?? ""}`}
        primaryButtonText={purge.isPending ? "Purging…" : "Confirm purge"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!purgePassword || purge.isPending}
        onRequestClose={() => {
          setPurgeTarget(null);
          setPurgePassword("");
        }}
        onRequestSubmit={() => {
          if (!purgeTarget) return;
          purge.mutate({ id: purgeTarget.id, password: purgePassword });
        }}
      >
        <Stack gap={5}>
          <p>
            This permanently retires the project. It is removed from the
            archive and can never be restored or accessed in the workspace
            again; its records are retained only as a sealed audit trail, not in
            any project view. This action cannot be undone. Export the project
            data first if you need an offline record.
          </p>
          <TextInput
            id="purge-password"
            labelText="Admin password (confirm identity)"
            type="password"
            value={purgePassword}
            onChange={(e) => setPurgePassword(e.target.value)}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
