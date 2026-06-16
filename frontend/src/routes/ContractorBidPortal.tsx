import {
  Button,
  Content,
  Header,
  HeaderName,
  InlineNotification,
  Loading,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { formatINR, TENDER_STATUS_TAG, type TenderStatus } from "@esti/contracts";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/**
 * Public contractor bid portal reached via an unguessable per-invitation link
 * (`/bid/:token`). No login — the token is the capability, and it exposes only
 * this contractor's own tender and bid.
 */
export function ContractorBidPortal() {
  const { token = "" } = useParams();
  const utils = trpc.useUtils();
  const q = trpc.contractorPortal.byToken.useQuery({ token }, { enabled: token.length > 0, retry: false });
  const submit = trpc.contractorPortal.submitBid.useMutation({
    onSuccess: () => utils.contractorPortal.byToken.invalidate(),
  });

  const [form, setForm] = useState({ rupees: "", weeks: "", technical: "", notes: "" });

  // Prefill from an existing bid once loaded.
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

            {!d.tender.open ? (
              <InlineNotification
                kind="info"
                title="Not open for bids"
                subtitle="This tender is not currently accepting bids. Your previously submitted figures (if any) are shown below."
                hideCloseButton
                lowContrast
              />
            ) : null}

            <Tile>
              <Stack gap={5}>
                <h4>{bid ? "Your bid" : "Submit your bid"}</h4>
                <TextInput
                  id="bid-amount"
                  labelText="Bid amount (₹)"
                  type="number"
                  value={form.rupees}
                  disabled={!d.tender.open}
                  onChange={(e) => setForm((f) => ({ ...f, rupees: e.target.value }))}
                  helperText={form.rupees ? formatINR(Math.round(Number(form.rupees) * 100), { paise: false }) : undefined}
                />
                <Stack orientation="horizontal" gap={5}>
                  <TextInput
                    id="bid-weeks"
                    labelText="Completion (weeks)"
                    type="number"
                    value={form.weeks}
                    disabled={!d.tender.open}
                    onChange={(e) => setForm((f) => ({ ...f, weeks: e.target.value }))}
                  />
                  <TextInput
                    id="bid-technical"
                    labelText="Technical note score (0–100, optional)"
                    type="number"
                    value={form.technical}
                    disabled={!d.tender.open}
                    onChange={(e) => setForm((f) => ({ ...f, technical: e.target.value }))}
                  />
                </Stack>
                <TextArea
                  id="bid-notes"
                  labelText="Notes / inclusions (optional)"
                  rows={3}
                  value={form.notes}
                  disabled={!d.tender.open}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
                {submit.error && (
                  <InlineNotification kind="error" title="Could not submit" subtitle={submit.error.message} hideCloseButton lowContrast />
                )}
                {submit.isSuccess && !submit.isPending && (
                  <InlineNotification kind="success" title="Bid submitted" subtitle="The firm has received your bid. You can update it while the tender stays open." hideCloseButton lowContrast />
                )}
                <Button
                  disabled={!d.tender.open || !form.rupees || submit.isPending}
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
              </Stack>
            </Tile>
          </Stack>
        )}
      </Content>
    </>
  );
}
