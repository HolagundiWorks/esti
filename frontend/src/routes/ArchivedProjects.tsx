import {
  Button,
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

export function ArchivedProjects() {
  const utils = trpc.useUtils();
  const archived = trpc.projectOffice.listArchived.useQuery();
  const [message, setMessage] = useState<string | null>(null);
  const restore = trpc.projectOffice.restore.useMutation({
    onSuccess: (project) => {
      setMessage(`${project.title} restored to active projects`);
      utils.projectOffice.listArchived.invalidate();
      utils.projectOffice.list.invalidate();
    },
  });

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Archived projects</h1>
        <p>Retained projects hidden from active work. Restoring preserves their full history.</p>
      </Stack>

      {message && (
        <InlineNotification
          kind="success"
          title="Project restored"
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

      <DataState
        loading={archived.isLoading}
        isEmpty={(archived.data?.length ?? 0) === 0}
        columnCount={5}
        empty={{
          title: "No archived projects",
          description: "Projects archived from their Settings tab will appear here.",
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
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(archived.data ?? []).map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.ref}</TableCell>
                  <TableCell>{project.title}</TableCell>
                  <TableCell>{project.status}</TableCell>
                  <TableCell>
                    {project.archivedAt
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
                          new Date(project.archivedAt),
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      disabled={restore.isPending}
                      onClick={() => restore.mutate({ id: project.id })}
                    >
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
