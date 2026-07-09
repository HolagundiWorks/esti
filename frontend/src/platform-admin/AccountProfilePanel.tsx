import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { portalPaperSx } from "../components/portal/PortalChrome.js";
import { AccountSignupProfile, greetingGivenName, resolveNamePrefix } from "@esti/contracts";
import { useState } from "react";
import type { Account } from "./lib/auth.js";
import { updateAccountProfile } from "./lib/auth.js";
import { AccountSignupFields, EMPTY_PROFILE, type ProfileDraft } from "./AccountSignupFields.js";

function draftFromAccount(account: Account): ProfileDraft {
  if (account.profile) return { ...EMPTY_PROFILE, ...account.profile };
  return {
    ...EMPTY_PROFILE,
    fullName: account.name ?? "",
    firmName: account.name ?? "",
  };
}

export function AccountProfilePanel({
  account,
  onSaved,
}: {
  account: Account;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(!account.profile);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromAccount(account));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const p = account.profile;

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const parsed = AccountSignupProfile.safeParse({
      ...draft,
      namePrefix: draft.namePrefix?.trim() || undefined,
      coaRegistrationNo: draft.coaRegistrationNo?.trim() || undefined,
      gstin: draft.gstin?.trim() || undefined,
      website: draft.website?.trim() || undefined,
    });
    if (!parsed.success) {
      setBusy(false);
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    const res = await updateAccountProfile(parsed.data);
    setBusy(false);
    if (res.error || !res.account) {
      setError("Could not save profile. Please try again.");
      return;
    }
    setSaved(true);
    setEditing(false);
    onSaved?.();
  }

  if (!editing && p) {
    return (
      <Paper sx={portalPaperSx}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6" component="h4" className="esti-grow">
              Account profile
            </Typography>
            <Button variant="text" size="small" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </Stack>
          <Typography variant="body2">
            {greetingGivenName(p.fullName, p)}
            {" · "}
            {p.mobile}
          </Typography>
          {resolveNamePrefix(p) && !p.namePrefix && p.coaRegistrationNo && (
            <Typography variant="caption" color="text.secondary">
              Greeting uses Ar. from your COA registration — set a name prefix above to override.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {p.firmName} · {p.city}, {p.state}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {p.accountKind === "FIRM" ? "Firm" : "Freelancer"} · {p.discipline.replace(/_/g, " ")}
          </Typography>
          {(p.coaRegistrationNo || p.gstin || p.website) && (
            <Typography variant="body2" color="text.secondary">
              {[p.coaRegistrationNo && `COA ${p.coaRegistrationNo}`, p.gstin, p.website]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
          {saved && <Alert severity="success">Profile saved.</Alert>}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={portalPaperSx}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h4">
          {p ? "Edit account profile" : "Complete your account profile"}
        </Typography>
        {!p && (
          <Typography variant="body2" color="text.secondary">
            Add your practice details so we can provision your workspace and licence correctly.
          </Typography>
        )}
        <AccountSignupFields value={draft} onChange={setDraft} />
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button variant="contained" disabled={busy} onClick={handleSave}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
          {p && (
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => {
                setDraft(draftFromAccount(account));
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
