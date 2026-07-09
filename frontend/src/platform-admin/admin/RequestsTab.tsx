import { useEffect, useState } from "react";
import { Alert, Button, Chip, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { licensingPlanLabel } from "@esti/contracts";
import { trpc } from "../lib/trpc";

type Requests = Awaited<ReturnType<typeof trpc.admin.requests.list.query>>;

const STATUS_TAG: Record<string, string> = {
  PENDING: "teal",
  FULFILLED: "green",
  REJECTED: "red",
};
const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});
const fmt = (d: Date | string) => new Date(d).toLocaleString();

export default function RequestsTab() {
  const [rows, setRows] = useState<Requests>([]);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setRows(await trpc.admin.requests.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  async function fulfil(id: string) {
    setBusy(id);
    setNote(null);
    try {
      const res = await trpc.admin.requests.fulfil.mutate({ requestId: id });
      setNote({
        kind: "success",
        text: res.emailed
          ? `Licence issued and emailed. Key: ${res.key}`
          : `Licence issued (key: ${res.key}) — email NOT sent (${res.emailReason ?? "SMTP not configured"}). Send the key manually.`,
      });
      await load();
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    setNote(null);
    try {
      await trpc.admin.requests.reject.mutate({ requestId: id });
      await load();
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const columns: GridColDef<Requests[number]>[] = [
    {
      field: "createdAt",
      headerName: "Requested",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) => fmt(p.row.createdAt),
    },
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 200 },
    {
      field: "planCode",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
      valueGetter: () => licensingPlanLabel(),
      renderCell: () => licensingPlanLabel(),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => (
        <Chip size="small" label={p.row.status} sx={chipSx(STATUS_TAG[p.row.status] ?? "gray")} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 220,
      renderCell: (p) =>
        p.row.status === "PENDING" ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              disabled={busy === p.row.id}
              onClick={() => fulfil(p.row.id)}
            >
              Approve &amp; email
            </Button>
            <Button
              variant="text"
              size="small"
              disabled={busy === p.row.id}
              onClick={() => reject(p.row.id)}
            >
              Reject
            </Button>
          </Stack>
        ) : null,
    },
  ];

  return (
    <Stack spacing={2}>
      {note && (
        <Alert severity={note.kind} onClose={() => setNote(null)}>
          {note.text}
        </Alert>
      )}

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />
    </Stack>
  );
}
