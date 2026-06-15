import {
  Button,
  InlineNotification,
  Modal,
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
} from "@carbon/react";
import {
  CONTRACTOR_CATEGORIES,
  ContractorCategory,
  TENDER_INVITATION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_TAG,
  TENDER_STATUS_LABEL,
  TENDER_STATUS_TAG,
  TenderStatus,
  type ContractorCategoryCode,
  type TenderInvitationStatus,
  type TenderStatus as TenderStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

export function Tenders() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("");
  const listQ = trpc.tenders.list.useQuery({ status: status ? (status as TenderStatusT) : undefined });
  const rows = listQ.data ?? [];
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });

  const invalidate = () => utils.tenders.list.invalidate();

  // create
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ projectId: "", title: "", category: "", dueDate: "", scope: "" });
  const create = trpc.tenders.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setForm({ projectId: "", title: "", category: "", dueDate: "", scope: "" }); },
  });
  const remove = trpc.tenders.remove.useMutation({ onSuccess: () => { invalidate(); setDetailId(null); } });

  // detail
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detailQ = trpc.tenders.byId.useQuery({ id: detailId ?? "" }, { enabled: !!detailId });
  const d = detailQ.data;
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true }, { enabled: !!detailId });
  const [inviteId, setInviteId] = useState("");

  const refreshDetail = () => { utils.tenders.byId.invalidate(); invalidate(); };
  const update = trpc.tenders.update.useMutation({ onSuccess: refreshDetail });
  const invite = trpc.tenders.invite.useMutation({ onSuccess: () => { refreshDetail(); setInviteId(""); } });
  const removeInvite = trpc.tenders.removeInvitation.useMutation({ onSuccess: refreshDetail });

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <Stack gap={3} className="esti-grow">
          <h1>Tenders</h1>
          <p>Tender packages and contractor invitations for project trades.</p>
        </Stack>
        <Button onClick={() => setOpen(true)}>New tender</Button>
      </Stack>

      <Stack orientation="horizontal" gap={5}>
        <Select id="td-status" labelText="Status" hideLabel size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <SelectItem value="" text="All statuses" />
          {TenderStatus.options.map((s) => <SelectItem key={s} value={s} text={TENDER_STATUS_LABEL[s]} />)}
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load tenders" subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No tenders yet", description: "Raise a tender package and invite contractors to bid.", action: <Button size="sm" onClick={() => setOpen(true)}>New tender</Button> }}
      >
        <TableContainer title="Tenders">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Tender</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Due</TableHeader>
                <TableHeader>Invited</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.title}</TableCell>
                  <TableCell><Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link></TableCell>
                  <TableCell>{t.category ? CONTRACTOR_CATEGORIES[t.category as ContractorCategoryCode] ?? t.category : "—"}</TableCell>
                  <TableCell>{t.dueDate ?? "—"}</TableCell>
                  <TableCell>{t.invitationCount}</TableCell>
                  <TableCell><Tag type={TENDER_STATUS_TAG[t.status as TenderStatusT] ?? "gray"}>{TENDER_STATUS_LABEL[t.status as TenderStatusT] ?? t.status}</Tag></TableCell>
                  <TableCell><Button kind="ghost" size="sm" onClick={() => setDetailId(t.id)}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* create */}
      <Modal
        open={open} modalHeading="New tender"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.projectId || !form.title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({
          projectId: form.projectId, title: form.title,
          category: form.category ? (form.category as ContractorCategoryCode) : undefined,
          dueDate: form.dueDate || undefined, scope: form.scope || undefined,
        })}
      >
        <Stack gap={5}>
          <Select id="td-proj" labelText="Project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />)}
          </Select>
          <TextInput id="td-title" labelText="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Stack orientation="horizontal" gap={5}>
            <Select id="td-cat" labelText="Trade category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {ContractorCategory.options.map((c) => <SelectItem key={c} value={c} text={CONTRACTOR_CATEGORIES[c]} />)}
            </Select>
            <TextInput id="td-due" labelText="Bid due date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Stack>
          <TextArea id="td-scope" labelText="Scope (optional)" rows={3} value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} />
          {create.error && <InlineNotification kind="error" title="Could not create" subtitle={create.error.message} hideCloseButton lowContrast />}
        </Stack>
      </Modal>

      {/* detail */}
      <Modal
        open={detailId !== null}
        modalHeading={d ? d.title : "Tender"}
        primaryButtonText="Close" passiveModal
        onRequestClose={() => setDetailId(null)}
      >
        {d && (
          <Stack gap={6}>
            <Stack gap={2}>
              <p>{d.projectRef} · {d.projectTitle}{d.category ? ` · ${CONTRACTOR_CATEGORIES[d.category as ContractorCategoryCode] ?? d.category}` : ""}{d.dueDate ? ` · due ${d.dueDate}` : ""}</p>
              {d.scope && <p className="esti-label esti-label--secondary">{d.scope}</p>}
            </Stack>

            <Stack gap={3}>
              <Select id="td-d-status" labelText="Status" value={d.status}
                onChange={(e) => update.mutate({ id: d.id, status: e.target.value as TenderStatusT })}>
                {TenderStatus.options.map((s) => <SelectItem key={s} value={s} text={TENDER_STATUS_LABEL[s]} />)}
              </Select>
            </Stack>

            <Stack gap={3}>
              <h4>Invited contractors</h4>
              <DataState
                loading={detailQ.isFetching && !d}
                isEmpty={d.invitations.length === 0}
                columnCount={3}
                empty={{ title: "No invitations", description: "Invite a contractor from the register below." }}
              >
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Contractor</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.invitations.map((iv) => (
                      <TableRow key={iv.id}>
                        <TableCell>
                          {iv.contractorName}
                          {d.awardedContractorId === iv.contractorId && <Tag type="green" size="sm">Awarded</Tag>}
                        </TableCell>
                        <TableCell><Tag type={TENDER_INVITATION_STATUS_TAG[iv.status as TenderInvitationStatus] ?? "gray"} size="sm">{TENDER_INVITATION_STATUS_LABEL[iv.status as TenderInvitationStatus] ?? iv.status}</Tag></TableCell>
                        <TableCell>
                          <Button kind="ghost" size="sm" disabled={update.isPending}
                            onClick={() => update.mutate({ id: d.id, status: "AWARDED", awardedContractorId: iv.contractorId })}>
                            Award
                          </Button>
                          <Button kind="danger--ghost" size="sm" onClick={() => removeInvite.mutate({ id: iv.id })}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>

              <Stack orientation="horizontal" gap={3}>
                <Select id="td-invite" labelText="Invite contractor" hideLabel size="sm" value={inviteId} onChange={(e) => setInviteId(e.target.value)}>
                  <SelectItem value="" text="— select a contractor —" />
                  {(contractorsQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id} text={`${c.name} (${CONTRACTOR_CATEGORIES[c.category as ContractorCategoryCode] ?? c.category})`} />)}
                </Select>
                <Button size="sm" disabled={!inviteId || invite.isPending} onClick={() => invite.mutate({ tenderId: d.id, contractorId: inviteId })}>Invite</Button>
              </Stack>
              {invite.error && <InlineNotification kind="error" title="Could not invite" subtitle={invite.error.message} hideCloseButton lowContrast />}
            </Stack>

            <Button kind="danger--tertiary" size="sm" onClick={() => setConfirmDelete(true)}>Delete tender</Button>
          </Stack>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete} heading="Delete tender?" body="This permanently removes the tender and its invitations."
        confirmText="Delete" pending={remove.isPending}
        onConfirm={() => { if (detailId) remove.mutate({ id: detailId }); setConfirmDelete(false); }}
        onClose={() => setConfirmDelete(false)}
      />
    </Stack>
  );
}
