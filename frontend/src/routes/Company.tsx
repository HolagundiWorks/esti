import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  type FirmType,
  type GstType,
  DEFAULT_AI_SETTINGS,
  DEFAULT_ESCALATION_SETTINGS,
  type AiSettings,
  type EscalationSettings,
  GstSystem,
  HR_LOCK_REASON_LABEL,
  HrArchiveConfirmPhrase,
  ORG_MODE_LABEL,
  parseAiSettings,
  parseEscalationSettings,
  PhoneType,
  STATES,
  districtsFor,
} from "@esti/contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

const GST_LABEL: Record<string, string> = {
  [GstSystem.NOT_APPLICABLE]: "NA (not registered)",
  [GstSystem.COMPOSITION]: "Composition (6%, bill of supply)",
  [GstSystem.REGULAR]: "Regular (18% tax invoice)",
};

type Form = {
  companyName: string;
  firmType: FirmType;
  gstType: GstType;
  gstin: string;
  tdsApplicableDefault: boolean;
  architectName: string;
  coaRegNo: string;
  pan: string;
  email: string;
  phone1Type: string;
  phone1: string;
  phone2Type: string;
  phone2: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  district: string;
  state: string;
};

const EMPTY: Form = {
  companyName: "",
  firmType: "SOLO",
  gstType: GstSystem.REGULAR,
  gstin: "",
  tdsApplicableDefault: true,
  architectName: "",
  coaRegNo: "",
  pan: "",
  email: "",
  phone1Type: "MOBILE",
  phone1: "",
  phone2Type: "OFFICE",
  phone2: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  district: "",
  state: "Karnataka",
};

