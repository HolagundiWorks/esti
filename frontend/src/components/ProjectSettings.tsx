import {
  Button,
  InlineNotification,
  Modal,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";
import { ProjectEngagements } from "./ProjectEngagements.js";

const ACTIVITY_TAG: Record<
  string,
  "gray" | "blue" | "purple" | "teal" | "green"
> = {
  "project.created": "green",
  "note.created": "blue",
};

export function ProjectSettings({ projectId }: { projectId: string }) {
  const { canProjectDelete } = useCapabilities();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );
  const settingsQ = trpc.settings.get.useQuery();
  const firmPmcEnabled = settingsQ.data?.pmcEnabled ?? false;
  const logsQ = trpc.projectOffice.logs.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const activityQ = trpc.activity.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const setCurrent = trpc.phases.setCurrent.useMutation({
    onSuccess: () => {
      utils.phases.listByProject.invalidate({ projectId });
      utils.projectOffice.byId.invalidate({ id: projectId });
    },
  });
  const setRevisionBudget = trpc.phases.setRevisionBudget.useMutation({
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId }),
  });
  const [revBudgetDraft, setRevBudgetDraft] = useState<Record<string, string>>({});

  const [pmcEnabled, setPmcEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = projectQ.data;
    if (p) setPmcEnabled((p as { pmcEnabled?: boolean }).pmcEnabled ?? false);
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

  return (
    <div style={{ marginTop: 16 }}>
      {msg && (
        <InlineNotification
          kind="success"
          title="Saved"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      {firmPmcEnabled && (
      <Tile style={{ maxWidth: 640 }}>
        <Stack gap={5}>
          <h4>PMC</h4>
          <Toggle
            id="ps-pmc"
            labelText="PMC on this project"
            labelA="Off"
            labelB="On"
            toggled={pmcEnabled}
            onToggle={setPmcEnabled}
          />
          <Button
            disabled={update.isPending || !projectQ.data}
            onClick={() => {
              const p = projectQ.data;
              if (!p) return;
              update.mutate({
                id: projectId,
                title: p.title,
                status: p.status as "ENQUIRY" | "PROPOSAL" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED",
                projectType: p.projectType,
                workType: ((p as { workType?: string }).workType ?? "ARCHITECTURE") as "ARCHITECTURE" | "INTERIOR" | "LANDSCAPE" | "MISC",
                jurisdiction: p.jurisdiction,
                dateStart: p.dateStart ?? null,
                pmcEnabled,
              });
            }}
          >
            Save PMC setting
          </Button>
        </Stack>
      </Tile>
      )}

      <Tile style={{ maxWidth: 760, marginTop: 16 }}>
        <Stack gap={4}>
          <h4>Project stages</h4>
          <p>
            Mark the stage currently in progress. Earlier stages are automatically complete;
            later stages are pending. The current stage is also shown on the Project Info tab.
          </p>
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Stage</TableHeader>
                  <TableHeader>Fee allocation %</TableHeader>
                  <TableHeader>Rev. budget</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(phasesQ.data ?? []).map((ph, idx) => {
                  const currentId = projectQ.data?.currentPhaseId;
                  const currentIdx = (phasesQ.data ?? []).findIndex((p) => p.id === currentId);
                  const isActive = ph.id === currentId;
                  const stageStatus = isActive ? "Active" : (currentIdx >= 0 && idx < currentIdx) ? "Complete" : "Pending";
                  const tagType = stageStatus === "Active" ? "blue" : stageStatus === "Complete" ? "green" : "gray";
                  return (
                    <TableRow key={ph.id}>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billingPct}%</TableCell>
                      <TableCell>
                        <TextInput
                          id={`rev-budget-${ph.id}`}
                          labelText=""
                          hideLabel
                          type="number"
                          size="sm"
                          placeholder="—"
                          value={revBudgetDraft[ph.id] ?? (ph.revisionBudget != null ? String(ph.revisionBudget) : "")}
                          onChange={(e) =>
                            setRevBudgetDraft((prev) => ({ ...prev, [ph.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const raw = revBudgetDraft[ph.id];
                            if (raw === undefined) return;
                            const val = raw.trim() === "" ? null : parseInt(raw, 10);
                            if (val !== null && (isNaN(val) || val < 0 || val > 99)) return;
                            setRevisionBudget.mutate({ phaseId: ph.id, projectId, revisionBudget: val });
                          }}
                          style={{ width: 72 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tag type={tagType} size="sm">{stageStatus}</Tag>
                      </TableCell>
                      <TableCell>
                        {!isActive && (
                          <Button
                            kind="ghost"
                            size="sm"
                            disabled={setCurrent.isPending}
                            onClick={() => setCurrent.mutate({ projectId, phaseId: ph.id })}
                          >
                            Set as current
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Tile>

      <div style={{ maxWidth: 760, marginTop: 16 }}>
        <ProjectEngagements projectId={projectId} />
      </div>

      <Tile style={{ maxWidth: 640, marginTop: 16 }}>
        <Stack gap={5}>
          <h4>Internal log (audit)</h4>
          <p>Office-internal notes for audit — not visible to clients.</p>
          <TextArea
            id="ps-note"
            labelText="Add a note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            kind="tertiary"
            disabled={!note || addLog.isPending}
            onClick={() => addLog.mutate({ projectId, note })}
          >
            Add note
          </Button>
          <div>
            {(logsQ.data ?? []).map((l) => (
              <div
                key={l.id}
                style={{ padding: "4px 0 4px 12px", marginTop: 8 }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{l.note}</div>
                <div>
                  {l.authorName ?? "—"} ·{" "}
                  {new Date(l.createdAt as unknown as string).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Stack>
      </Tile>

      <Tile style={{ maxWidth: 640, marginTop: 16 }}>
        <Stack gap={5}>
          <h4>Activity feed</h4>
          <p>
            Project timeline entries for change control, internal notes, and
            future revision intelligence.
          </p>
          <div>
            {(activityQ.data ?? []).map((item) => (
              <div
                key={item.id}
                style={{ padding: "4px 0 4px 12px", marginTop: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Tag size="sm" type={ACTIVITY_TAG[item.eventType] ?? "gray"}>
                    {item.eventType}
                  </Tag>
                  <span>{item.summary}</span>
                </div>
                <div>
                  {item.actorName ?? "—"} ·{" "}
                  {new Date(
                    item.createdAt as unknown as string,
                  ).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Stack>
      </Tile>

      {canProjectDelete && (
        <Tile style={{ maxWidth: 640, marginTop: 16 }}>
          <h4>Danger zone</h4>
          <p style={{ margin: "8px 0 12px" }}>
            Archive this project from active work while retaining its phases,
            fees, invoices, drawings, estimates, and audit history. Authorized
            managers can restore it later.
          </p>
          <Button kind="danger" onClick={() => setConfirmDelete(true)}>
            Archive project
          </Button>
        </Tile>
      )}

      <Modal
        open={confirmDelete}
        danger
        modalHeading="Archive project?"
        primaryButtonText={remove.isPending ? "Archiving…" : "Archive project"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={remove.isPending || adminPwd.length === 0}
        onRequestClose={closeDelete}
        onRequestSubmit={() =>
          remove.mutate({ id: projectId, password: adminPwd })
        }
      >
        <Stack gap={5}>
          <p>
            This removes <strong>{p?.title}</strong> from active project lists
            while retaining every related record for audit and later
            restoration.
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
              title="Archive failed"
              subtitle={remove.error.message}
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
