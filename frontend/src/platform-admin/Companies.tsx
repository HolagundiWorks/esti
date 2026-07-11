import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StatusDot } from "../components/StatusTag.js";
import {
  type CompanyIdStatus,
  type Me,
  type OrgMemberRow,
  acceptInvite,
  adoptIdentity,
  createCompany,
  declineInvite,
  fetchCompanyIdStatus,
  fetchMe,
  fetchOrgMembers,
  generateCompanyId,
  inviteToCompany,
  joinCompany,
  leaveCompany,
  reviewMember,
} from "./lib/auth";

const STATUS_TAG: Record<string, "green" | "teal"> = { ACTIVE: "green", INVITED: "teal" };

const CREATE_ERRORS: Record<string, string> = {
  domain_mismatch: "The login domain must match your own verified email's domain.",
  domain_unverified: "Verify your email first to claim a login domain.",
};


/** Self-serve activation: create a company, join one, invite people, or leave. */
export default function Companies({
  me,
  onChange,
  showPendingRequests = false,
}: {
  me: Me;
  onChange: (m: Me) => void;
  /** Company-account portal: owners review join requests here. */
  showPendingRequests?: boolean;
}) {
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
  const ownedHandle = ownedOrg ? ownedOrg.publicId ?? ownedOrg.slug : null;

  const [pendingMembers, setPendingMembers] = useState<OrgMemberRow[]>([]);

  // Earned company identity: AORMS-C unlocks at 100 hours of company usage.
  const [companyId, setCompanyId] = useState<CompanyIdStatus | null>(null);
  useEffect(() => {
    let alive = true;
    if (ownedHandle) {
      void fetchCompanyIdStatus(ownedHandle).then((st) => {
        if (alive) setCompanyId(st);
      });
    } else {
      setCompanyId(null);
    }
    return () => {
      alive = false;
    };
  }, [ownedHandle]);

  useEffect(() => {
    let alive = true;
    if (showPendingRequests && ownedHandle) {
      void fetchOrgMembers(ownedHandle).then((res) => {
        if (alive) setPendingMembers(res.members.filter((m) => m.status === "INVITED"));
      });
    } else {
      setPendingMembers([]);
    }
    return () => {
      alive = false;
    };
  }, [showPendingRequests, ownedHandle, me.memberships.length]);

  async function handleReview(accountId: string, action: "approve" | "reject") {
    if (!ownedHandle) return;
    setBusy(true);
    const res = await reviewMember(ownedHandle, accountId, action);
    setBusy(false);
    if (res.error) {
      setNote({ kind: "error", text: "Could not update the request." });
      return;
    }
    setPendingMembers(res.members.filter((m) => m.status === "INVITED"));
    setNote({
      kind: "success",
      text: action === "approve" ? "Access approved." : "Request declined.",
    });
    onChange(await fetchMe());
  }

  async function handleCompanyId() {
    if (!ownedHandle) return;
    setBusy(true);
    setNote(null);
    const res = await generateCompanyId(ownedHandle);
    setBusy(false);
    if (!res.publicId) {
      setNote({
        kind: "error",
        text:
          res.error === "not_eligible"
            ? "The company ID unlocks at 100 hours of company use."
            : "Could not generate the company ID.",
      });
      return;
    }
    setNote({ kind: "success", text: `Your company's permanent AORMS ID is ${res.publicId}.` });
    setCompanyId((st) => (st ? { ...st, publicId: res.publicId } : st));
    onChange(await fetchMe());
  }

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
    setNote({ kind: "success", text: "Company created. Open your workspace to activate it." });
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
          : "Join request sent — the company owner will approve it in Company account.",
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
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" component="h3" className="esti-label">
          Your companies
        </Typography>

        {me.pendingInvites.length > 0 &&
          me.pendingInvites.map((inv) => {
            const handle = inv.org.publicId ?? inv.org.slug;
            return (
              <Alert
                key={handle}
                severity="info"
                action={
                  <Button color="inherit" size="small" onClick={() => void handleAccept(handle)}>
                    Accept
                  </Button>
                }
              >
                <AlertTitle>{`You've been invited to ${inv.org.name}`}</AlertTitle>
                Accept to join. If you already carry an AORMS ID under a different email, you can
                move this invitation onto that identity instead.
              </Alert>
            );
          })}
        {me.pendingInvites.length > 0 && (
          <Stack direction="row" spacing={1}>
            {me.pendingInvites.map((inv) => {
              const handle = inv.org.publicId ?? inv.org.slug;
              return (
                <Stack key={handle} direction="row" spacing={1}>
                  <Button variant="outlined" size="small" disabled={busy} onClick={() => setAdoptFor(handle)}>
                    Use my existing AORMS ID ({inv.org.name})
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    disabled={busy}
                    onClick={() => void handleDecline(handle)}
                  >
                    Decline
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        )}

        {showPendingRequests && pendingMembers.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" component="h4">
              Pending join requests
            </Typography>
            {pendingMembers.map((m) => (
              <Stack key={m.accountId} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" className="esti-grow">
                  {m.name ?? m.email}
                  {m.name ? ` · ${m.email}` : ""}
                </Typography>
                <Button size="small" variant="contained" disabled={busy} onClick={() => void handleReview(m.accountId, "approve")}>
                  Approve
                </Button>
                <Button size="small" color="error" disabled={busy} onClick={() => void handleReview(m.accountId, "reject")}>
                  Decline
                </Button>
              </Stack>
            ))}
          </Stack>
        )}

        {me.memberships.length > 0 ? (
          <Stack direction="row" spacing={1}>
            {me.memberships.map((m) => (
              <StatusDot
                key={m.org.publicId ?? m.org.slug}
                color={STATUS_TAG[m.role] ?? "cool-gray"}
                label={`${m.org.name} · ${m.role}`}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2">
            You aren&apos;t a member of any company yet — create one or join by its handle.
          </Typography>
        )}

        <Box component="form" onSubmit={handleCreate}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <TextField
              id="co-name"
              label="Create a company"
              placeholder="Acme Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              id="co-domain"
              label="Login domain (optional)"
              placeholder="acme.in"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <Button type="submit" variant="outlined" disabled={busy || name.trim().length < 2}>
              Create
            </Button>
          </Stack>
        </Box>
        {ownedOrg && (
          <Box component="form" onSubmit={handleInvite}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <TextField
                id="co-invite"
                label={`Invite to ${ownedOrg.name}`}
                placeholder="person@example.in"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button type="submit" variant="outlined" disabled={busy || !inviteEmail.includes("@")}>
                Invite
              </Button>
            </Stack>
          </Box>
        )}

        {ownedOrg && companyId && (
          <Stack spacing={1}>
            {companyId.publicId ? (
              <Typography variant="body2" className="esti-label esti-label--secondary">
                Company AORMS ID: {companyId.publicId}
              </Typography>
            ) : (
              <>
                <Stack spacing={0.5}>
                  <Typography variant="body2" className="esti-label">
                    {`${ownedOrg.name} — company use`}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      100,
                      (Math.min(companyId.minutes, companyId.requiredMinutes) /
                        companyId.requiredMinutes) *
                        100,
                    )}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {`${Math.floor(companyId.minutes / 60)} of ${Math.floor(companyId.requiredMinutes / 60)} hours — the permanent AORMS-C ID unlocks at 100 hours`}
                  </Typography>
                </Stack>
                <Box>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy || !companyId.eligible}
                    onClick={() => void handleCompanyId()}
                  >
                    {companyId.eligible
                      ? "Generate the company AORMS ID"
                      : "Unlocks at 100 hours of company use"}
                  </Button>
                </Box>
              </>
            )}
          </Stack>
        )}

        <Box component="form" onSubmit={handleJoin} id="join">
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <TextField
              id="co-join"
              label="Request to join a company"
              placeholder="company@firm.in · acme.in · AORMS-C-2K4P"
              helperText="Enter the company's contact email, domain, or AORMS-C ID."
              value={joinHandle}
              onChange={(e) => setJoinHandle(e.target.value)}
            />
            <Button type="submit" variant="outlined" disabled={busy || !joinHandle.trim()}>
              Request access
            </Button>
          </Stack>
        </Box>

        {me.activeOrg && (
          <Box>
            <Button variant="text" color="error" size="small" disabled={busy} onClick={handleLeave}>
              Leave {me.activeOrg.name}
            </Button>
          </Box>
        )}

        {note && (
          <Alert severity={note.kind} onClose={() => setNote(null)}>
            <AlertTitle>{note.kind === "success" ? "Done" : "Error"}</AlertTitle>
            {note.text}
          </Alert>
        )}

        <Dialog aria-labelledby="companies-adopt-id-title" open={adoptFor !== null} onClose={() => setAdoptFor(null)} fullWidth maxWidth="xs">
          <DialogTitle id="companies-adopt-id-title">Use my existing AORMS ID</DialogTitle>
          <Box component="form" onSubmit={(e) => void handleAdopt(e)}>
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body2">
                  Sign in with the account that already holds your AORMS ID. The pending invitation
                  moves onto that identity, and you continue as that account — one ID across every
                  company you work with.
                </Typography>
                <TextField
                  id="adopt-email"
                  label="Existing account email"
                  type="email"
                  value={adoptEmail}
                  onChange={(e) => setAdoptEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  id="adopt-password"
                  label="Password"
                  type="password"
                  value={adoptPassword}
                  onChange={(e) => setAdoptPassword(e.target.value)}
                  fullWidth
                />
                <TextField
                  id="adopt-code"
                  label="Authenticator code (if enabled)"
                  placeholder="123456"
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  value={adoptCode}
                  onChange={(e) => setAdoptCode(e.target.value)}
                  fullWidth
                />
                {adoptError && (
                  <Alert severity="error">
                    <AlertTitle>Verification failed</AlertTitle>
                    {adoptError}
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button type="button" variant="text" onClick={() => setAdoptFor(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !adoptEmail.includes("@") || adoptPassword.length < 8}
              >
                Verify &amp; move invitation
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Stack>
    </Paper>
  );
}
