import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AccountCircle from "@mui/icons-material/AccountCircle";
import SaveIcon from "@mui/icons-material/Save";
import { QRCodeSVG } from "qrcode.react";
import { type ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { StatusDot } from "../StatusTag.js";
import { apiUrl, authHeaders } from "../../lib/api-base.js";
import { trpc } from "../../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

/** Workspace login preferences — photo, name, password, studio 2FA (personal account portal). */
export function WorkspaceSettingsPanel() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const profileQ = trpc.users.myProfile.useQuery(undefined, { enabled: !!user });

  useEffect(() => {
    if (user?.fullName) setName(user.fullName);
  }, [user?.fullName]);

  useEffect(() => {
    if (profileQ.data) {
      if (profileQ.data.designation) setDesignation(profileQ.data.designation);
      if (profileQ.data.photoUrl) setPhotoUrl(profileQ.data.photoUrl);
    }
  }, [profileQ.data]);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.users.myProfile.invalidate();
      setMsg("Profile updated");
    },
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      setPw({ current: "", next: "", confirm: "" });
      setMsg("Password changed");
    },
  });

  const totpEnabled = Boolean(profileQ.data?.totpEnabled);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpDisabling, setTotpDisabling] = useState(false);
  const beginTotp = trpc.users.totpSetup.useMutation({
    onSuccess: (d) => {
      setTotpSetup(d);
      setTotpCode("");
    },
  });
  const enableTotp = trpc.users.totpEnable.useMutation({
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpCode("");
      await utils.users.myProfile.invalidate();
      setMsg("Two-factor authentication enabled");
    },
  });
  const disableTotp = trpc.users.totpDisable.useMutation({
    onSuccess: async () => {
      setTotpDisabling(false);
      setTotpCode("");
      await utils.users.myProfile.invalidate();
      setMsg("Two-factor authentication disabled");
    },
  });

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(apiUrl("/upload/profile-photo"), {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        setMsg(`Upload failed: ${err.error}`);
        return;
      }
      await utils.users.myProfile.invalidate();
      setMsg("Photo updated");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box id="settings" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          Workspace settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Studio sign-in profile, password, and authenticator — managed outside the workspace.
        </Typography>

        {msg && (
          <Alert severity="success" onClose={() => setMsg(null)}>
            {msg}
          </Alert>
        )}

        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" component="h3">
              Profile photo
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <div className="esti-profile-photo">
                {photoUrl ? (
                  <img src={photoUrl} alt={user?.fullName ?? "Photo"} />
                ) : (
                  <AccountCircle sx={{ fontSize: 40 }} />
                )}
              </div>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  disabled={uploading || user?.isDemo}
                >
                  {uploading ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Uploading…
                    </>
                  ) : (
                    "Upload photo"
                  )}
                  <HiddenFileInput
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" className="esti-label esti-label--helper">
                  JPG, PNG or WebP, max 2 MB
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" component="h3">
              Workspace preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Theme (light or dark) and dashboard section toggles are in the floating dock at the
              bottom of the side nav — click the settings icon or press Alt+S while in the
              workspace.
            </Typography>
          </Stack>
        </Box>

        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="subtitle1" component="h3" className="esti-grow">
                Display name
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={name.length < 2 || updateProfile.isPending}
                onClick={() => updateProfile.mutate({ fullName: name, designation })}
              >
                {updateProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </Stack>
            <TextField
              id="pf-name"
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              id="pf-designation"
              label="Designation / job title"
              placeholder="e.g. Senior Architect"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </Stack>
        </Box>

        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="subtitle1" component="h3" className="esti-grow">
                Workspace password
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={
                  !pw.current ||
                  pw.next.length < 8 ||
                  pw.next !== pw.confirm ||
                  changePassword.isPending
                }
                onClick={() =>
                  changePassword.mutate({
                    currentPassword: pw.current,
                    newPassword: pw.next,
                  })
                }
              >
                {changePassword.isPending ? "Saving…" : "Change password"}
              </Button>
            </Stack>
            <TextField
              id="pf-cur"
              label="Current password"
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            />
            <TextField
              id="pf-new"
              label="New password (min 8 chars)"
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            />
            <TextField
              id="pf-conf"
              label="Confirm new password"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            />
            {pw.next && pw.confirm && pw.next !== pw.confirm && (
              <Typography variant="body2">Passwords do not match.</Typography>
            )}
            {changePassword.error && (
              <Alert severity="error">{changePassword.error.message}</Alert>
            )}
          </Stack>
        </Box>

        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" component="h3">
                Workspace two-factor authentication
              </Typography>
              <StatusDot color={totpEnabled ? "green" : "gray"} label={totpEnabled ? "On" : "Off"} />
            </Stack>

            {!totpEnabled && !totpSetup && (
              <>
                <Typography variant="body2" color="text.secondary" className="esti-label esti-label--secondary">
                  Protect your studio login with an authenticator app.
                </Typography>
                <Box>
                  <Button variant="outlined" disabled={beginTotp.isPending} onClick={() => beginTotp.mutate()}>
                    Enable authenticator
                  </Button>
                </Box>
              </>
            )}

            {totpSetup && (
              <>
                <Typography variant="body2">
                  Scan this QR in your authenticator app, then enter the 6-digit code.
                </Typography>
                <QRCodeSVG value={totpSetup.otpauthUrl} size={180} marginSize={4} />
                <TextField
                  id="totp-secret"
                  label="Secret key"
                  value={totpSetup.secret}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  id="totp-confirm"
                  label="6-digit code"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    disabled={totpCode.length < 6 || enableTotp.isPending}
                    onClick={() => enableTotp.mutate({ secret: totpSetup.secret, code: totpCode })}
                  >
                    {enableTotp.isPending ? "Saving…" : "Confirm"}
                  </Button>
                  <Button variant="text" onClick={() => setTotpSetup(null)}>
                    Cancel
                  </Button>
                </Stack>
                {enableTotp.error && <Alert severity="error">{enableTotp.error.message}</Alert>}
              </>
            )}

            {totpEnabled && !totpDisabling && (
              <Box>
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  onClick={() => {
                    setTotpDisabling(true);
                    setTotpCode("");
                  }}
                >
                  Disable
                </Button>
              </Box>
            )}

            {totpEnabled && totpDisabling && (
              <>
                <TextField
                  id="totp-off"
                  label="Current code to disable"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="error"
                    disabled={totpCode.length < 6 || disableTotp.isPending}
                    onClick={() => disableTotp.mutate({ code: totpCode })}
                  >
                    Confirm disable
                  </Button>
                  <Button variant="text" onClick={() => setTotpDisabling(false)}>
                    Cancel
                  </Button>
                </Stack>
                {disableTotp.error && <Alert severity="error">{disableTotp.error.message}</Alert>}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
