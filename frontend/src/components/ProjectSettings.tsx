import {
  Button,
  InlineNotification,
  Modal,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { Jurisdiction, ProjectStatus, ProjectType } from "@esti/contracts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

export function ProjectSettings({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery({ id: projectId }, { enabled: !!projectId });
  const logsQ = trpc.projectOffice.logs.useQuery({ projectId }, { enabled: !!projectId });

  const [f, setF] = useState({ title: "", status: "ENQUIRY", projectType: "RESIDENTIAL", jurisdiction: "OTHER", dateStart: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = projectQ.data;
    if (p)
      setF({
        title: p.title,
        status: p.status,
        projectType: p.projectType,
        jurisdiction: p.jurisdiction,
        dateStart: p.dateStart ?? "",
      });
  }, [projectQ.data]);

  const update = trpc.projectOffice.update.useMutation({
    onSuccess: () => {
      utils.projectOffice.byId.invalidate({ id: projectId });
      utils.projectOffice.list.invalidate();
      setMsg("Project updated");
    },
  });

  const [note, setNote] = useState("");
  const addLog = trpc.projectOffice.addLog.useMutation({
    onSuccess: () => {
      utils.projectOffice.logs.invalidate({ projectId });
      setNote("");
    },
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const remove = trpc.projectOffice.remove.useMutation({
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      navigate("/projects");
    },
  });
  function closeDelete() {
    setConfirmDelete(false);
    setAdminPwd("");
    remove.reset();
  }

  const p = projectQ.data;
  const isOwner = user?.role === "OWNER";

  return (
    <div style={{ marginTop: 16 }}>
      {msg && <InlineNotification kind="success" title="Saved" subtitle={msg} lowContrast onCloseButtonClick={() => setMsg(null)} />}

      <Tile style={{ maxWidth: 640 }}>
        <Stack gap={5}>
          <h4>Project details</h4>
          <TextInput id="ps-title" labelText="Title" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} />
          <div style={{ display: "flex", gap: 12 }}>
            <Select id="ps-status" labelText="Status" value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value }))}>
              {ProjectStatus.options.map((s) => <SelectItem key={s} value={s} text={s} />)}
            </Select>
            <Select id="ps-type" labelText="Type" value={f.projectType} onChange={(e) => setF((x) => ({ ...x, projectType: e.target.value }))}>
              {ProjectType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <Select id="ps-jur" labelText="Jurisdiction" value={f.jurisdiction} onChange={(e) => setF((x) => ({ ...x, jurisdiction: e.target.value }))}>
              {Jurisdiction.options.map((j) => <SelectItem key={j} value={j} text={j} />)}
            </Select>
          </div>
          <TextInput id="ps-date" labelText="Start date" type="date" value={f.dateStart} onChange={(e) => setF((x) => ({ ...x, dateStart: e.target.value }))} />
          <Button
            disabled={f.title.length < 2 || update.isPending}
            onClick={() =>
              update.mutate({
                id: projectId,
                title: f.title,
                status: f.status as (typeof ProjectStatus.options)[number],
                projectType: f.projectType,
                jurisdiction: f.jurisdiction,
                dateStart: f.dateStart || null,
              })
            }
          >
            {update.isPending ? "Saving…" : "Save details"}
          </Button>
          {p && (
            <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
              Ref {p.ref} · created {new Date(p.createdAt as unknown as string).toLocaleDateString()} · last updated{" "}
              {new Date(p.updatedAt as unknown as string).toLocaleDateString()}
            </p>
          )}
        </Stack>
      </Tile>

      <Tile style={{ maxWidth: 640, marginTop: 16 }}>
        <Stack gap={5}>
          <h4>Internal log (audit)</h4>
          <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
            Office-internal notes for audit — not visible to clients.
          </p>
          <TextArea id="ps-note" labelText="Add a note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button kind="tertiary" disabled={!note || addLog.isPending} onClick={() => addLog.mutate({ projectId, note })}>
            Add note
          </Button>
          <div>
            {(logsQ.data ?? []).map((l) => (
              <div key={l.id} style={{ borderLeft: "2px solid var(--cds-border-subtle)", padding: "4px 0 4px 12px", marginTop: 8 }}>
                <div style={{ whiteSpace: "pre-wrap" }}>{l.note}</div>
                <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  {l.authorName ?? "—"} · {new Date(l.createdAt as unknown as string).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Stack>
      </Tile>

      {isOwner && (
        <Tile style={{ maxWidth: 640, marginTop: 16, borderLeft: "3px solid #da1e28" }}>
          <h4>Danger zone</h4>
          <p style={{ color: "var(--cds-text-secondary)", margin: "8px 0 12px" }}>
            Permanently delete this project and all its records (phases, fees, invoices, drawings,
            estimates, etc.). This cannot be undone.
          </p>
          <Button kind="danger" onClick={() => setConfirmDelete(true)}>
            Delete project
          </Button>
        </Tile>
      )}

      <Modal
        open={confirmDelete}
        danger
        modalHeading="Delete project?"
        primaryButtonText={remove.isPending ? "Deleting…" : "Delete permanently"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={remove.isPending || adminPwd.length === 0}
        onRequestClose={closeDelete}
        onRequestSubmit={() => remove.mutate({ id: projectId, password: adminPwd })}
      >
        <Stack gap={5}>
          <p>
            This deletes <strong>{p?.title}</strong> and every related record. This action cannot be
            undone.
          </p>
          <PasswordInput
            id="ps-admin-pwd"
            labelText="Enter your admin password to confirm"
            value={adminPwd}
            onChange={(e) => setAdminPwd(e.target.value)}
          />
          {remove.error && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Delete failed"
              subtitle={remove.error.message}
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