export function Company() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const utils = trpc.useUtils();
  const firmQ = trpc.firm.get.useQuery();
  const settingsQ = trpc.settings.get.useQuery();
  const hrStatusQ = trpc.settings.hrModuleStatus.useQuery();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState("");

  const setHr = trpc.settings.setHrEnabled.useMutation({
    onSuccess: (row) => {
      utils.settings.get.invalidate();
      utils.settings.hrModuleStatus.invalidate();
      if (row.soloSummary) {
        setMsg(
          `Team & HR disabled. ${row.soloSummary.tasksUpdated} task(s) mapped to the principal architect across ${row.soloSummary.projectsTouched} project(s).`,
        );
      } else if (row.hrEnabled) {
        const reactivated =
          row.membersReactivated > 0
            ? ` ${row.membersReactivated} team member(s) reactivated from the last archive. Reassign tasks manually.`
            : "";
        setMsg(`Team & HR enabled — studio mode active.${reactivated}`);
      }
    },
  });
  const archiveHr = trpc.settings.archiveTeamModule.useMutation({
    onSuccess: (row) => {
      utils.settings.get.invalidate();
      utils.settings.hrModuleStatus.invalidate();
      setArchiveOpen(false);
      setArchiveReason("");
      setArchiveConfirm("");
      setMsg(
        `Team module archived. ${row.tasksRemapped} task(s) remapped, ${row.membersArchived} member(s) deactivated. Snapshot ${row.archiveId.slice(0, 8)}… stored for reference.`,
      );
    },
  });

  const handleHrToggle = (checked: boolean) => {
    if (checked) {
      setHr.mutate({ hrEnabled: true });
      return;
    }
    if (hrStatusQ.data?.locked) {
      setArchiveOpen(true);
      return;
    }
    setHr.mutate({ hrEnabled: false });
  };

  const [f, setF] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (firmQ.data) {
      setF(
        (p) =>
          ({
            ...p,
            ...Object.fromEntries(
              Object.keys(EMPTY).map((k) => [
                k,
                (firmQ.data as Record<string, unknown>)[k] ??
                  EMPTY[k as keyof Form],
              ]),
            ),
          }) as Form,
      );
    }
  }, [firmQ.data]);

  const update = trpc.firm.update.useMutation({
    onSuccess: () => {
      utils.firm.get.invalidate();
      setMsg("Company profile saved");
    },
  });

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/upload/firm-logo", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (res.ok) {
      utils.firm.get.invalidate();
      setMsg("Logo uploaded");
    } else {
      const err =
        (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
      setMsg(`Logo upload failed: ${err}`);
    }
  }

  const districts = districtsFor(f.state);

  return (
    <Stack gap={6}>
      <PageHeader
        title="Company profile"
        description={isOwner ? undefined : "Read-only — only the owner can edit."}
      />
      {msg && (
        <InlineNotification
          kind="success"
          title="Saved"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      <Tile style={{ maxWidth: 760 }}>
        <Stack gap={5}>
          <TextInput
            id="co-name"
            labelText="Company name"
            value={f.companyName}
            onChange={set("companyName")}
            disabled={!isOwner}
          />

          <Stack orientation="horizontal" gap={5}>
            <Select
              id="co-type"
              labelText="Firm type"
              value={f.firmType}
              onChange={set("firmType")}
              disabled={!isOwner}
            >
              <SelectItem value="SOLO" text="Solo" />
              <SelectItem value="PARTNERSHIP" text="Partnership" />
            </Select>
            {firmQ.data?.logoUrl && (
              <img src={firmQ.data.logoUrl} alt="logo" style={{ height: 48 }} />
            )}
            <FileUploaderButton
              labelText="Upload logo"
              accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
              disableLabelChanges
              buttonKind="tertiary"
              disabled={!isOwner}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void uploadLogo(file);
              }}
            />
          </Stack>

          <Stack orientation="horizontal" gap={5}>
            <Select
              id="co-gst"
              labelText="GST type (sets invoice GST)"
              value={f.gstType}
              onChange={set("gstType")}
              disabled={!isOwner}
            >
              {Object.values(GstSystem).map((g) => (
                <SelectItem key={g} value={g} text={GST_LABEL[g] ?? g} />
              ))}
            </Select>
            <TextInput
              id="co-gstin"
              labelText="GSTIN"
              value={f.gstin}
              onChange={set("gstin")}
              disabled={!isOwner}
            />
          </Stack>
          <Toggle
            id="co-tds"
            labelText="TDS declaration — clients deduct TDS u/s 194J (10%)"
            labelA="No TDS"
            labelB="TDS deducted"
            toggled={f.tdsApplicableDefault}
            disabled={!isOwner}
            onToggle={(checked) =>
              setF((p) => ({ ...p, tdsApplicableDefault: checked }))
            }
          />

          <h3>{f.firmType === "SOLO" ? "Architect" : "Primary signatory"}</h3>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-arch"
              labelText="Architect name"
              value={f.architectName}
              onChange={set("architectName")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-coa"
              labelText="COA registration no"
              value={f.coaRegNo}
              onChange={set("coaRegNo")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-pan"
              labelText="PAN"
              value={f.pan}
              onChange={set("pan")}
              disabled={!isOwner}
            />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-email"
              labelText="Email"
              type="email"
              value={f.email}
              onChange={set("email")}
              disabled={!isOwner}
            />
            <Select
              id="co-p1t"
              labelText="Phone 1 type"
              value={f.phone1Type}
              onChange={set("phone1Type")}
              disabled={!isOwner}
            >
              {PhoneType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput
              id="co-p1"
              labelText="Phone 1"
              value={f.phone1}
              onChange={set("phone1")}
              disabled={!isOwner}
            />
            <Select
              id="co-p2t"
              labelText="Phone 2 type"
              value={f.phone2Type}
              onChange={set("phone2Type")}
              disabled={!isOwner}
            >
              {PhoneType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput
              id="co-p2"
              labelText="Phone 2"
              value={f.phone2}
              onChange={set("phone2")}
              disabled={!isOwner}
            />
          </Stack>

          <h3>Address</h3>
          <TextInput
            id="co-a1"
            labelText="Address line 1"
            value={f.addressLine1}
            onChange={set("addressLine1")}
            disabled={!isOwner}
          />
          <TextInput
            id="co-a2"
            labelText="Address line 2"
            value={f.addressLine2}
            onChange={set("addressLine2")}
            disabled={!isOwner}
          />
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-city"
              labelText="City"
              value={f.city}
              onChange={set("city")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-pin"
              labelText="Pincode"
              value={f.pincode}
              onChange={set("pincode")}
              disabled={!isOwner}
            />
            <Select
              id="co-state"
              labelText="State"
              value={f.state}
              onChange={(e) =>
                setF((p) => ({ ...p, state: e.target.value, district: "" }))
              }
              disabled={!isOwner}
            >
              {STATES.map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
            {districts.length > 0 ? (
              <Select
                id="co-dist"
                labelText="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
              >
                <SelectItem value="" text="Select…" />
                {districts.map((d) => (
                  <SelectItem key={d} value={d} text={d} />
                ))}
              </Select>
            ) : (
              <TextInput
                id="co-dist"
                labelText="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
              />
            )}
          </Stack>

          <Button
            disabled={!isOwner || !f.companyName || update.isPending}
            onClick={() =>
              update.mutate({
                ...f,
                firmType: f.firmType,
                gstType: f.gstType,
                phone1Type: f.phone1Type as (typeof PhoneType.options)[number],
                phone2Type: f.phone2Type as (typeof PhoneType.options)[number],
              })
            }
          >
            {update.isPending ? "Saving…" : "Save company profile"}
          </Button>
        </Stack>
      </Tile>

      {f.firmType === "PARTNERSHIP" && <Partners isOwner={isOwner} />}

      <Tile style={{ maxWidth: 760 }}>
        <Stack gap={5}>
          <h2>Team &amp; HR module</h2>
          <p>
            Operating mode for your office: <strong>{ORG_MODE_LABEL[(settingsQ.data?.orgMode as "SOLO" | "STUDIO") ?? "SOLO"]}</strong>.
            Solo practice runs without team nav, workload, or performance modules.
            Studio mode supports roster, assignments, attendance, and ASPRF.
          </p>
          {hrStatusQ.data?.locked && settingsQ.data?.hrEnabled && (
            <InlineNotification
              kind="warning"
              title="Archive required to switch to solo"
              subtitle="This workspace has team records (attendance, roster, assignments, etc.). Turning Team & HR off runs an archive workflow — active tasks map to the principal; a read-only snapshot is kept."
              lowContrast
              hideCloseButton
            />
          )}
          {hrStatusQ.data && !hrStatusQ.data.hrEnabled && hrStatusQ.data.latestArchive && (
            <InlineNotification
              kind="info"
              title="Team module archived"
              subtitle={`Last archive: ${new Date(hrStatusQ.data.latestArchive.createdAt).toLocaleString("en-IN")} · ${hrStatusQ.data.latestArchive.tasksRemapped} tasks remapped · ${hrStatusQ.data.latestArchive.membersArchived} members archived. Re-enabling restores the roster; task assignees stay on the principal until you reassign.`}
              lowContrast
              hideCloseButton
            />
          )}
          <Toggle
            id="hr-toggle"
            labelText="Enable Team &amp; HR"
            labelA="Off (solo)"
            labelB="On (studio)"
            toggled={settingsQ.data?.hrEnabled ?? false}
            disabled={!isOwner || setHr.isPending || archiveHr.isPending || settingsQ.isLoading}
            onToggle={(checked) => handleHrToggle(checked)}
          />
          {!isOwner && <p>Only the owner can change this.</p>}
          {hrStatusQ.data?.archives && hrStatusQ.data.archives.length > 0 && (
            <Stack gap={2}>
              <h3>Archive history</h3>
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {hrStatusQ.data.archives.map((a) => (
                    <StructuredListRow key={a.id}>
                      <StructuredListCell>
                        {new Date(a.createdAt).toLocaleString("en-IN")}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </StructuredListCell>
                      <StructuredListCell noWrap>
                        {a.tasksRemapped} tasks · {a.membersArchived} members
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            </Stack>
          )}
        </Stack>
      </Tile>

      <Modal
        open={archiveOpen}
        modalHeading="Archive Team & HR module"
        primaryButtonText={archiveHr.isPending ? "Archiving…" : "Archive and switch to solo"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          archiveHr.isPending || archiveConfirm !== HrArchiveConfirmPhrase
        }
        onRequestClose={() => {
          setArchiveOpen(false);
          setArchiveConfirm("");
        }}
        onRequestSubmit={() =>
          archiveHr.mutate({
            confirmPhrase: HrArchiveConfirmPhrase,
            reason: archiveReason.trim() || undefined,
          })
        }
      >
        <Stack gap={5}>
          <p>
            This preserves a read-only snapshot of roster, assignments, and task
            attribution, then maps all open tasks to the principal architect and
            deactivates other team members.
          </p>
          {hrStatusQ.data?.lockReasons.map((r) => (
            <p key={r}>• {HR_LOCK_REASON_LABEL[r]}</p>
          ))}
          <TextInput
            id="archive-reason"
            labelText="Reason (optional)"
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
          />
          <TextInput
            id="archive-confirm"
            labelText={`Type ${HrArchiveConfirmPhrase} to confirm`}
            value={archiveConfirm}
            onChange={(e) => setArchiveConfirm(e.target.value)}
          />
        </Stack>
      </Modal>

      {isOwner && <EscalationSettingsPanel />}
      {isOwner && !user?.isDemo && <AiStudioSettingsPanel />}
      {isOwner && <ReleaseMetadataPanel />}
      {isOwner && <DataTools />}
    </Stack>
  );
}

function EscalationSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const [form, setForm] = useState<EscalationSettings>(DEFAULT_ESCALATION_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data?.escalationSettings) {
      setForm(parseEscalationSettings(settingsQ.data.escalationSettings));
    }
  }, [settingsQ.data]);

  const save = trpc.settings.setEscalationSettings.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("Alert escalation rules saved");
    },
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>Alert escalation</h2>
        <p>
          Controls when client approvals, follow-ups, overdue tasks, and leave
          appear as immediate alerts vs the daily digest on the Alerts page.
        </p>
        {msg && (
          <InlineNotification
            kind="success"
            title="Saved"
            subtitle={msg}
            lowContrast
            onCloseButtonClick={() => setMsg(null)}
          />
        )}
        <TextInput
          id="esc-stale"
          labelText="Stale client approval (days)"
          helperText="Approvals unanswered for this many days become immediate alerts."
          type="number"
          value={String(form.staleApprovalDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, staleApprovalDays: Number(e.target.value) || 7 }))
          }
        />
        <TextInput
          id="esc-followup"
          labelText="Follow-up lead time (days before due)"
          helperText="0 = alert on the due date only."
          type="number"
          value={String(form.followUpLeadDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, followUpLeadDays: Number(e.target.value) || 0 }))
          }
        />
        <TextInput
          id="esc-task"
          labelText="Overdue task threshold (days past due)"
          type="number"
          value={String(form.taskOverdueDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, taskOverdueDays: Number(e.target.value) || 3 }))
          }
        />
        <TextInput
          id="esc-leave"
          labelText="Leave horizon (days ahead)"
          helperText="Approved leave starting within this window surfaces on alerts."
          type="number"
          value={String(form.leaveHorizonDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, leaveHorizonDays: Number(e.target.value) || 7 }))
          }
        />
        <Toggle
          id="esc-digest"
          labelText="Daily digest"
          labelB="On"
          labelA="Off"
          toggled={form.digestEnabled}
          onToggle={(checked) => setForm((f) => ({ ...f, digestEnabled: checked }))}
        />
        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          {save.isPending ? "Saving…" : "Save escalation rules"}
        </Button>
      </Stack>
    </Tile>
  );
}

function AiStudioSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.ai.settings.useQuery();
  const [form, setForm] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      const { ollamaDefaultUrl: _, ...rest } = settingsQ.data;
      setForm(rest);
    }
  }, [settingsQ.data]);

  const save = trpc.ai.setSettings.useMutation({
    onSuccess: () => {
      utils.ai.settings.invalidate();
      setMsg("AI Studio settings saved");
    },
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>AI Studio</h2>
        <p>
          Drafts run on <strong>Ollama</strong> on your server — no cloud API keys or external
          integrations. Pull the model once: <code>ollama pull llama3.2</code>
        </p>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Ollama endpoint"
          subtitle={settingsQ.data?.ollamaDefaultUrl ?? "http://127.0.0.1:11434"}
        />
        {msg && (
          <InlineNotification kind="success" title="Saved" subtitle={msg} lowContrast onClose={() => setMsg(null)} />
        )}
        <Toggle
          id="ai-enabled"
          labelText="Enable AI Studio"
          labelB="On"
          labelA="Off"
          toggled={form.enabled}
          onToggle={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
        />
        <Select
          id="ai-provider"
          labelText="Provider"
          value={form.provider}
          onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiSettings["provider"] }))}
        >
          <SelectItem value="ollama" text="Ollama (on-server)" />
          <SelectItem value="mock" text="Template only (offline / demo)" />
        </Select>
        <TextInput
          id="ai-ollama-url"
          labelText="Ollama base URL"
          helperText="Docker service name, e.g. http://ollama:11434"
          value={form.ollamaBaseUrl ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value.trim() || undefined }))
          }
        />
        <TextInput
          id="ai-model"
          labelText="Ollama model name"
          helperText="Must match a model pulled on the server, e.g. llama3.2"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
        />
        <Toggle
          id="ai-redact"
          labelText="Redact PII in stored output"
          labelB="On"
          labelA="Off"
          toggled={form.redactPii}
          onToggle={(checked) => setForm((f) => ({ ...f, redactPii: checked }))}
        />
        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          {save.isPending ? "Saving…" : "Save AI settings"}
        </Button>
      </Stack>
    </Tile>
  );
}

