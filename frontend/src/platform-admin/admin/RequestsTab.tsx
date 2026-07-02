import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Requests = Awaited<ReturnType<typeof trpc.admin.requests.list.query>>;

const STATUS_TAG: Record<string, "teal" | "green" | "red" | "gray"> = {
  PENDING: "teal",
  FULFILLED: "green",
  REJECTED: "red",
};
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

  return (
    <Stack gap={5}>
      {note && (
        <InlineNotification
          kind={note.kind}
          lowContrast
          title={note.kind === "success" ? "Done" : "Error"}
          subtitle={note.text}
          onCloseButtonClick={() => setNote(null)}
        />
      )}
      <Table size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>Requested</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Plan</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{fmt(r.createdAt)}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.planCode}</TableCell>
              <TableCell>
                <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
                  {r.status}
                </Tag>
              </TableCell>
              <TableCell>
                {r.status === "PENDING" && (
                  <Stack orientation="horizontal" gap={2}>
                    <Button kind="primary" size="sm" disabled={busy === r.id} onClick={() => fulfil(r.id)}>
                      Approve &amp; email
                    </Button>
                    <Button kind="ghost" size="sm" disabled={busy === r.id} onClick={() => reject(r.id)}>
                      Reject
                    </Button>
                  </Stack>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell>No requests yet.</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
