import {
  Button,
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  InlineNotification,
  Loading,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import {
  CONSTRUCTION_KIND_LABEL,
  ConstructionKind,
  formatINR,
  RUNNING_BILL_STATUS_LABEL,
  TENDER_DOCUMENT_KIND_LABEL,
  TENDER_STATUS_TAG,
  tenderItemAmount,
  type ConstructionKind as ConstructionKindT,
  type RunningBillStatus,
  type TenderStatus,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";

/**
 * Login-based contractor portal. The logged-in CONTRACTOR user is scoped to a
 * contractor record (ctx.user.contractorId); all data is resolved from their
 * current tender invitation — no magic-link token.
 */
export function ContractorPortal() {
  const utils = trpc.useUtils();
  const q = trpc.contractorPortal.mySpace.useQuery(undefined, { retry: false });
  const coordQ = trpc.contractorPortal.listCoordination.useQuery(undefined, {
    enabled: !!q.data?.tender,
  });
  const docsQ = trpc.contractorPortal.projectDocuments.useQuery(undefined, {
    enabled: !!q.data?.tender,
  });
  const itemsQ = trpc.contractorPortal.tenderItems.useQuery(undefined, {
    enabled: !!q.data?.tender,
  });
  const refresh = () => {
    void utils.contractorPortal.mySpace.invalidate();
    void utils.contractorPortal.tenderItems.invalidate();
  };
  const submit = trpc.contractorPortal.submitBid.useMutation({ onSuccess: refresh });
  const submitItems = trpc.contractorPortal.submitItemBid.useMutation({ onSuccess: refresh });
  const decline = trpc.contractorPortal.decline.useMutation({ onSuccess: refresh });
  const ackDoc = trpc.contractorPortal.ackDocument.useMutation({ onSuccess: refresh });
  const submitCoord = trpc.contractorPortal.submitCoordination.useMutation({
    onSuccess: () => void utils.contractorPortal.listCoordination.invalidate(),
  });
  const billsQ = trpc.contractorPortal.listRunningBills.useQuery(undefined, {
    enabled: !!q.data?.tender,
  });
  const advanceBill = trpc.contractorPortal.advanceRunningBill.useMutation({
    onSuccess: () => void utils.contractorPortal.listRunningBills.invalidate(),
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  const [form, setForm] = useState({ rupees: "", weeks: "", technical: "", notes: "" });
  const [coordForm, setCoordForm] = useState({ kind: "RFI" as ConstructionKindT, subject: "", body: "" });
  // Item-wise rate entry — keyed by tenderItemId, rupee strings seeded from saved rates.
  const [rates, setRates] = useState<Record<string, string>>({});

  const bid = q.data?.bid;
  useEffect(() => {
    if (bid) {
      setForm({
        rupees: bid.amountPaise ? String(Math.round(bid.amountPaise / 100)) : "",
        weeks: bid.completionWeeks != null ? String(bid.completionWeeks) : "",
        technical: bid.technicalScore != null ? String(bid.technicalScore) : "",
        notes: bid.notes ?? "",
      });
    }
  }, [bid]);

  const boqItems = itemsQ.data?.items ?? [];
  const hasItems = boqItems.length > 0;
  useEffect(() => {
    if (boqItems.length > 0) {
      setRates((prev) => {
        const next = { ...prev };
        for (const it of boqItems) {
          if (next[it.id] === undefined) next[it.id] = it.ratePaise != null ? String(it.ratePaise / 100) : "";
        }
        return next;
      });
    }
  }, [boqItems]);
  const itemBidTotal = boqItems.reduce(
    (sum, it) => sum + tenderItemAmount(it.qty, Math.round(Number(rates[it.id] || 0) * 100)),
    0,
  );

  const d = q.data;
  const firm = d?.firmName ?? "ESTI";
  // On the firm's Lite plan the portal is view-only — hide every write control.
  const readOnly = d?.readOnly ?? false;

  return (
    <>
      <Header aria-label="Contractor portal">
        <HeaderName prefix={firm}>Contractor portal</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Sign out" onClick={() => logout.mutate()}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <Content>
        {q.isLoading ? (
          <Loading withOverlay={false} description="Loading…" />
        ) : q.error || !d ? (
          <InlineNotification
            kind="error"
            title="Could not load your portal"
            subtitle={q.error?.message ?? "Please try again, or contact the firm."}
            hideCloseButton
            lowContrast
          />
        ) : !d.tender ? (
          <Stack gap={4}>
            <h2>Welcome{d.contractorName ? `, ${d.contractorName}` : ""}</h2>
            <InlineNotification
              kind="info"
              title="No tender assigned yet"
              subtitle="When the firm invites you to a tender, it will appear here."
              hideCloseButton
              lowContrast
            />
          </Stack>
        ) : (
          <Stack gap={6}>
            {readOnly && (
              <InlineNotification
                kind="info"
                title="View-only access"
                subtitle="You can review your tender, documents and bills here. Bidding and acknowledgements are managed directly with the firm."
                hideCloseButton
                lowContrast
              />
            )}
            <Stack gap={2}>
              <h2>{d.tender.title}</h2>
              <p>
                {d.tender.projectRef} · {d.tender.projectTitle}
                {d.tender.dueDate ? ` · bids due ${d.tender.dueDate}` : ""} ·{" "}
                <Tag type={TENDER_STATUS_TAG[d.tender.status as TenderStatus] ?? "gray"} size="sm">
                  {d.tender.statusLabel}
                </Tag>
              </p>
              <p className="esti-label esti-label--secondary">Signed in as {d.contractorName}</p>
            </Stack>

            {d.tender.scope && (
              <Tile>
                <Stack gap={3}>
                  <h4>Scope</h4>
                  <p>{d.tender.scope}</p>
                </Stack>
              </Tile>
            )}

            {d.tender.instructions && (
              <Tile>
                <Stack gap={3}>
                  <h4>Instructions</h4>
                  <p>{d.tender.instructions}</p>
                </Stack>
              </Tile>
            )}

            {d.documents.length > 0 && (
              <Tile>
                <Stack gap={4}>
                  <h4>Tender documents</h4>
                  {d.documents.map((doc) => (
                    <Stack key={doc.id} orientation="horizontal" gap={3}>
                      <span>
                        {doc.title}
                        {doc.addendumNo != null && <Tag type="purple" size="sm">Addendum {doc.addendumNo}</Tag>}
                        {" · "}
                        {TENDER_DOCUMENT_KIND_LABEL[doc.kind as keyof typeof TENDER_DOCUMENT_KIND_LABEL] ?? doc.kind}
                      </span>
                      {doc.downloadUrl && (
                        <a href={doc.downloadUrl} target="_blank" rel="noreferrer">Download</a>
                      )}
                      {!readOnly && doc.requiresAck && !doc.acknowledged && (
                        <Button size="sm" kind="tertiary" disabled={ackDoc.isPending} onClick={() => ackDoc.mutate({ documentId: doc.id })}>
                          Acknowledge addendum
                        </Button>
                      )}
                      {doc.acknowledged && <Tag type="green" size="sm">Acknowledged</Tag>}
                    </Stack>
                  ))}
                  {d.pendingAddendaCount > 0 && (
                    <InlineNotification kind="warning" title="Addenda pending" subtitle="Acknowledge all addenda before submitting your bid." hideCloseButton lowContrast />
                  )}
                </Stack>
              </Tile>
            )}

            {!d.tender.open ? (
              <InlineNotification
                kind="info"
                title="Not open for bids"
                subtitle="This tender is not currently accepting bids."
                hideCloseButton
                lowContrast
              />
            ) : null}

            {!readOnly && hasItems && (
            <Tile>
              <Stack gap={5}>
                <h4>{bid ? "Your item rates" : "Quote your rates"}</h4>
                <p className="esti-label esti-label--secondary">Enter a rate per BOQ line — your total is calculated for you.</p>
                <Table size="lg">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Rate (₹)</TableHeader>
                      <TableHeader>Amount</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {boqItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.qty} {it.unit}</TableCell>
                        <TableCell>
                          <TextInput id={`r-${it.id}`} labelText="Rate" hideLabel type="number" size="lg" disabled={!d.tender.open}
                            value={rates[it.id] ?? ""} onChange={(e) => setRates((p) => ({ ...p, [it.id]: e.target.value }))} />
                        </TableCell>
                        <TableCell>{formatINR(tenderItemAmount(it.qty, Math.round(Number(rates[it.id] || 0) * 100)), { paise: false })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p><strong>Total: {formatINR(itemBidTotal, { paise: false })}</strong></p>
                <Stack gap={3}>
                  <Button size="lg"
                    disabled={!d.tender.open || submitItems.isPending || d.pendingAddendaCount > 0 || boqItems.every((it) => !rates[it.id])}
                    onClick={() => submitItems.mutate({ items: boqItems.map((it) => ({ tenderItemId: it.id, ratePaise: Math.round(Number(rates[it.id] || 0) * 100) })) })}
                  >
                    {submitItems.isPending ? "Submitting…" : bid ? "Update rates" : "Submit rates"}
                  </Button>
                  {d.tender.open && (
                    <Button size="lg" kind="danger--tertiary" disabled={decline.isPending} onClick={() => decline.mutate()}>
                      Decline invitation
                    </Button>
                  )}
                </Stack>
                {submitItems.error && <InlineNotification kind="error" title="Could not submit" subtitle={submitItems.error.message} hideCloseButton lowContrast />}
              </Stack>
            </Tile>
            )}

            {!readOnly && !hasItems && (
            <Tile>
              <Stack gap={5}>
                <h4>{bid ? "Your bid" : "Submit your bid"}</h4>
                <TextInput id="bid-amount" labelText="Bid amount (₹)" type="number" value={form.rupees} disabled={!d.tender.open} onChange={(e) => setForm((f) => ({ ...f, rupees: e.target.value }))} />
                <Stack orientation="horizontal" gap={5}>
                  <TextInput id="bid-weeks" labelText="Completion (weeks)" type="number" value={form.weeks} disabled={!d.tender.open} onChange={(e) => setForm((f) => ({ ...f, weeks: e.target.value }))} />
                  <TextInput id="bid-technical" labelText="Technical score (0–100)" type="number" value={form.technical} disabled={!d.tender.open} onChange={(e) => setForm((f) => ({ ...f, technical: e.target.value }))} />
                </Stack>
                <TextArea id="bid-notes" labelText="Notes (optional)" rows={3} value={form.notes} disabled={!d.tender.open} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                <Stack orientation="horizontal" gap={3}>
                  <Button
                    disabled={!d.tender.open || !form.rupees || submit.isPending || d.pendingAddendaCount > 0}
                    onClick={() =>
                      submit.mutate({
                        amountPaise: Math.round(Number(form.rupees) * 100),
                        completionWeeks: form.weeks ? Number(form.weeks) : undefined,
                        technicalScore: form.technical ? Number(form.technical) : undefined,
                        notes: form.notes || undefined,
                      })
                    }
                  >
                    {submit.isPending ? "Submitting…" : bid ? "Update bid" : "Submit bid"}
                  </Button>
                  {d.tender.open && (
                    <Button kind="danger--tertiary" disabled={decline.isPending} onClick={() => decline.mutate()}>
                      Decline invitation
                    </Button>
                  )}
                </Stack>
                {submit.error && <InlineNotification kind="error" title="Could not submit" subtitle={submit.error.message} hideCloseButton lowContrast />}
              </Stack>
            </Tile>
            )}

            <Tile>
              <Stack gap={4}>
                <h4>Issued drawings &amp; transmittals</h4>
                {(docsQ.data?.drawings.length ?? 0) === 0 && (docsQ.data?.transmittals.length ?? 0) === 0 ? (
                  <p className="esti-label esti-label--secondary">No issued drawings or transmittals yet.</p>
                ) : (
                  <>
                    {(docsQ.data?.drawings ?? []).length > 0 && (
                      <Stack gap={2}>
                        <p className="esti-label">Drawings</p>
                        {docsQ.data!.drawings.map((dr) => (
                          <p key={dr.id}><Tag size="sm">{dr.ref}</Tag> {dr.title}</p>
                        ))}
                      </Stack>
                    )}
                    {(docsQ.data?.transmittals ?? []).length > 0 && (
                      <Stack gap={2}>
                        <p className="esti-label">Transmittals</p>
                        {docsQ.data!.transmittals.map((t) => (
                          <p key={t.ref}>
                            <Tag size="sm">{t.ref}</Tag> {t.purpose} · {t.channel}
                            {t.dateIssued ? ` · ${t.dateIssued}` : ""}
                          </p>
                        ))}
                      </Stack>
                    )}
                  </>
                )}
              </Stack>
            </Tile>

            <Tile>
              <Stack gap={4}>
                <h4>Running bills &amp; measurements</h4>
                <p className="esti-label">
                  The site team sends measurements here. Agree them to pass them to the office;
                  once the office approves the calculations, raise your bill on the approved quantities.
                </p>
                {(billsQ.data ?? []).length === 0 ? (
                  <p className="esti-label esti-label--secondary">
                    No measurements yet. When the site team sends one, it appears here for you to verify.
                  </p>
                ) : (
                  (billsQ.data ?? []).map((b) => {
                    const canVerify = b.status === "SENT_TO_CONTRACTOR";
                    const canInvoice = b.status === "APPROVED_MEASUREMENT_SENT";
                    return (
                      <Tile key={b.id}>
                        <Stack gap={3}>
                          <Stack orientation="horizontal" gap={3}>
                            <strong>{b.ref}</strong>
                            <span>{b.title}</span>
                            <Tag size="sm">
                              {RUNNING_BILL_STATUS_LABEL[b.status as RunningBillStatus] ?? b.status}
                            </Tag>
                            {b.measurementDate && (
                              <span className="esti-label esti-label--secondary">{b.measurementDate}</span>
                            )}
                          </Stack>
                          {b.items.map((it, i) => (
                            <Stack key={i} orientation="horizontal" gap={3}>
                              <span>{it.description}</span>
                              <span className="esti-label esti-label--secondary">
                                {it.qty} {it.unit} × {formatINR(it.ratePaise, { paise: false })}
                              </span>
                              <span>{formatINR(it.amountPaise, { paise: false })}</span>
                              {it.boqItemId && (
                                <Tag size="sm" type={it.balanceQty <= 0 ? "green" : "outline"}>
                                  Balance {it.balanceQty} {it.unit}
                                </Tag>
                              )}
                            </Stack>
                          ))}
                          <p><strong>Total: {formatINR(b.totalPaise, { paise: false })}</strong></p>
                          {!readOnly && canVerify && (
                            <div>
                              <Button
                                size="sm"
                                disabled={advanceBill.isPending}
                                onClick={() => advanceBill.mutate({ id: b.id, status: "CONTRACTOR_VERIFIED" })}
                              >
                                Agree measurement &amp; send to office
                              </Button>
                            </div>
                          )}
                          {!readOnly && canInvoice && (
                            <div>
                              <Button
                                size="sm"
                                disabled={advanceBill.isPending}
                                onClick={() => advanceBill.mutate({ id: b.id, status: "CONTRACTOR_INVOICED" })}
                              >
                                Raise &amp; submit bill ({formatINR(b.totalPaise, { paise: false })})
                              </Button>
                            </div>
                          )}
                          {(readOnly || (!canVerify && !canInvoice)) && (
                            <p className="esti-label esti-label--secondary">
                              Waiting on the office — no action needed from you right now.
                            </p>
                          )}
                        </Stack>
                      </Tile>
                    );
                  })
                )}
                {advanceBill.error && (
                  <InlineNotification kind="error" title="Could not update" subtitle={advanceBill.error.message} hideCloseButton lowContrast />
                )}
              </Stack>
            </Tile>

            <Tile>
              <Stack gap={4}>
                <h4>Site coordination</h4>
                <p className="esti-label">{readOnly ? "Coordination items raised with the firm." : "Raise a query, RFI, submittal, inspection request, snag, or NCR to the firm."}</p>
                {(coordQ.data ?? []).slice(0, 5).map((c) => (
                  <p key={c.id}>
                    <Tag size="sm">{CONSTRUCTION_KIND_LABEL[c.kind as ConstructionKindT] ?? c.kind}</Tag> {c.subject} — {c.status}
                  </p>
                ))}
                {!readOnly && (
                  <>
                    <Select id="coord-kind" labelText="Kind" value={coordForm.kind} onChange={(e) => setCoordForm((f) => ({ ...f, kind: e.target.value as ConstructionKindT }))}>
                      {ConstructionKind.options.map((k) => <SelectItem key={k} value={k} text={CONSTRUCTION_KIND_LABEL[k]} />)}
                    </Select>
                    <TextInput id="coord-subj" labelText="Subject" value={coordForm.subject} onChange={(e) => setCoordForm((f) => ({ ...f, subject: e.target.value }))} />
                    <TextArea id="coord-body" labelText="Details" rows={3} value={coordForm.body} onChange={(e) => setCoordForm((f) => ({ ...f, body: e.target.value }))} />
                    <Button
                      size="sm"
                      disabled={!coordForm.subject.trim() || submitCoord.isPending}
                      onClick={() => submitCoord.mutate({ kind: coordForm.kind, subject: coordForm.subject, body: coordForm.body || undefined })}
                    >
                      Submit to firm
                    </Button>
                  </>
                )}
              </Stack>
            </Tile>
          </Stack>
        )}
      </Content>
    </>
  );
}
