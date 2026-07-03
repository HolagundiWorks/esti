import { useState } from "react";
import {
  ActionableNotification,
  Button,
  Form,
  InlineNotification,
  Modal,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  type Me,
  acceptInvite,
  adoptIdentity,
  createCompany,
  declineInvite,
  generateAormsId,
  inviteToCompany,
  joinCompany,
  leaveCompany,
} from "./lib/auth";

const STATUS_TAG: Record<string, "green" | "teal"> = { ACTIVE: "green", INVITED: "teal" };

const CREATE_ERRORS: Record<string, string> = {
  id_required:
    "Companies are founded against your permanent AORMS ID — generate it first (earned at 100 hours of workspace use, or instantly once a company invites you).",
  domain_mismatch: "The login domain must match your own verified email's domain.",
  domain_unverified: "Verify your email first to claim a login domain.",
};

/** Self-serve activation: create a company, join one, invite people, or leave. */
export default function Companies({ me, onChange }: { me: Me; onChange: (m: Me) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [joinHandle, setJoinHandle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // "Use my existing AORMS ID" — adopt the invite onto another account.
  const [adoptFor, setAdoptFor] = useState<string | null>(null); // company handle
  const [adoptEmail, setAdoptEmail] = useState("");
  const [adoptPassword, setAdoptPassword] = useState("");
  const [adoptCode, setAdoptCode] = useState("");
  const [adoptError, setAdoptError] = useState<string | null>(null);

  const ownedOrg =
    me.activeOrg && me.memberships.some((m) => m.org.publicId === me.activeOrg?.publicId && m.role === "OWNER")
      ? me.activeOrg
      : me.memberships.find((m) => m.role === "OWNER")?.org ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const res = await createCompany(name, domain || undefined);
    setBusy(false);
    if (res.error || !res.account) {
      setNote({ kind: "error", text: CREATE_ERRORS[res.error ?? ""] ?? "Could not create the company." });
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const handle = ownedOrg?.publicId ?? ownedOrg?.slug;
    if (!handle) return;
    setBusy(true);
    setNote(null);
    const res = await inviteToCompany(handle, inviteEmail);
    setBusy(false);
    if (!res.ok) {
      setNote({ kind: "error", text: res.error ?? "Could not send the invitation." });
      return;
    }
    setInviteEmail("");
    setNote({
      kind: "success",
      text: "Invited — they'll see the invitation when they sign in (or sign up) with that email.",
    });
  }

  async function handleAccept(handle: string) {
    setBusy(true);
    setNote(null);
    const res = await acceptInvite(handle);
    setBusy(false);
    if (res.error || !res.account) {
      setNote({ kind: "error", text: "Could not accept the invitation." });
      return;
    }
    setNote({ kind: "success", text: "Invitation accepted — the company is now active." });
    onChange(res);
  }

  async function handleDecline(handle: string) {
    setBusy(true);
    const res = await declineInvite(handle);
    setBusy(false);
    if (res.account) onChange(res);
  }

  async function handleInstantId() {
    setBusy(true);
    setNote(null);
    const res = await generateAormsId();
    setBusy(false);
    if (!res.publicId) {
      setNote({ kind: "error", text: "Could not generate the ID." });
      return;
    }
    setNote({ kind: "success", text: `Your permanent AORMS ID is ${res.publicId}.` });
    onChange({
      ...me,
      instantIdEligible: false,
      account: me.account ? { ...me.account, publicId: res.publicId } : me.account,
    });
  }

  async function handleAdopt(e: React.FormEvent) {
    e.preventDefault();
    if (!adoptFor) return;
    setBusy(true);
    setAdoptError(null);
    const res = await adoptIdentity(adoptFor, adoptEmail, adoptPassword, adoptCode || undefined);
    setBusy(false);
    if (res.error || !res.account) {
      setAdoptError(
        res.error === "no_existing_id"
          ? "That account has no AORMS ID yet — accept the invite normally instead."
          : res.error === "totp_required"
            ? "That account has an authenticator — enter its 6-digit code."
            : "Could not verify that account.",
      );
      return;
    }
    setAdoptFor(null);
    setAdoptEmail("");
    setAdoptPassword("");
    setAdoptCode("");
    setNote({
      kind: "success",
      text: `Invitation moved to ${res.account.email} — you are now signed in as that account.`,
    });
    onChange(res);
  }

  return (
    <Tile>
      <Stack gap={5}>
        <h3 className="esti-label">Your companies</h3>

        {me.pendingInvites.length > 0 &&
          me.pendingInvites.map((inv) => {
            const handle = inv.org.publicId ?? inv.org.slug;
            return (
              <ActionableNotification
                key={handle}
                kind="info"
                lowContrast
                hideCloseButton
                inline
                title={`You've been invited to ${inv.org.name}`}
                subtitle="Accept to join. If you already carry an AORMS ID under a different email, you can move this invitation onto that identity instead."
                actionButtonLabel="Accept"
                onActionButtonClick={() => void handleAccept(handle)}
              />
            );
          })}
        {me.pendingInvites.length > 0 && (
          <Stack gap={2} orientation="horizontal">
            {me.pendingInvites.map((inv) => {
              const handle = inv.org.publicId ?? inv.org.slug;
              return (
                <Stack key={handle} gap={2} orientation="horizontal">
                  <Button kind="tertiary" size="sm" disabled={busy} onClick={() => setAdoptFor(handle)}>
                    Use my existing AORMS ID ({inv.org.name})
                  </Button>
                  <Button kind="danger--ghost" size="sm" disabled={busy} onClick={() => void handleDecline(handle)}>
                    Decline
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        )}

        {me.instantIdEligible && (
          <ActionableNotification
            kind="info"
            lowContrast
            hideCloseButton
            inline
            title="Generate your AORMS ID now"
            subtitle="Being invited into a company waives the 100-hour requirement — you can mint your permanent identity handle immediately."
            actionButtonLabel="Generate my AORMS ID"
            onActionButtonClick={() => void handleInstantId()}
          />
        )}

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
        {!me.account?.publicId && (
          <p className="esti-label esti-label--helper">
            Founding a company requires your AORMS ID — earned at 100 hours of workspace use, or
            instantly once a company invites you.
          </p>
        )}

        {ownedOrg && (
          <Form onSubmit={handleInvite}>
            <Stack gap={3} orientation="horizontal">
              <TextInput
                id="co-invite"
                labelText={`Invite to ${ownedOrg.name}`}
                placeholder="person@example.in"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button type="submit" kind="tertiary" disabled={busy || !inviteEmail.includes("@")}>
                Invite
              </Button>
            </Stack>
          </Form>
        )}

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

        <Modal
          open={adoptFor !== null}
          modalHeading="Use my existing AORMS ID"
          modalLabel="AORMS identity"
          primaryButtonText="Verify & move invitation"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={busy || !adoptEmail.includes("@") || adoptPassword.length < 8}
          onRequestSubmit={(e) => void handleAdopt(e as unknown as React.FormEvent)}
          onRequestClose={() => setAdoptFor(null)}
          size="sm"
        >
          <Stack gap={5}>
            <p>
              Sign in with the account that already holds your AORMS ID. The pending invitation
              moves onto that identity, and you continue as that account — one ID across every
              company you work with.
            </p>
            <TextInput
              id="adopt-email"
              labelText="Existing account email"
              type="email"
              value={adoptEmail}
              onChange={(e) => setAdoptEmail(e.target.value)}
            />
            <TextInput
              id="adopt-password"
              labelText="Password"
              type="password"
              value={adoptPassword}
              onChange={(e) => setAdoptPassword(e.target.value)}
            />
            <TextInput
              id="adopt-code"
              labelText="Authenticator code (if enabled)"
              placeholder="123456"
              inputMode="numeric"
              value={adoptCode}
              onChange={(e) => setAdoptCode(e.target.value)}
            />
            {adoptError && (
              <InlineNotification kind="error" lowContrast hideCloseButton title="Verification failed" subtitle={adoptError} />
            )}
          </Stack>
        </Modal>
      </Stack>
    </Tile>
  );
}
