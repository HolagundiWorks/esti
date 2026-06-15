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
  formatINR,
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

  const bidsQ = trpc.tenders.bids.useQuery({ tenderId: detailId ?? "" }, { enabled: !!detailId });
  const refreshDetail = () => { utils.tenders.byId.invalidate(); utils.tenders.bids.invalidate(); invalidate(); };
  const update = trpc.tenders.update.useMutation({ onSuccess: refreshDetail });
  const invite = trpc.tenders.invite.useMutation({ onSuccess: () => { refreshDetail(); setInviteId(""); } });
  const removeInvite = trpc.tenders.removeInvitation.useMutation({ onSuccess: refreshDetail });

  // bid entry
  const [bidFor, setBidFor] = useState<{ invitationId: string; contractorName: string; rupees: string; weeks: string; technical: string; notes: string } | null>(null);
  const recordBid = trpc.tenders.recordBid.useMutation({ onSuccess: () => { refreshDetail(); setBidFor(null); } });
  const removeBid = trpc.tenders.removeBid.useMutation({ onSuccess: refreshDetail });
  const bids = bidsQ.data ?? [];
  const bestAmount = bids.length ? Math.min(...bids.map((b) => b.amountPaise)) : 0;

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
                          <Button kind="ghost" size="sm"
                            onClick={() => setBidFor({ invitationId: iv.id, contractorName: iv.contractorName, rupees: "", weeks: "", technical: "", notes: "" })}>
                            {iv.status === "SUBMITTED" ? "Edit bid" : "Record bid"}
                          </Button>
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

            {bids.length > 0 && (
              <Stack gap={3}>
                <h4>Bid comparison</h4>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Contractor</TableHeader>
                      <TableHeader>Bid</TableHeader>
                      <TableHeader>Weeks</TableHeader>
                      <TableHeader>Technical</TableHeader>
                      <TableHeader></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bids.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          {b.contractorName}
                          {b.amountPaise === bestAmount && <Tag type="green" size="sm">Lowest</Tag>}
                          {b.notes && <div className="esti-label esti-label--helper">{b.notes}</div>}
                        </TableCell>
                        <TableCell>{formatINR(b.amountPaise, { paise: false })}</TableCell>
                        <TableCell>{b.completionWeeks ?? "—"}</TableCell>
                        <TableCell>{b.technicalScore != null ? `${b.technicalScore}/100` : "—"}</TableCell>
                        <TableCell>
                          <Button kind="ghost" size="sm" disabled={update.isPending}
                            onClick={() => update.mutate({ id: d.id, status: "AWARDED", awardedContractorId: b.contractorId })}>
                            Award
                          </Button>
                          <Button kind="danger--ghost" size="sm" onClick={() => removeBid.mutate({ invitationId: b.invitationId })}>Clear</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            )}

            <Button kind="danger--tertiary" size="sm" onClick={() => setConfirmDelete(true)}>Delete tender</Button>
          </Stack>
        )}
      </Modal>

      {/* record bid */}
      <Modal
        open={bidFor !== null}
        modalHeading={bidFor ? `Record bid — ${bidFor.contractorName}` : "Record bid"}
        primaryButtonText={recordBid.isPending ? "Saving…" : "Save bid"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!bidFor?.rupees || recordBid.isPending}
        onRequestClose={() => setBidFor(null)}
        onRequestSubmit={() => bidFor && recordBid.mutate({
          invitationId: bidFor.invitationId,
          amountPaise: Math.round(Number(bidFor.rupees) * 100),
          completionWeeks: bidFor.weeks ? Number(bidFor.weeks) : undefined,
          technicalScore: bidFor.technical ? Number(bidFor.technical) : undefined,
          notes: bidFor.notes || undefined,
        })}
      >
        {bidFor && (
          <Stack gap={5}>
            <TextInput id="bid-amt" labelText="Bid amount (₹)" type="number" value={bidFor.rupees}
              onChange={(e) => setBidFor({ ...bidFor, rupees: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="bid-weeks" labelText="Completion (weeks)" type="number" value={bidFor.weeks}
                onChange={(e) => setBidFor({ ...bidFor, weeks: e.target.value })} />
              <TextInput id="bid-tech" labelText="Technical score (0–100)" type="number" value={bidFor.technical}
                onChange={(e) => setBidFor({ ...bidFor, technical: e.target.value })} />
            </Stack>
            <TextArea id="bid-notes" labelText="Notes (optional)" rows={2} value={bidFor.notes}
              onChange={(e) => setBidFor({ ...bidFor, notes: e.target.value })} />
            {recordBid.error && <InlineNotification kind="error" title="Could not save bid" subtitle={recordBid.error.message} hideCloseButton lowContrast />}
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
