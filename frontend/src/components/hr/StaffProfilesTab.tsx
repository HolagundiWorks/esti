import {
  Button,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { Checkmark, Document, TrashCan, Upload } from "@carbon/icons-react";
import {
  HR_DOCUMENT_TYPES,
  STAFF_LEVEL_DESCRIPTION,
  STAFF_LEVEL_LABEL,
  STAFF_LEVELS,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { useRef, useState } from "react";
import { resolveColor, getInitials } from "../StaffAvatar.js";
import { apiUrl, authHeaders } from "../../lib/api-base.js";
import { trpc } from "../../lib/trpc.js";

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
  const fileRef = useRef<HTMLInputElement>(null);
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
    <Grid narrow>
      {/* Left: member list */}
      <Column lg={4} md={3} sm={4}>
        <Stack gap={2}>
          <p className="esti-label esti-label--secondary">Select a staff member</p>
          {members.map((m) => {
            const color = resolveColor({ staffLevel: m.staffLevel ?? null, name: m.name });
            const isSelected = m.id === selectedId;
            return (
              <Tile
                key={m.id}
                className={`esti-profile-member-tile${isSelected ? " esti-profile-member-tile--active" : ""}`}
                onClick={() => setSelectedId(m.id)}
              >
                <div className="esti-avatar-name-cell">
                  <span
                    className="esti-staff-avatar"
                    style={{ width: 36, height: 36, minWidth: 36, background: color, fontSize: 13 }}
                  >
                    <span aria-hidden>{getInitials(m.name)}</span>
                  </span>
                  <span>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{m.name}</p>
                    <p className="esti-label esti-label--secondary">
                      {m.jobTitle || (TEAM_ROLES[m.role as TeamRoleCode] ?? m.role)}
                    </p>
                  </span>
                  {m.staffLevel && (
                    <span className="esti-staff-tile__level-badge" style={{ background: color, marginInlineStart: "auto" }}>
                      {m.staffLevel}
                    </span>
                  )}
                </div>
              </Tile>
            );
          })}
        </Stack>
      </Column>

      {/* Right: profile detail */}
      <Column lg={12} md={5} sm={4}>
        {!selected ? (
          <Tile>
            <p className="esti-label esti-label--secondary">Select a staff member to view their profile and documents.</p>
          </Tile>
        ) : (
          <Stack gap={5}>
            {/* Level assignment */}
            <Tile>
              <Stack gap={4}>
                <h3>{selected.name}</h3>
                <Grid narrow>
                  <Column lg={4} md={4} sm={4}>
                    <Select
                      id="hr-level"
                      labelText="Staff level"
                      value={selected.staffLevel ?? ""}
                      onChange={(e) =>
                        updateLevel.mutate({
                          memberId: selected.id,
                          staffLevel: (e.target.value as "L1" | "L2" | "L3" | "L4") || null,
                          jobTitle: selected.jobTitle,
                        })
                      }
                    >
                      <SelectItem value="" text="— Not set —" />
                      {STAFF_LEVELS.map((l) => (
                        <SelectItem key={l} value={l} text={`${STAFF_LEVEL_LABEL[l]} · ${STAFF_LEVEL_DESCRIPTION[l]?.split("—")[0]?.trim()}`} />
                      ))}
                    </Select>
                  </Column>
                  <Column lg={4} md={4} sm={4}>
                    <TextInput
                      id="hr-jobtitle"
                      labelText="Job title"
                      placeholder="e.g. Senior Architect"
                      defaultValue={selected.jobTitle ?? ""}
                      onBlur={(e) =>
                        updateLevel.mutate({
                          memberId: selected.id,
                          staffLevel: (selected.staffLevel as "L1" | "L2" | "L3" | "L4" | null) ?? null,
                          jobTitle: e.target.value || null,
                        })
                      }
                    />
                  </Column>
                </Grid>
                {updateLevel.isPending && <InlineLoading description="Saving…" />}
              </Stack>
            </Tile>

            {/* Document vault */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>Document vault</h4>
              <Button size="sm" renderIcon={Upload} onClick={() => setUploadOpen(true)}>
                Upload document
              </Button>
            </div>

            {profileQ.isLoading && <InlineLoading description="Loading documents…" />}

            {profileQ.data?.documents.length === 0 && (
              <Tile>
                <p className="esti-label esti-label--secondary">No documents uploaded yet.</p>
              </Tile>
            )}

            <Grid narrow>
              {(profileQ.data?.documents ?? []).map((doc) => (
                <Column key={doc.id} lg={4} md={4} sm={4}>
                  <Tile className="esti-doc-tile">
                    <Stack gap={2}>
                      <div className="esti-doc-tile__header">
                        <Document size={20} />
                        <Tag type={doc.verifiedAt ? "green" : "gray"} size="sm">
                          {doc.verifiedAt ? "Verified" : "Unverified"}
                        </Tag>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{doc.documentName}</p>
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
                            kind="ghost"
                            size="sm"
                            renderIcon={Checkmark}
                            disabled={verifyDoc.isPending}
                            onClick={() => verifyDoc.mutate({ docId: doc.id })}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          renderIcon={TrashCan}
                          disabled={deleteDoc.isPending}
                          onClick={() => deleteDoc.mutate({ docId: doc.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </Stack>
                  </Tile>
                </Column>
              ))}
            </Grid>
          </Stack>
        )}
      </Column>

      {/* Upload document modal */}
      <Modal
        open={uploadOpen}
        modalHeading={`Upload document${selected ? ` — ${selected.name}` : ""}`}
        primaryButtonText={uploading ? "Uploading…" : "Upload"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!selectedFile || uploading}
        onRequestClose={() => { setUploadOpen(false); setSelectedFile(null); }}
        onRequestSubmit={handleUpload}
      >
        <Stack gap={5}>
          <Select
            id="doc-type"
            labelText="Document type"
            value={uploadForm.documentType}
            onChange={(e) => setUploadForm((f) => ({ ...f, documentType: e.target.value as DocType }))}
          >
            {(Object.keys(HR_DOCUMENT_TYPES) as DocType[]).map((k) => (
              <SelectItem key={k} value={k} text={HR_DOCUMENT_TYPES[k]} />
            ))}
          </Select>
          <TextInput
            id="doc-name"
            labelText="Label (optional)"
            placeholder={HR_DOCUMENT_TYPES[uploadForm.documentType]}
            value={uploadForm.documentName}
            onChange={(e) => setUploadForm((f) => ({ ...f, documentName: e.target.value }))}
          />
          <Grid narrow>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="doc-issue"
                labelText="Issue date (optional)"
                type="date"
                value={uploadForm.issueDate}
                onChange={(e) => setUploadForm((f) => ({ ...f, issueDate: e.target.value }))}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="doc-expiry"
                labelText="Expiry date (optional)"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </Column>
          </Grid>
          <TextInput
            id="doc-notes"
            labelText="Notes (optional)"
            value={uploadForm.notes}
            onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <Stack gap={2}>
            <Button kind="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              {selectedFile ? selectedFile.name : "Choose file (PDF, JPG, PNG — max 10 MB)"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setSelectedFile(f);
                e.target.value = "";
              }}
            />
          </Stack>
          {uploadMsg && (
            <InlineNotification kind="error" title="Upload error" subtitle={uploadMsg} hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>
    </Grid>
  );
}
