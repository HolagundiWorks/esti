import {
  Button,
  Content,
  Header,
  HeaderName,
  InlineNotification,
  Loading,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  CONSTRUCTION_KIND_LABEL,
  ConstructionKind,
  formatINR,
  TENDER_DOCUMENT_KIND_LABEL,
  TENDER_STATUS_TAG,
  type ConstructionKind as ConstructionKindT,
  type TenderStatus,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

export function ContractorBidPortal() {
  const { token = "" } = useParams();
  const utils = trpc.useUtils();
  const q = trpc.contractorPortal.byToken.useQuery({ token }, { enabled: token.length > 0, retry: false });
  const coordQ = trpc.contractorPortal.listCoordination.useQuery({ token }, { enabled: token.length > 0 });
  const docsQ = trpc.contractorPortal.projectDocuments.useQuery({ token }, { enabled: token.length > 0 });
  const submit = trpc.contractorPortal.submitBid.useMutation({
    onSuccess: () => utils.contractorPortal.byToken.invalidate(),
  });
  const decline = trpc.contractorPortal.decline.useMutation({
    onSuccess: () => utils.contractorPortal.byToken.invalidate(),
  });
  const ackDoc = trpc.contractorPortal.ackDocument.useMutation({
    onSuccess: () => utils.contractorPortal.byToken.invalidate(),
  });
  const submitCoord = trpc.contractorPortal.submitCoordination.useMutation({
    onSuccess: () => {
      void utils.contractorPortal.listCoordination.invalidate();
    },
  });

  const [form, setForm] = useState({ rupees: "", weeks: "", technical: "", notes: "" });
  const [coordForm, setCoordForm] = useState({ kind: "RFI" as ConstructionKindT, subject: "", body: "" });

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

  const d = q.data;
  const firm = d?.firmName ?? "ESTI";

  return (
    <>
      <Header aria-label="Contractor bid portal">
        <HeaderName prefix={firm}>Tender bid</HeaderName>
      </Header>
      <Content>
        {q.isLoading ? (
          <Loading withOverlay={false} description="Loading tender…" />
        ) : q.error || !d ? (
          <InlineNotification
            kind="error"
            title="Bid link not valid"
            subtitle={q.error?.message ?? "This bid link is invalid or has expired. Ask the firm for a new link."}
            hideCloseButton
            lowContrast
          />
        ) : (
          <Stack gap={6}>
            <Stack gap={2}>
              <h2>{d.tender.title}</h2>
              <p>
                {d.tender.projectRef} · {d.tender.projectTitle}
                {d.tender.dueDate ? ` · bids due ${d.tender.dueDate}` : ""} ·{" "}
                <Tag type={TENDER_STATUS_TAG[d.tender.status as TenderStatus] ?? "gray"} size="sm">
                  {d.tender.statusLabel}
                </Tag>
              </p>
              <p className="esti-label esti-label--secondary">Bidding as {d.contractorName}</p>
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
                      {doc.requiresAck && !doc.acknowledged && (
                        <Button size="sm" kind="tertiary" disabled={ackDoc.isPending} onClick={() => ackDoc.mutate({ token, documentId: doc.id })}>
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
                        token,
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
                    <Button kind="danger--tertiary" disabled={decline.isPending} onClick={() => decline.mutate({ token })}>
                      Decline invitation
                    </Button>
                  )}
                </Stack>
                {submit.error && <InlineNotification kind="error" title="Could not submit" subtitle={submit.error.message} hideCloseButton lowContrast />}
              </Stack>
            </Tile>

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
                <h4>Site coordination</h4>
                <p className="esti-label">Raise a query, RFI, submittal, inspection request, snag, or NCR to the firm.</p>
                <div>
                  <Button
                    size="sm"
                    kind="tertiary"
                    onClick={() => setCoordForm((f) => ({ ...f, kind: "QUERY" }))}
                  >
                    Raise a query
                  </Button>
                </div>
                {(coordQ.data ?? []).slice(0, 5).map((c) => (
                  <p key={c.id}>
                    <Tag size="sm">{CONSTRUCTION_KIND_LABEL[c.kind as ConstructionKindT] ?? c.kind}</Tag> {c.subject} — {c.status}
                  </p>
                ))}
                <Select id="coord-kind" labelText="Kind" value={coordForm.kind} onChange={(e) => setCoordForm((f) => ({ ...f, kind: e.target.value as ConstructionKindT }))}>
                  {ConstructionKind.options.map((k) => <SelectItem key={k} value={k} text={CONSTRUCTION_KIND_LABEL[k]} />)}
                </Select>
                <TextInput id="coord-subj" labelText="Subject" value={coordForm.subject} onChange={(e) => setCoordForm((f) => ({ ...f, subject: e.target.value }))} />
                <TextArea id="coord-body" labelText="Details" rows={3} value={coordForm.body} onChange={(e) => setCoordForm((f) => ({ ...f, body: e.target.value }))} />
                <Button
                  size="sm"
                  disabled={!coordForm.subject.trim() || submitCoord.isPending}
                  onClick={() => submitCoord.mutate({ token, kind: coordForm.kind, subject: coordForm.subject, body: coordForm.body || undefined })}
                >
                  Submit to firm
                </Button>
              </Stack>
            </Tile>
          </Stack>
        )}
      </Content>
    </>
  );
}