function ReleaseMetadataPanel() {
  // Same payload as GET /health — avoids a separate tRPC route and matches deploy probes.
  const releaseQ = useQuery({
    queryKey: ["release-health"],
    queryFn: async () => {
      const res = await fetch("/health");
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json() as Promise<{
        ok: boolean;
        app: string;
        version: string;
        revision: string;
        nodeEnv: string;
        builtAt: string | null;
        checks: { db: boolean; redis: boolean; storage: boolean };
      }>;
    },
    staleTime: 30_000,
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={4}>
        <h2>Release &amp; readiness</h2>
        <p>Build revision and backing-service checks for production operations.</p>
        {releaseQ.isLoading && <p className="esti-label">Loading…</p>}
        {releaseQ.isError && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not load release metadata"
            subtitle={releaseQ.error instanceof Error ? releaseQ.error.message : "Unknown error"}
            hideCloseButton
          />
        )}
        {releaseQ.data && (
          <>
            <StructuredListWrapper isCondensed>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell>Application</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.app}</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Version</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.version}</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Revision</StructuredListCell>
                  <StructuredListCell noWrap>
                    <code>{releaseQ.data.revision}</code>
                  </StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Environment</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.nodeEnv}</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>
            <Stack orientation="horizontal" gap={3}>
              <Tag type={releaseQ.data.checks.db ? "green" : "red"} size="sm">
                Database {releaseQ.data.checks.db ? "OK" : "down"}
              </Tag>
              <Tag type={releaseQ.data.checks.redis ? "green" : "red"} size="sm">
                Redis {releaseQ.data.checks.redis ? "OK" : "down"}
              </Tag>
              <Tag type={releaseQ.data.checks.storage ? "green" : "red"} size="sm">
                Storage {releaseQ.data.checks.storage ? "OK" : "down"}
              </Tag>
            </Stack>
            <p className="esti-label esti-label--helper">
              Public liveness: <code>/health</code> · dependency probe: <code>/readyz</code>
            </p>
          </>
        )}
      </Stack>
    </Tile>
  );
}

