import {
  Button,
  InlineLoading,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { UserAvatar } from "@carbon/icons-react";
import React, { createElement, useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { PageHeader } from "../components/PageHeader.js";
import { apiUrl, authHeaders } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

export function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(apiUrl("/upload/profile-photo"), { method: "POST", body: fd, credentials: "include", headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        setMsg(`Upload failed: ${err.error}`);
        return;
      }
      // Refresh profile to get new photo URL
      await utils.users.myProfile.invalidate();
      setMsg("Photo updated");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack gap={6}>
      <PageHeader
        title="My profile"
        description={`Signed in as ${user?.email ?? ""}`}
      />

      {msg && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      {/* Profile photo */}
      <Tile className="esti-form-panel">
        <Stack gap={4}>
          <h2>Profile photo</h2>
          <Stack orientation="horizontal" gap={5} style={{ alignItems: "center" }}>
            <div className="esti-profile-photo">
              {photoUrl ? (
                <img src={photoUrl} alt={user?.fullName ?? "Photo"} />
              ) : (
                <UserAvatar size={40} />
              )}
            </div>
            <Stack gap={2}>
              <Button
                kind="secondary"
                size="sm"
                disabled={uploading || user?.isDemo}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <InlineLoading description="Uploading…" /> : "Upload photo"}
              </Button>
              <p className="esti-label esti-label--helper">JPG, PNG or WebP, max 2 MB</p>
            </Stack>
          </Stack>
          {createElement("input", {
            ref: fileRef,
            type: "file",
            accept: ".jpg,.jpeg,.png,.webp",
            style: { display: "none" },
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
              e.target.value = "";
            },
          })}
        </Stack>
      </Tile>

      <Tile className="esti-form-panel">
        <Stack gap={3}>
          <h2>Workspace preferences</h2>
          <p>
            Theme (light or dark) and dashboard section toggles are in the
            floating dock at the bottom of the side nav — click the settings
            icon or press Alt+S.
          </p>
        </Stack>
      </Tile>

      <Tile className="esti-form-panel">
        <Stack gap={5}>
          <h2>Display name</h2>
          <TextInput
            id="pf-name"
            labelText="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextInput
            id="pf-designation"
            labelText="Designation / job title"
            placeholder="e.g. Senior Architect"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
          <Button
            disabled={name.length < 2 || updateProfile.isPending}
            onClick={() => updateProfile.mutate({ fullName: name, designation })}
          >
            {updateProfile.isPending ? "Saving…" : "Save profile"}
          </Button>
        </Stack>
      </Tile>

      <Tile className="esti-form-panel">
        <Stack gap={5}>
          <h2>Change password</h2>
          <TextInput
            id="pf-cur"
            labelText="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
          />
          <TextInput
            id="pf-new"
            labelText="New password (min 8 chars)"
            type="password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
          <TextInput
            id="pf-conf"
            labelText="Confirm new password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />
          {pw.next && pw.confirm && pw.next !== pw.confirm && (
            <p>Passwords do not match.</p>
          )}
          <Button
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
          {changePassword.error && (
            <InlineNotification
              kind="error"
              title="Could not change"
              subtitle={changePassword.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Tile>
    </Stack>
  );
}
