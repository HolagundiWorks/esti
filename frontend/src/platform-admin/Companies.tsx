import { useState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { type Me, createCompany, joinCompany, leaveCompany } from "./lib/auth";

const STATUS_TAG: Record<string, "green" | "teal"> = { ACTIVE: "green", INVITED: "teal" };

/** Self-serve activation: create a company, join one, or leave the active one. */
export default function Companies({ me, onChange }: { me: Me; onChange: (m: Me) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [joinHandle, setJoinHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const res = await createCompany(name, domain || undefined);
    setBusy(false);
    if (res.error || !res.account) {
      setNote({ kind: "error", text: res.error ?? "Could not create the company." });
      return;
    }
    setName("");
    setDomain("");
    setNote({ kind: "success", text: "Company created." });
    onChange(res);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const res = await joinCompany(joinHandle);
    setBusy(false);
    if (res.error || !res.account) {
      setNote({
        kind: "error",
        text: res.error === "company_not_found" ? "Company not found." : "Could not join.",
      });
      return;
    }
    setJoinHandle("");
    setNote({
      kind: "success",
      text:
        res.status === "ACTIVE"
          ? "Joined — the company is now active."
          : "Request sent — an admin must approve your access.",
    });
    onChange(res);
  }

  async function handleLeave() {
    const handle = me.activeOrg?.publicId ?? me.activeOrg?.slug;
    if (!handle) return;
    setBusy(true);
    setNote(null);
    const res = await leaveCompany(handle);
    setBusy(false);
    if (res.account) {
      setNote({ kind: "success", text: "You left the company." });
      onChange(res);
    }
  }

  return (
    <Tile>
      <Stack gap={5}>
        <h3 className="esti-label">Your companies</h3>

        {me.memberships.length > 0 ? (
          <Stack gap={2} orientation="horizontal">
            {me.memberships.map((m) => (
              <Tag key={m.org.publicId ?? m.org.slug} type={STATUS_TAG[m.role] ?? "cool-gray"}>
                {m.org.name} · {m.role}
              </Tag>
            ))}
          </Stack>
        ) : (
          <p>You aren't a member of any company yet — create one or join by its handle.</p>
        )}

        <Form onSubmit={handleCreate}>
          <Stack gap={3} orientation="horizontal">
            <TextInput
              id="co-name"
              labelText="Create a company"
              placeholder="Acme Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              id="co-domain"
              labelText="Login domain (optional)"
              placeholder="acme.in"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <Button type="submit" kind="tertiary" disabled={busy || name.trim().length < 2}>
              Create
            </Button>
          </Stack>
        </Form>

        <Form onSubmit={handleJoin}>
          <Stack gap={3} orientation="horizontal">
            <TextInput
              id="co-join"
              labelText="Join a company"
              placeholder="acme.in · AORMS-C-2K4P"
              value={joinHandle}
              onChange={(e) => setJoinHandle(e.target.value)}
            />
            <Button type="submit" kind="tertiary" disabled={busy || !joinHandle.trim()}>
              Join
            </Button>
          </Stack>
        </Form>

        {me.activeOrg && (
          <div>
            <Button kind="danger--ghost" size="sm" disabled={busy} onClick={handleLeave}>
              Leave {me.activeOrg.name}
            </Button>
          </div>
        )}

        {note && (
          <InlineNotification
            kind={note.kind}
            title={note.kind === "success" ? "Done" : "Error"}
            subtitle={note.text}
            lowContrast
            onCloseButtonClick={() => setNote(null)}
          />
        )}
      </Stack>
    </Tile>
  );
}