function DataTools() {
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState<string | null>(null);
  const importDemo = trpc.admin.importDemo.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setMsg(
        `Demo data imported: ${r.clientsCreated} clients, ${r.projectsCreated} projects.`,
      );
    },
  });
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const purge = trpc.admin.purge.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setPurgeOpen(false);
      setPwd("");
      setMsg(`Data reset complete (${r.tablesWiped} tables cleared).`);
    },
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>Data tools</h2>
        {msg && (
          <InlineNotification
            kind="success"
            title="Done"
            subtitle={msg}
            lowContrast
            onCloseButtonClick={() => setMsg(null)}
          />
        )}
        <p>
          Load sample records to explore the system, or reset everything to a
          clean slate. Reset keeps your firm profile, this owner login and DSR
          reference data — all projects, clients, invoices, drawings, HR and other
          logins are permanently removed.
        </p>
        <Stack orientation="horizontal" gap={2}>
          <Button
            kind="tertiary"
            disabled={importDemo.isPending}
            onClick={() => importDemo.mutate()}
          >
            {importDemo.isPending ? "Importing…" : "Import demo data"}
          </Button>
          <Button kind="danger" onClick={() => setPurgeOpen(true)}>
            Reset all data…
          </Button>
        </Stack>
      </Stack>

      <Modal
        open={purgeOpen}
        danger
        modalHeading="Reset all data?"
        primaryButtonText={purge.isPending ? "Resetting…" : "Permanently reset"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={pwd.length === 0 || purge.isPending}
        onRequestClose={() => {
          setPurgeOpen(false);
          setPwd("");
          purge.reset();
        }}
        onRequestSubmit={() => purge.mutate({ password: pwd })}
      >
        <Stack gap={5}>
          <p>
            This permanently deletes <strong>all operational data</strong> and
            cannot be undone. Enter your admin password to confirm.
          </p>
          <PasswordInput
            id="purge-pwd"
            labelText="Admin password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          {purge.error && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Reset failed"
              subtitle={purge.error.message}
            />
          )}
        </Stack>
      </Modal>
    </Tile>
  );
}

