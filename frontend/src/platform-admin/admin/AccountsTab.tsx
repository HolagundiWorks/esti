import { useEffect, useState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Modal,
  Search,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Accounts = Awaited<ReturnType<typeof trpc.admin.accounts.list.query>>;

const fmt = (d: Date | string) => new Date(d).toLocaleDateString();

/** A random, readable-enough password to seed the reset field (admin can edit it). */
function suggestPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

/** Manual account support: look up a customer account and reset its password by hand. */
export default function AccountsTab() {
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [search, setSearch] = useState("");
  const [reset, setReset] = useState<{ email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load(q?: string) {
    setAccounts(await trpc.admin.accounts.list.query({ search: q || undefined }));
  }
  useEffect(() => {
    void load();
  }, []);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    await load(search);
  }

  function openReset(email: string) {
    setReset({ email });
    setNewPassword(suggestPassword());
    setNote(null);
  }

  async function doReset() {
    if (!reset) return;
    setBusy(true);
    try {
      await trpc.admin.accounts.resetPassword.mutate({ email: reset.email, newPassword });
      setNote({
        kind: "success",
        text: `Password reset for ${reset.email}. Send them this password manually: ${newPassword}`,
      });
      setReset(null);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
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

      <Form onSubmit={doSearch}>
        <Search
          id="account-search"
          labelText="Search by email or AORMS-U ID"
          placeholder="person@firm.in or AORMS-U-2K4P9F"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Form>

      <Table size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>Email</TableHeader>
            <TableHeader>AORMS ID</TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Role</TableHeader>
            <TableHeader>Created</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.publicId ?? "—"}</TableCell>
              <TableCell>{a.name ?? "—"}</TableCell>
              <TableCell>
                {a.isPlatformAdmin && <Tag type="green">Platform admin</Tag>}
              </TableCell>
              <TableCell>{fmt(a.createdAt)}</TableCell>
              <TableCell>
                <Button kind="ghost" size="sm" onClick={() => openReset(a.email)}>
                  Reset password
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell>No accounts found.</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal
        open={reset !== null}
        modalHeading={`Reset password — ${reset?.email ?? ""}`}
        primaryButtonText={busy ? "Saving…" : "Reset"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={newPassword.length < 8 || busy}
        onRequestClose={() => setReset(null)}
        onRequestSubmit={doReset}
      >
        <Stack gap={5}>
          <p>
            Sets a new password for this account immediately. Copy it and send it to the
            person yourself (phone, email, chat) — this does not email them automatically.
          </p>
          <TextInput
            id="reset-pw"
            labelText="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Pre-filled with a random password — edit if you prefer your own."
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
