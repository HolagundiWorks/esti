import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import UploadIcon from "@mui/icons-material/Upload";
import {
  HR_DOCUMENT_TYPES,
  STAFF_LEVEL_DESCRIPTION,
  STAFF_LEVEL_LABEL,
  STAFF_LEVELS,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { type CSSProperties, useState } from "react";
import { StaffAvatar, resolveColor } from "../StaffAvatar.js";
import { StatusDot } from "../StatusTag.js";
import { apiUrl, authHeaders } from "../../lib/api-base.js";
import { trpc } from "../../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

type DocType = keyof typeof HR_DOCUMENT_TYPES;

export function StaffProfilesTab() {
  const teamQ = trpc.team.list.useQuery();
  const utils = trpc.useUtils();
  const updateLevel = trpc.hrProfile.updateLevel.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentType: "AADHAAR" as DocType,
    documentName: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const profileQ = trpc.hrProfile.getProfile.useQuery(
    { memberId: selectedId! },
    { enabled: !!selectedId },
  );
  const verifyDoc = trpc.hrProfile.verifyDocument.useMutation({
    onSuccess: () => utils.hrProfile.getProfile.invalidate({ memberId: selectedId! }),
  });
  const deleteDoc = trpc.hrProfile.deleteDocument.useMutation({
    onSuccess: () => utils.hrProfile.getProfile.invalidate({ memberId: selectedId! }),
  });

  const members = teamQ.data ?? [];
  const selected = members.find((m) => m.id === selectedId);

  async function handleUpload() {
    if (!selectedFile || !selectedId) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("memberId", selectedId);
      fd.append("documentType", uploadForm.documentType);
      fd.append("documentName", uploadForm.documentName || HR_DOCUMENT_TYPES[uploadForm.documentType]);
      if (uploadForm.issueDate) fd.append("issueDate", uploadForm.issueDate);
      if (uploadForm.expiryDate) fd.append("expiryDate", uploadForm.expiryDate);
      if (uploadForm.notes) fd.append("notes", uploadForm.notes);
      const res = await fetch(apiUrl("/upload/hr-document"), { method: "POST", body: fd, credentials: "include", headers: authHeaders() });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Upload failed" }));
        setUploadMsg(`Upload failed: ${(e as { error: string }).error}`);
        return;
      }
      await utils.hrProfile.getProfile.invalidate({ memberId: selectedId });
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadForm({ documentType: "AADHAAR", documentName: "", issueDate: "", expiryDate: "", notes: "" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Grid container spacing={2}>
      {/* Left: member list */}
      <Grid size={{ xs: 12, md: 4, lg: 3 }}>
        <Stack spacing={1}>
          <p className="esti-label esti-label--secondary">Select a staff member</p>
          {members.map((m) => {
            const color = resolveColor({ staffLevel: m.staffLevel ?? null, name: m.name });
            const isSelected = m.id === selectedId;
            return (
              <Paper
                key={m.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={`esti-profile-member-tile${isSelected ? " esti-profile-member-tile--active" : ""}`}
                onClick={() => setSelectedId(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(m.id);
                  }
                }}
                sx={{ p: 2, cursor: "pointer" }}
                style={{ "--esti-staff-color": color } as CSSProperties}
              >
                <div className="esti-avatar-name-cell">
                  <StaffAvatar name={m.name} staffLevel={m.staffLevel} authRole={m.role} size="md" />
                  <span>
                    <p><strong>{m.name}</strong></p>
                    <p className="esti-label esti-label--secondary">
                      {m.jobTitle || (TEAM_ROLES[m.role as TeamRoleCode] ?? m.role)}
                    </p>
                  </span>
                  {m.staffLevel && (
                    <span className="esti-staff-tile__level-badge" style={{ marginInlineStart: "auto" }}>
                      {m.staffLevel}
                    </span>
                  )}
                </div>
              </Paper>
            );
          })}
        </Stack>
      </Grid>

      {/* Right: profile detail */}
      <Grid size={{ xs: 12, md: 8, lg: 9 }}>
        {!selected ? (
          <Box sx={{ p: 2 }}>
            <p className="esti-label esti-label--secondary">Select a staff member to view their profile and documents.</p>
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Level assignment */}
            <Box sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3">{selected.name}</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TextField
                      id="hr-level"
                      select
                      label="Staff level"
                      value={selected.staffLevel ?? ""}
                      onChange={(e) =>
                        updateLevel.mutate({
                          memberId: selected.id,
                          staffLevel: (e.target.value as "L1" | "L2" | "L3" | "L4") || null,
                          jobTitle: selected.jobTitle,
                        })
                      }
                      fullWidth
                    >
                      <MenuItem value="">— Not set —</MenuItem>
                      {STAFF_LEVELS.map((l) => (
                        <MenuItem key={l} value={l}>
                          {`${STAFF_LEVEL_LABEL[l]} · ${STAFF_LEVEL_DESCRIPTION[l]?.split("—")[0]?.trim()}`}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TextField
                      id="hr-jobtitle"
                      label="Job title"
                      placeholder="e.g. Senior Architect"
                      defaultValue={selected.jobTitle ?? ""}
                      onBlur={(e) =>
                        updateLevel.mutate({
                          memberId: selected.id,
                          staffLevel: (selected.staffLevel as "L1" | "L2" | "L3" | "L4" | null) ?? null,
                          jobTitle: e.target.value || null,
                        })
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
                {updateLevel.isPending && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Saving…</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Document vault */}
            <div className="esti-row-between">
              <Typography variant="subtitle1" component="h4">Document vault</Typography>
              <Button size="small" variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
                Upload document
              </Button>
            </div>

            {profileQ.isLoading && (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading documents…</Typography>
              </Stack>
            )}

            {profileQ.data?.documents.length === 0 && (
              <Box sx={{ p: 2 }}>
                <p className="esti-label esti-label--secondary">No documents uploaded yet.</p>
              </Box>
            )}

            <Grid container spacing={2}>
              {(profileQ.data?.documents ?? []).map((doc) => (
                <Grid key={doc.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Box className="esti-doc-tile" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Stack spacing={1}>
                      <div className="esti-doc-tile__header">
                        <DescriptionIcon sx={{ fontSize: 20 }} />
                        <StatusDot
                          color={doc.verifiedAt ? "green" : "gray"}
                          label={doc.verifiedAt ? "Verified" : "Unverified"}
                        />
                      </div>
                      <p className="esti-label"><strong>{doc.documentName}</strong></p>
                      <p className="esti-label esti-label--secondary">
                        {HR_DOCUMENT_TYPES[doc.documentType as DocType] ?? doc.documentType}
                      </p>
                      {doc.expiryDate && (
                        <p className="esti-label esti-label--secondary">Expires: {doc.expiryDate}</p>
                      )}
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="esti-label">
                          View file ↗
                        </a>
                      )}
                      <div className="esti-doc-tile__actions">
                        {!doc.verifiedAt && (
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<CheckIcon />}
                            disabled={verifyDoc.isPending}
                            onClick={() => verifyDoc.mutate({ docId: doc.id })}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          disabled={deleteDoc.isPending}
                          onClick={() => deleteDoc.mutate({ docId: doc.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        )}
      </Grid>

      {/* Upload document modal */}
      <Dialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setSelectedFile(null); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{`Upload document${selected ? ` — ${selected.name}` : ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="doc-type"
              select
              label="Document type"
              value={uploadForm.documentType}
              onChange={(e) => setUploadForm((f) => ({ ...f, documentType: e.target.value as DocType }))}
              fullWidth
            >
              {(Object.keys(HR_DOCUMENT_TYPES) as DocType[]).map((k) => (
                <MenuItem key={k} value={k}>{HR_DOCUMENT_TYPES[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="doc-name"
              label="Label (optional)"
              placeholder={HR_DOCUMENT_TYPES[uploadForm.documentType]}
              value={uploadForm.documentName}
              onChange={(e) => setUploadForm((f) => ({ ...f, documentName: e.target.value }))}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  id="doc-issue"
                  label="Issue date (optional)"
                  type="date"
                  value={uploadForm.issueDate}
                  onChange={(e) => setUploadForm((f) => ({ ...f, issueDate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  id="doc-expiry"
                  label="Expiry date (optional)"
                  type="date"
                  value={uploadForm.expiryDate}
                  onChange={(e) => setUploadForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              id="doc-notes"
              label="Notes (optional)"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
            />
            <Stack direction="row">
              <Button variant="outlined" size="small" component="label">
                {selectedFile ? selectedFile.name : "Choose file (PDF, JPG, PNG — max 10 MB)"}
                <HiddenFileInput
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                    e.target.value = "";
                  }}
                />
              </Button>
            </Stack>
            {uploadMsg && (
              <Alert severity="error">{uploadMsg}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => { setUploadOpen(false); setSelectedFile(null); }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!selectedFile || uploading} onClick={handleUpload}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
