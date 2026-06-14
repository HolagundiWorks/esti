import {
  Button,
  ClickableTile,
  Column,
  Content,
  Form,
  Grid,
  Header,
  HeaderName,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
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
  Stack,
} from "@carbon/react";
import {
  formatINR,
  PORTAL_SUBMISSION_KIND_LABEL,
  PORTAL_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG,
  type PortalApprovalDecision,
  type PortalSubmissionKind,
  type PortalSubmissionStatus,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const INV_TAG: Record<string, "blue" | "green"> = {
  ISSUED: "blue",
  PAID: "green",
};
const AP_TAG: Record<
  string,
  "blue" | "green" | "magenta" | "red" | "cool-gray"
> = {
  SENT: "blue",
  APPROVED: "green",
  REVISIONS: "magenta",
  REJECTED: "red",
  SUPERSEDED: "cool-gray",
};
// Approvals the client can still respond to.
const RESPONDABLE = ["SENT", "REVISIONS"];

export function Portal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const projectsQ = trpc.portal.myProjects.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQ = trpc.portal.projectDetail.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const submissionsQ = trpc.portal.mySubmissions.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const activityQ = trpc.portal.activityFeed.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const d = detailQ.data;

  // ── write state ──────────────────────────────────────────────────────────
  const [decision, setDecision] = useState<
    { approvalId: string; title: string; decision: PortalApprovalDecision; remarks: string } | null
  >(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ subject: "", body: "" });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ subject: "", body: "", rating: "" });

  const refresh = () => {
    utils.portal.projectDetail.invalidate();
    utils.portal.mySubmissions.invalidate();
    utils.portal.activityFeed.invalidate();
  };
  const respond = trpc.portal.respondApproval.useMutation({
    onSuccess: () => { refresh(); setDecision(null); },
  });
  const acknowledge = trpc.portal.acknowledge.useMutation({ onSuccess: refresh });
  const changeRequest = trpc.portal.submitChangeRequest.useMutation({
    onSuccess: () => { refresh(); setRequestOpen(false); setRequest({ subject: "", body: "" }); },
  });
  const submitFeedback = trpc.portal.submitFeedback.useMutation({
    onSuccess: () => { refresh(); setFeedbackOpen(false); setFeedback({ subject: "", body: "", rating: "" }); },
  });

  return (
    <>
      <Header aria-label="ESTI client portal">
        <HeaderName prefix="ESTI">Client portal</HeaderName>
        <Button
          kind="ghost"
          size="sm"
          style={{ marginLeft: "auto" }}
          onClick={() => logout.mutate()}
        >
          Sign out
        </Button>
      </Header>
      <Content>
        {!openId && (
          <Stack gap={5}>
            <Stack gap={2}>
              <h2>Your projects</h2>
              <p>
                Track status, invoices, approvals and issued drawings — and
                respond to approvals, raise change requests or leave feedback.
              </p>
            </Stack>
            <Grid>
              {(projectsQ.data ?? []).length === 0 && <p>No projects yet.</p>}
              {(projectsQ.data ?? []).map((p) => (
                <Column key={p.id} sm={4} md={4} lg={4}>
                  <ClickableTile onClick={() => setOpenId(p.id)}>
                    <Stack gap={3}>
                      <p>{p.ref}</p>
                      <h3>{p.title}</h3>
                      <Tag type="cool-gray">{p.status}</Tag>
                    </Stack>
                  </ClickableTile>
                </Column>
              ))}
            </Grid>
          </Stack>
        )}

        {openId && d && (
          <Stack gap={6}>
            <Stack gap={3}>
              <Button kind="ghost" size="sm" onClick={() => setOpenId(null)}>
                ← All projects
              </Button>
              <h2>{d.project.title}</h2>
              <p>
                {d.project.ref} · {d.project.projectType} ·{" "}
                {d.project.jurisdiction} ·{" "}
                <Tag type="cool-gray">{d.project.status}</Tag>
              </p>
              <Stack orientation="horizontal" gap={3}>
                <Button size="sm" onClick={() => setRequestOpen(true)}>Raise change request</Button>
                <Button size="sm" kind="tertiary" onClick={() => setFeedbackOpen(true)}>Leave feedback</Button>
              </Stack>
            </Stack>

            <Section title="Stages">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Stage</TableHeader>
                    <TableHeader>Billing %</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.phases.map((ph) => (
                    <TableRow key={ph.code}>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billingPct}%</TableCell>
                      <TableCell>{ph.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Invoices">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Document</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.invoices.map((iv) => (
                    <TableRow key={iv.ref}>
                      <TableCell>{iv.ref}</TableCell>
                      <TableCell>{iv.documentKind}</TableCell>
                      <TableCell>{iv.dateInvoice ?? "—"}</TableCell>
                      <TableCell>
                        {formatINR(iv.grandTotalPaise, { paise: false })}
                      </TableCell>
                      <TableCell>
                        <Tag type={INV_TAG[iv.status] ?? "blue"}>
                          {iv.status}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Approvals">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Sent</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Respond</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.approvals.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.sentDate ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={AP_TAG[a.status] ?? "blue"}>{a.status}</Tag>
                      </TableCell>
                      <TableCell>
                        {RESPONDABLE.includes(a.status) ? (
                          <Stack orientation="horizontal" gap={2}>
                            <Button kind="ghost" size="sm"
                              onClick={() => setDecision({ approvalId: a.id, title: a.title, decision: "APPROVED", remarks: "" })}>
                              Approve
                            </Button>
                            <Button kind="ghost" size="sm"
                              onClick={() => setDecision({ approvalId: a.id, title: a.title, decision: "REVISIONS", remarks: "" })}>
                              Request revisions
                            </Button>
                            <Button kind="danger--ghost" size="sm"
                              onClick={() => setDecision({ approvalId: a.id, title: a.title, decision: "REJECTED", remarks: "" })}>
                              Reject
                            </Button>
                          </Stack>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Issued drawings">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Acknowledge</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.drawings.map((dr) => (
                    <TableRow key={dr.id}>
                      <TableCell>{dr.ref}</TableCell>
                      <TableCell>{dr.title}</TableCell>
                      <TableCell>
                        <Button kind="ghost" size="sm" disabled={acknowledge.isPending}
                          onClick={() => acknowledge.mutate({
                            projectId: openId, objectType: "drawing", objectId: dr.id,
                            subject: `Drawing ${dr.ref} — ${dr.title}`,
                          })}>
                          Acknowledge receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="My requests & feedback">
              <DataState
                loading={submissionsQ.isLoading}
                isEmpty={(submissionsQ.data ?? []).length === 0}
                columnCount={4}
                empty={{ title: "Nothing submitted yet", description: "Your acknowledgements, change requests and feedback appear here." }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Subject</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Firm response</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(submissionsQ.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{PORTAL_SUBMISSION_KIND_LABEL[s.kind as PortalSubmissionKind] ?? s.kind}</TableCell>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>
                          <Tag type={PORTAL_SUBMISSION_STATUS_TAG[s.status as PortalSubmissionStatus] ?? "blue"}>
                            {PORTAL_SUBMISSION_STATUS_LABEL[s.status as PortalSubmissionStatus] ?? s.status}
                          </Tag>
                        </TableCell>
                        <TableCell>{s.responseNote ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </Section>

            <Section title="Activity">
              <DataState
                loading={activityQ.isLoading}
                isEmpty={(activityQ.data ?? []).length === 0}
                columnCount={2}
                empty={{ title: "No shared activity yet", description: "Updates the firm shares with you appear here." }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>When</TableHeader>
                      <TableHeader>Update</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(activityQ.data ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{new Date(a.createdAt as unknown as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                        <TableCell>
                          {a.summary}
                          {a.actorName && <div className="esti-label esti-label--secondary">{a.actorName}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </Section>
          </Stack>
        )}

        {/* ── approval decision modal ───────────────────────────────────── */}
        <Modal
          open={decision !== null}
          modalHeading={decision ? `Respond — ${decision.title}` : "Respond"}
          primaryButtonText={respond.isPending ? "Submitting…" : "Submit response"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={respond.isPending}
          onRequestClose={() => setDecision(null)}
          onRequestSubmit={() => decision && respond.mutate({
            approvalId: decision.approvalId, decision: decision.decision,
            remarks: decision.remarks || undefined,
          })}
        >
          {decision && (
            <Stack gap={5}>
              <Select id="dec-kind" labelText="Decision" value={decision.decision}
                onChange={(e) => setDecision({ ...decision, decision: e.target.value as PortalApprovalDecision })}>
                <SelectItem value="APPROVED" text="Approve" />
                <SelectItem value="REVISIONS" text="Request revisions" />
                <SelectItem value="REJECTED" text="Reject" />
              </Select>
              <TextArea id="dec-remarks" labelText="Remarks (optional)" rows={3}
                value={decision.remarks}
                onChange={(e) => setDecision({ ...decision, remarks: e.target.value })} />
              {respond.error && (
                <InlineNotification kind="error" title="Could not submit"
                  subtitle={respond.error.message} hideCloseButton lowContrast />
              )}
            </Stack>
          )}
        </Modal>

        {/* ── change request modal ──────────────────────────────────────── */}
        <Modal
          open={requestOpen} modalHeading="Raise a change request"
          primaryButtonText={changeRequest.isPending ? "Submitting…" : "Submit"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!request.subject || !request.body || changeRequest.isPending}
          onRequestClose={() => setRequestOpen(false)}
          onRequestSubmit={() => openId && changeRequest.mutate({
            projectId: openId, subject: request.subject, body: request.body,
          })}
        >
          <Form onSubmit={(e) => e.preventDefault()}>
            <Stack gap={5}>
              <TextInput id="cr-subject" labelText="Subject" value={request.subject}
                onChange={(e) => setRequest((r) => ({ ...r, subject: e.target.value }))} />
              <TextArea id="cr-body" labelText="What would you like changed?" rows={4}
                value={request.body}
                onChange={(e) => setRequest((r) => ({ ...r, body: e.target.value }))} />
            </Stack>
          </Form>
        </Modal>

        {/* ── feedback modal ────────────────────────────────────────────── */}
        <Modal
          open={feedbackOpen} modalHeading="Leave feedback"
          primaryButtonText={submitFeedback.isPending ? "Submitting…" : "Submit"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!feedback.subject || submitFeedback.isPending}
          onRequestClose={() => setFeedbackOpen(false)}
          onRequestSubmit={() => openId && submitFeedback.mutate({
            projectId: openId, subject: feedback.subject,
            body: feedback.body || undefined,
            rating: feedback.rating ? Number(feedback.rating) : undefined,
          })}
        >
          <Form onSubmit={(e) => e.preventDefault()}>
            <Stack gap={5}>
              <TextInput id="fb-subject" labelText="Subject" value={feedback.subject}
                onChange={(e) => setFeedback((f) => ({ ...f, subject: e.target.value }))} />
              <Select id="fb-rating" labelText="Rating (optional)" value={feedback.rating}
                onChange={(e) => setFeedback((f) => ({ ...f, rating: e.target.value }))}>
                <SelectItem value="" text="— no rating —" />
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)} text={`${n} / 5`} />
                ))}
              </Select>
              <TextArea id="fb-body" labelText="Comments (optional)" rows={4}
                value={feedback.body}
                onChange={(e) => setFeedback((f) => ({ ...f, body: e.target.value }))} />
            </Stack>
          </Form>
        </Modal>
      </Content>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <TableContainer title={title}>{children}</TableContainer>;
}
