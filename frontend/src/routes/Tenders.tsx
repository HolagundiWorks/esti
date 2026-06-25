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
  tenderItemAmount,
  TENDER_INVITATION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_TAG,
  TENDER_STATUS_LABEL,
  TENDER_STATUS_TAG,
  TENDER_DOCUMENT_KIND_LABEL,
  TenderDocumentKind,
  TenderStatus,
  type ContractorCategoryCode,
  type TenderInvitationStatus,
  type TenderStatus as TenderStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

export function Tenders() {
  const utils = trpc.useUtils();
  const { authorizedFetch } = useUploadAuth();
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
  const removeDoc = trpc.tenders.removeDocument.useMutation({ onSuccess: refreshDetail });
  const docsQ = trpc.tenders.listDocuments.useQuery({ tenderId: detailId ?? "" }, { enabled: !!detailId });

  // BOQ — item-wise tendering (Construction Cost OS Phase A+B)
  const itemsQ = trpc.tenders.items.useQuery({ tenderId: detailId ?? "" }, { enabled: !!detailId });
  const compareQ = trpc.tenders.compareItems.useQuery({ tenderId: detailId ?? "" }, { enabled: !!detailId });
  const items = itemsQ.data ?? [];
  const hasItems = items.length > 0;
  const projectIdForDetail = d?.projectId ?? "";
  const estimatesQ = trpc.estimates.listByProject.useQuery(
    { projectId: projectIdForDetail },
    { enabled: !!projectIdForDetail },
  );
  const frozenEstimates = (estimatesQ.data ?? []).filter(
    (e) => e.status === "DESIGN_FROZEN" || e.status === "EXECUTION_FROZEN",
  );
  const [boqEstimateId, setBoqEstimateId] = useState("");
  const versionsForBoqQ = trpc.estimation.versions.useQuery({ estimateId: boqEstimateId }, { enabled: !!boqEstimateId });
  const frozenBoqVersions = (versionsForBoqQ.data ?? []).filter(
    (v) => v.status === "DESIGN_FROZEN" || v.status === "EXECUTION_FROZEN",
  );
  const [boqVersionId, setBoqVersionId] = useState("");
  const refreshItems = () => {
    utils.tenders.items.invalidate();
    utils.tenders.compareItems.invalidate();
    refreshDetail();
  };
  const buildItems = trpc.tenders.createItemsFromEstimate.useMutation({
    onSuccess: () => { refreshItems(); setBoqEstimateId(""); setBoqVersionId(""); },
  });
  const [newItem, setNewItem] = useState({ description: "", unit: "", qty: "", estRupees: "" });
  const addItem = trpc.tenders.addItem.useMutation({
    onSuccess: () => { refreshItems(); setNewItem({ description: "", unit: "", qty: "", estRupees: "" }); },
  });
  const removeItemM = trpc.tenders.removeItem.useMutation({ onSuccess: refreshItems });
  const [itemBidFor, setItemBidFor] = useState<{ invitationId: string; contractorName: string; rates: Record<string, string> } | null>(null);
  const recordItemBid = trpc.tenders.recordItemBid.useMutation({ onSuccess: () => { refreshItems(); setItemBidFor(null); } });
  const award = trpc.tenders.award.useMutation({ onSuccess: refreshItems });

  function exportItemComparison() {
    const data = compareQ.data;
    if (!data || data.sealed) return;
    const rows = data.lines.map((ln) => {
      const row: Record<string, string | number> = { Item: ln.description, Unit: ln.unit, Qty: ln.qty };
      data.contractors.forEach((c) => {
        const cell = ln.cells.find((x) => x.invitationId === c.invitationId);
        row[c.contractorName] = cell?.amountPaise != null ? (cell.amountPaise / 100).toFixed(2) : "";
      });
      return row;
    });
    const totalRow: Record<string, string | number> = { Item: "TOTAL", Unit: "", Qty: "" };
    data.contractors.forEach((c) => {
      const t = data.totals.find((x) => x.invitationId === c.invitationId);
      totalRow[c.contractorName] = t ? (t.totalPaise / 100).toFixed(2) : "";
    });
    rows.push(totalRow);
    downloadXlsx(rows, "Item bids", `${d?.title ?? "tender"}-item-bids`);
  }

  const bids = bidsQ.data ?? [];
  const sealed = bids.length > 0 && bids[0]?.sealed === true;
  const bestAmount =
    !sealed && bids.length ? Math.min(...bids.map((b) => b.amountPaise ?? Number.MAX_SAFE_INTEGER)) : 0;
  const [docUpload, setDocUpload] = useState({ title: "", kind: "OTHER", addendumNo: "", file: null as File | null });
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  async function uploadDocument() {
    if (!detailId || !docUpload.file || !docUpload.title.trim()) return;
    setDocUploading(true);
    setDocError(null);
    try {
      const res = await authorizedFetch("/upload/tender-document", (fd) => {
        fd.append("tenderId", detailId);
        fd.append("title", docUpload.title.trim());
        fd.append("kind", docUpload.kind);
        if (docUpload.addendumNo) fd.append("addendumNo", docUpload.addendumNo);
        fd.append("file", docUpload.file!);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
      setDocUpload({ title: "", kind: "OTHER", addendumNo: "", file: null });
      await refreshDetail();
      await utils.tenders.listDocuments.invalidate({ tenderId: detailId });
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setDocUploading(false);
    }
  }

  return (
    <Stack gap={6}>
      <PageHeader
        title="Tenders"
        description="Tender packages and contractor invitations for project trades."
        actions={<Button onClick={() => setOpen(true)}>New tender</Button>}
      />

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
              {d.instructions && <p className="esti-label esti-label--secondary">{d.instructions}</p>}
            </Stack>

            <Stack gap={3}>
              <h4>Tender documents</h4>
              {(docsQ.data ?? d.documents ?? []).length === 0 && (
                <p className="esti-label">No documents yet — upload drawings, BOQ, or addenda.</p>
              )}
              {(docsQ.data ?? d.documents ?? []).map((doc) => (
                <Stack key={doc.id} orientation="horizontal" gap={3}>
                  <span>
                    {doc.title}
                    {doc.addendumNo != null && <Tag type="purple" size="sm">Addendum {doc.addendumNo}</Tag>}
                    {" · "}
                    {TENDER_DOCUMENT_KIND_LABEL[doc.kind as keyof typeof TENDER_DOCUMENT_KIND_LABEL] ?? doc.kind}
                  </span>
                  {"downloadUrl" in doc && doc.downloadUrl ? (
                    <a href={doc.downloadUrl as string} target="_blank" rel="noreferrer">Download</a>
                  ) : null}
                  <Button kind="danger--ghost" size="sm" onClick={() => removeDoc.mutate({ id: doc.id })}>Remove</Button>
                </Stack>
              ))}
              <Stack orientation="horizontal" gap={3}>
                <TextInput id="doc-title" labelText="Document title" hideLabel placeholder="Title" value={docUpload.title} onChange={(e) => setDocUpload((f) => ({ ...f, title: e.target.value }))} />
                <Select id="doc-kind" labelText="Kind" hideLabel size="sm" value={docUpload.kind} onChange={(e) => setDocUpload((f) => ({ ...f, kind: e.target.value }))}>
                  {TenderDocumentKind.options.map((k) => <SelectItem key={k} value={k} text={TENDER_DOCUMENT_KIND_LABEL[k]} />)}
                </Select>
                <TextInput id="doc-add" labelText="Addendum #" hideLabel placeholder="Addendum #" value={docUpload.addendumNo} onChange={(e) => setDocUpload((f) => ({ ...f, addendumNo: e.target.value }))} />
                <input type="file" onChange={(e) => setDocUpload((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                <Button size="sm" disabled={docUploading || !docUpload.file || !docUpload.title} onClick={() => void uploadDocument()}>{docUploading ? "Uploading…" : "Upload"}</Button>
              </Stack>
              {docError && <InlineNotification kind="error" title="Upload failed" subtitle={docError} hideCloseButton lowContrast />}
            </Stack>

            <Stack gap={3}>
              <Select id="td-d-status" labelText="Status" value={d.status}
                onChange={(e) => update.mutate({ id: d.id, status: e.target.value as TenderStatusT })}>
                {TenderStatus.options.map((s) => <SelectItem key={s} value={s} text={TENDER_STATUS_LABEL[s]} />)}
              </Select>
            </Stack>

            <Stack gap={3}>
              <h4>BOQ (item-wise tender)</h4>
              {!hasItems && d.status === "DRAFT" && (
                <Stack gap={3}>
                  <p className="esti-label esti-label--secondary">
                    Carve BOQ lines from a frozen estimate so contractors quote a rate per item, or add lines manually below. An item-wise tender can be awarded into a work package.
                  </p>
                  {frozenEstimates.length === 0 ? (
                    <InlineNotification kind="info" lowContrast hideCloseButton title="No frozen estimate"
                      subtitle="Freeze a design or execution estimate on this project to build the tender BOQ from it." />
                  ) : (
                    <Stack orientation="horizontal" gap={3}>
                      <Select id="boq-est" labelText="Frozen estimate" hideLabel size="sm" value={boqEstimateId}
                        onChange={(e) => { setBoqEstimateId(e.target.value); setBoqVersionId(""); }}>
                        <SelectItem value="" text="Select estimate…" />
                        {frozenEstimates.map((e) => <SelectItem key={e.id} value={e.id} text={`${e.ref} — ${e.title}`} />)}
                      </Select>
                      <Select id="boq-ver" labelText="Frozen version" hideLabel size="sm" disabled={!boqEstimateId} value={boqVersionId}
                        onChange={(e) => setBoqVersionId(e.target.value)}>
                        <SelectItem value="" text="Select version…" />
                        {frozenBoqVersions.map((v) => <SelectItem key={v.id} value={v.id} text={`v${v.versionNo} · ${v.stage}`} />)}
                      </Select>
                      <Button size="sm" disabled={!boqVersionId || buildItems.isPending}
                        onClick={() => buildItems.mutate({ tenderId: d.id, estimateVersionId: boqVersionId })}>
                        {buildItems.isPending ? "Building…" : "Build BOQ"}
                      </Button>
                    </Stack>
                  )}
                  {buildItems.error && <InlineNotification kind="error" title="Could not build BOQ" subtitle={buildItems.error.message} hideCloseButton lowContrast />}
                </Stack>
              )}

              {hasItems && (
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>Unit</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Est. rate</TableHeader>
                      {d.status === "DRAFT" && <TableHeader></TableHeader>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.unit}</TableCell>
                        <TableCell>{it.qty}</TableCell>
                        <TableCell>{formatINR(it.estRatePaise, { paise: false })}</TableCell>
                        {d.status === "DRAFT" && (
                          <TableCell>
                            <Button kind="danger--ghost" size="sm" onClick={() => removeItemM.mutate({ id: it.id })}>Remove</Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {d.status === "DRAFT" && (
                <Stack orientation="horizontal" gap={3}>
                  <TextInput id="ni-desc" labelText="Description" hideLabel placeholder="Add a line — description" value={newItem.description}
                    onChange={(e) => setNewItem((f) => ({ ...f, description: e.target.value }))} />
                  <TextInput id="ni-unit" labelText="Unit" hideLabel placeholder="Unit" value={newItem.unit}
                    onChange={(e) => setNewItem((f) => ({ ...f, unit: e.target.value }))} />
                  <TextInput id="ni-qty" labelText="Qty" hideLabel placeholder="Qty" type="number" value={newItem.qty}
                    onChange={(e) => setNewItem((f) => ({ ...f, qty: e.target.value }))} />
                  <TextInput id="ni-rate" labelText="Est ₹" hideLabel placeholder="Est. rate ₹" type="number" value={newItem.estRupees}
                    onChange={(e) => setNewItem((f) => ({ ...f, estRupees: e.target.value }))} />
                  <Button size="sm"
                    disabled={!newItem.description.trim() || !newItem.unit.trim() || !newItem.qty || addItem.isPending}
                    onClick={() => addItem.mutate({
                      tenderId: d.id, description: newItem.description.trim(), unit: newItem.unit.trim(),
                      qty: Number(newItem.qty), estRatePaise: newItem.estRupees ? Math.round(Number(newItem.estRupees) * 100) : 0,
                    })}>
                    Add line
                  </Button>
                </Stack>
              )}
              {addItem.error && <InlineNotification kind="error" title="Could not add line" subtitle={addItem.error.message} hideCloseButton lowContrast />}
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
                          {hasItems ? (
                            <Button kind="ghost" size="sm" disabled={d.status === "AWARDED"}
                              onClick={() => setItemBidFor({ invitationId: iv.id, contractorName: iv.contractorName, rates: {} })}>
                              {iv.status === "SUBMITTED" ? "Edit rates" : "Enter rates"}
                            </Button>
                          ) : (
                            <>
                              <Button kind="ghost" size="sm"
                                onClick={() => setBidFor({ invitationId: iv.id, contractorName: iv.contractorName, rupees: "", weeks: "", technical: "", notes: "" })}>
                                {iv.status === "SUBMITTED" ? "Edit bid" : "Record bid"}
                              </Button>
                              <Button kind="ghost" size="sm" disabled={update.isPending}
                                onClick={() => update.mutate({ id: d.id, status: "AWARDED", awardedContractorId: iv.contractorId })}>
                                Award
                              </Button>
                            </>
                          )}
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

            {!hasItems && bids.length > 0 && (
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Bid comparison</h4>
                  {sealed ? (
                    <Tag type="blue" size="sm">Sealed — close tender to reveal amounts</Tag>
                  ) : (
                    <Button
                      size="sm"
                      kind="ghost"
                      onClick={() => {
                        void utils.tenders.exportComparison.fetch({ tenderId: d.id }).then((data) => {
                          if (data.rows.length) downloadXlsx(data.rows, "Bids", `${data.title}-bids`);
                        });
                      }}
                    >
                      Export XLSX
                    </Button>
                  )}
                </Stack>
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
                          {!sealed && b.amountPaise === bestAmount && b.amountPaise != null && (
                            <Tag type="green" size="sm">Lowest</Tag>
                          )}
                          {b.notes && !sealed && <div className="esti-label esti-label--helper">{b.notes}</div>}
                          {sealed && (
                            <Tag type={b.invitationStatus === "SUBMITTED" ? "green" : "gray"} size="sm">
                              {b.invitationStatus === "SUBMITTED" ? "Bid received" : "Pending"}
                            </Tag>
                          )}
                        </TableCell>
                        <TableCell>{sealed || b.amountPaise == null ? "Sealed" : formatINR(b.amountPaise, { paise: false })}</TableCell>
                        <TableCell>{sealed ? "—" : (b.completionWeeks ?? "—")}</TableCell>
                        <TableCell>{sealed ? "—" : (b.technicalScore != null ? `${b.technicalScore}/100` : "—")}</TableCell>
                        <TableCell>
                          {!sealed && (
                            <>
                              <Button kind="ghost" size="sm" disabled={update.isPending}
                                onClick={() => update.mutate({ id: d.id, status: "AWARDED", awardedContractorId: b.contractorId })}>
                                Award
                              </Button>
                              <Button kind="danger--ghost" size="sm" onClick={() => removeBid.mutate({ invitationId: b.invitationId })}>Clear</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            )}

            {hasItems && compareQ.data && (
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Item bid comparison</h4>
                  {compareQ.data.sealed ? (
                    <Tag type="blue" size="sm">Sealed — close tender to reveal rates</Tag>
                  ) : (
                    <Button size="sm" kind="ghost" onClick={exportItemComparison}>Export XLSX</Button>
                  )}
                </Stack>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>Unit</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      {compareQ.data.contractors.map((c) => <TableHeader key={c.invitationId}>{c.contractorName}</TableHeader>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {compareQ.data.sealed ? (
                      <TableRow>
                        <TableCell>Rates are sealed until the tender is closed.</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        {compareQ.data.contractors.map((c) => <TableCell key={c.invitationId}>Sealed</TableCell>)}
                      </TableRow>
                    ) : (
                      compareQ.data.lines.map((ln) => (
                        <TableRow key={ln.tenderItemId}>
                          <TableCell>{ln.description}</TableCell>
                          <TableCell>{ln.unit}</TableCell>
                          <TableCell>{ln.qty}</TableCell>
                          {compareQ.data!.contractors.map((c) => {
                            const cell = ln.cells.find((x) => x.invitationId === c.invitationId);
                            const lowest = ln.lowestInvitationIds.includes(c.invitationId);
                            return (
                              <TableCell key={c.invitationId}>
                                {cell?.amountPaise != null ? (
                                  <>
                                    {formatINR(cell.amountPaise, { paise: false })}
                                    {lowest && <Tag type="green" size="sm">Low</Tag>}
                                  </>
                                ) : "—"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {!compareQ.data.sealed && compareQ.data.totals.length > 0 && (
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Rank</TableHeader>
                        <TableHeader>Contractor</TableHeader>
                        <TableHeader>Total</TableHeader>
                        <TableHeader></TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {compareQ.data.totals.map((t) => (
                        <TableRow key={t.invitationId}>
                          <TableCell>{t.rank}</TableCell>
                          <TableCell>{t.contractorName}{t.lowest && <Tag type="green" size="sm">Lowest</Tag>}</TableCell>
                          <TableCell>{formatINR(t.totalPaise, { paise: false })}</TableCell>
                          <TableCell>
                            <Button kind="primary" size="sm" disabled={d.status !== "CLOSED" || award.isPending}
                              onClick={() => award.mutate({ tenderId: d.id, contractorId: t.contractorId })}>
                              Award → work package
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!compareQ.data.sealed && d.status !== "CLOSED" && d.status !== "AWARDED" && (
                  <p className="esti-label esti-label--helper">Close the tender to award the lowest bidder and create the work package.</p>
                )}
                {award.error && <InlineNotification kind="error" title="Could not award" subtitle={award.error.message} hideCloseButton lowContrast />}
                {award.data && (
                  <InlineNotification kind="success" lowContrast hideCloseButton title="Work package created"
                    subtitle={`${award.data.ref} created — open the project's costing tab to manage running bills.`} />
                )}
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

      {/* item-wise rate entry */}
      <Modal
        open={itemBidFor !== null}
        modalHeading={itemBidFor ? `Item rates — ${itemBidFor.contractorName}` : "Item rates"}
        primaryButtonText={recordItemBid.isPending ? "Saving…" : "Save rates"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!itemBidFor || recordItemBid.isPending || items.length === 0}
        onRequestClose={() => setItemBidFor(null)}
        onRequestSubmit={() => {
          if (!itemBidFor) return;
          recordItemBid.mutate({
            invitationId: itemBidFor.invitationId,
            items: items.map((it) => ({ tenderItemId: it.id, ratePaise: Math.round(Number(itemBidFor.rates[it.id] || 0) * 100) })),
          });
        }}
      >
        {itemBidFor && (
          <Stack gap={5}>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Item</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate (₹)</TableHeader>
                  <TableHeader>Amount</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                    <TableCell>
                      <TextInput id={`rate-${it.id}`} labelText="Rate" hideLabel type="number" size="sm"
                        value={itemBidFor.rates[it.id] ?? ""}
                        onChange={(e) => setItemBidFor({ ...itemBidFor, rates: { ...itemBidFor.rates, [it.id]: e.target.value } })} />
                    </TableCell>
                    <TableCell>{formatINR(tenderItemAmount(it.qty, Math.round(Number(itemBidFor.rates[it.id] || 0) * 100)), { paise: false })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p>
              <strong>
                Total: {formatINR(items.reduce((s, it) => s + tenderItemAmount(it.qty, Math.round(Number(itemBidFor.rates[it.id] || 0) * 100)), 0), { paise: false })}
              </strong>
            </p>
            {recordItemBid.error && <InlineNotification kind="error" title="Could not save rates" subtitle={recordItemBid.error.message} hideCloseButton lowContrast />}
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