function Partners({ isOwner }: { isOwner: boolean }) {
  const utils = trpc.useUtils();
  const partnersQ = trpc.firm.listPartners.useQuery();
  const invalidate = () => utils.firm.listPartners.invalidate();
  const remove = trpc.firm.removePartner.useMutation({ onSuccess: invalidate });

  const [p, setP] = useState({
    name: "",
    coaRegNo: "",
    pan: "",
    din: "",
    email: "",
    phone1Type: "MOBILE",
    phone1: "",
    state: "Karnataka",
    district: "",
    city: "",
  });
  const add = trpc.firm.addPartner.useMutation({
    onSuccess: () => {
      invalidate();
      setP((x) => ({
        ...x,
        name: "",
        coaRegNo: "",
        pan: "",
        din: "",
        email: "",
        phone1: "",
      }));
    },
  });
  const districts = districtsFor(p.state);

  return (
    <Stack gap={6}>
      <h2>Partners</h2>
      <TableContainer title="Partner register">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>COA no</TableHeader>
              <TableHeader>PAN</TableHeader>
              <TableHeader>DIN</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(partnersQ.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.coaRegNo ?? "—"}</TableCell>
                <TableCell>{row.pan ?? "—"}</TableCell>
                <TableCell>{row.din ?? "—"}</TableCell>
                <TableCell>{row.email ?? "—"}</TableCell>
                <TableCell>
                  {isOwner && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => remove.mutate({ id: row.id })}
                    >
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isOwner && (
        <Tile style={{ maxWidth: 760 }}>
          <Stack gap={5}>
            <h3>Add partner</h3>
            <Stack orientation="horizontal" gap={5}>
              <TextInput
                id="pt-name"
                labelText="Name"
                value={p.name}
                onChange={(e) => setP((x) => ({ ...x, name: e.target.value }))}
              />
              <TextInput
                id="pt-coa"
                labelText="COA no"
                value={p.coaRegNo}
                onChange={(e) =>
                  setP((x) => ({ ...x, coaRegNo: e.target.value }))
                }
              />
              <TextInput
                id="pt-pan"
                labelText="PAN"
                value={p.pan}
                onChange={(e) => setP((x) => ({ ...x, pan: e.target.value }))}
              />
              <TextInput
                id="pt-din"
                labelText="DIN"
                value={p.din}
                onChange={(e) => setP((x) => ({ ...x, din: e.target.value }))}
              />
            </Stack>
            <Stack orientation="horizontal" gap={5}>
              <TextInput
                id="pt-email"
                labelText="Email"
                type="email"
                value={p.email}
                onChange={(e) => setP((x) => ({ ...x, email: e.target.value }))}
              />
              <TextInput
                id="pt-phone"
                labelText="Phone"
                value={p.phone1}
                onChange={(e) =>
                  setP((x) => ({ ...x, phone1: e.target.value }))
                }
              />
              <TextInput
                id="pt-city"
                labelText="City"
                value={p.city}
                onChange={(e) => setP((x) => ({ ...x, city: e.target.value }))}
              />
              <Select
                id="pt-state"
                labelText="State"
                value={p.state}
                onChange={(e) =>
                  setP((x) => ({ ...x, state: e.target.value, district: "" }))
                }
              >
                {STATES.map((s) => (
                  <SelectItem key={s} value={s} text={s} />
                ))}
              </Select>
              {districts.length > 0 ? (
                <Select
                  id="pt-dist"
                  labelText="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                >
                  <SelectItem value="" text="Select…" />
                  {districts.map((d) => (
                    <SelectItem key={d} value={d} text={d} />
                  ))}
                </Select>
              ) : (
                <TextInput
                  id="pt-dist"
                  labelText="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                />
              )}
            </Stack>
            <Button
              disabled={!p.name || add.isPending}
              onClick={() =>
                add.mutate({
                  name: p.name,
                  coaRegNo: p.coaRegNo,
                  pan: p.pan,
                  din: p.din,
                  email: p.email,
                  phone1Type: "MOBILE",
                  phone1: p.phone1,
                  city: p.city,
                  state: p.state,
                  district: p.district,
                })
              }
            >
              {add.isPending ? "Adding…" : "Add partner"}
            </Button>
          </Stack>
        </Tile>
      )}
    </Stack>
  );
}
