import {
  Button,
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

export function ArchivedProjects() {
  const utils = trpc.useUtils();
  const archived = trpc.projectOffice.listArchived.useQuery();

  const [message, setMessage] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; ref: string; title: string } | null>(null);
  const [purgePassword, setPurgePassword] = useState("");

  const restore = trpc.projectOffice.restore.useMutation({
    onSuccess: (project) => {
      setMessage(`${project.title} restored to active projects`);
      utils.projectOffice.listArchived.invalidate();
      utils.projectOffice.list.invalidate();
    },
  });

  const exportQ = trpc.projectOffice.exportData.useQuery(
    { id: purgeTarget?.id ?? "" },
    { enabled: false },
  );

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
            This marks the project for permanent deletion. All records —
            tasks, drawings, invoices, and documents — will be scheduled for
            removal. This action cannot be undone. Export the project data
            first if you need an offline record.
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
