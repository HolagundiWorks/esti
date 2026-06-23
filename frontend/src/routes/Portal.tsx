import {
  Button,
  Checkbox,
  ClickableTile,
  Column,
  Content,
  Form,
  Grid,
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
  Tile,
} from "@carbon/react";
import {
  formatINR,
  PORTAL_SUBMISSION_KIND_LABEL,
  PORTAL_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  RevisionCategory,
  type PortalApprovalDecision,
  type PortalSubmissionKind,
  type PortalSubmissionStatus,
  type RevisionCategory as RevisionCategoryT,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PortalHeader } from "../components/PortalHeader.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
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
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const openId = projectId ?? null;
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.portal.branding.useQuery();
  const projectsQ = trpc.portal.myProjects.useQuery();
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
  const teamQ = trpc.portal.projectTeam.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const revisionStatsQ = trpc.portal.revisionStats.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const d = detailQ.data;
  const teamMembers = teamQ.data ?? [];
  const drawings = d?.drawings ?? [];

  useEffect(() => {
    if (openId && detailQ.isError) {
      navigate("/", { replace: true });
    }
  }, [openId, detailQ.isError, navigate]);

  // ── write state ──────────────────────────────────────────────────────────
  const [decision, setDecision] = useState<
    {
      approvalId: string;
      title: string;
      decision: PortalApprovalDecision;
      remarks: string;
      revisionCategory: RevisionCategoryT | "";
    } | null
  >(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({
    subject: "",
    body: "",
    revisionCategory: "MINOR" as RevisionCategoryT,
    attentionToId: "",
    refDrawingId: "",
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ subject: "", body: "", rating: "" });

  // Impact assessment response
  const [impactResponse, setImpactResponse] = useState<{
    submissionId: string;
    subject: string;
    affectsCosting: boolean;
    affectsTimeline: boolean;
    isBillable: boolean;
    architectComment: string | null | undefined;
    remarks: string;
  } | null>(null);

  const refresh = () => {
    utils.portal.projectDetail.invalidate();
    utils.portal.mySubmissions.invalidate();
    utils.portal.activityFeed.invalidate();
    utils.portal.revisionStats.invalidate();
  };
  const respond = trpc.portal.respondApproval.useMutation({
    onSuccess: () => { refresh(); setDecision(null); },
  });
  const acknowledge = trpc.portal.acknowledge.useMutation({ onSuccess: refresh });
  const changeRequest = trpc.portal.submitChangeRequest.useMutation({
    onSuccess: () => {
      refresh();
      setRequestOpen(false);
      setRequest({ subject: "", body: "", revisionCategory: "MINOR", attentionToId: "", refDrawingId: "" });
    },
  });
  const submitFeedback = trpc.portal.submitFeedback.useMutation({
    onSuccess: () => { refresh(); setFeedbackOpen(false); setFeedback({ subject: "", body: "", rating: "" }); },
  });
  const respondImpact = trpc.portal.respondToImpact.useMutation({
    onSuccess: () => { refresh(); setImpactResponse(null); },
  });

  // ── conversation thread ────────────────────────────────────────────────────
  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.portal.submissionThread.useQuery(
    { submissionId: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.portal.replySubmission.useMutation({
    onSuccess: () => utils.portal.submissionThread.invalidate(),
  });

  // ── revision stats pie data ───────────────────────────────────────────────
  const revStats = revisionStatsQ.data;
  const changesByCat = (revStats?.submissions ?? []).map((s) => ({
    label: s.category === "MINOR" ? "Minor" : s.category === "MAJOR" ? "Major" : s.category === "CRITICAL" ? "Critical" : s.category ?? "Unclassified",
    value: s.count,
  }));
  const drawingsByRev = (revStats?.drawings ?? []).map((s) => ({
    label: s.revisionNote ?? "Original",
    value: s.count,
  }));

  return (
    <>
      <PortalHeader
        companyName={brandingQ.data?.companyName}
        logoUrl={brandingQ.data?.logoUrl}
        portalLabel="Client portal"
        onSignOut={() => logout.mutate()}
        signingOut={logout.isPending}
      />
      <Content>
        {!openId && (
          <Stack gap={5}>
            <Stack gap={2}>
              <h1>Your projects</h1>
              <p>
                Track status, invoices, approvals and issued drawings — and
                respond to approvals, raise change requests or leave feedback.
              </p>
            </Stack>
            <Grid>
              {(projectsQ.data ?? []).length === 0 && <p>No projects yet.</p>}
              {(projectsQ.data ?? []).map((p) => (
                <Column key={p.id} sm={4} md={4} lg={4}>
                  <ClickableTile onClick={() => navigate(`/projects/${p.id}`)}>
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
              <Button kind="ghost" size="sm" onClick={() => navigate("/")}>
                ← All projects
              </Button>
              <h2>{d.project.title}</h2>
              <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "center" }}>
                <span className="esti-label">
                  {d.project.ref} · {d.project.projectType} · {d.project.jurisdiction}
                </span>
                <Tag type="cool-gray">{d.project.status}</Tag>
              </Stack>
              <Stack orientation="horizontal" gap={3}>
                <Button size="sm" onClick={() => setRequestOpen(true)}>Raise change request</Button>
                <Button size="sm" kind="tertiary" onClick={() => setFeedbackOpen(true)}>Leave feedback</Button>
              </Stack>
              <InlineNotification
                kind="info"
                title="Revision categories"
                subtitle="Classify every change request and revision response as Minor (small tweak), Major (scope or fee impact), or Critical (stop-work / safety). Your architect uses the same categories in the CRIF decision ledger."
                lowContrast
                hideCloseButton
              />
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
                              onClick={() => setDecision({
                                approvalId: a.id,
                                title: a.title,
                                decision: "APPROVED",
                                remarks: "",
                                revisionCategory: "",
                              })}>
                              Approve
                            </Button>
                            <Button kind="ghost" size="sm"
                              onClick={() => setDecision({
                                approvalId: a.id,
                                title: a.title,
                                decision: "REVISIONS",
                                remarks: "",
                                revisionCategory: "MINOR",
                              })}>
                              Request revisions
                            </Button>
                            <Button kind="danger--ghost" size="sm"
                              onClick={() => setDecision({
                                approvalId: a.id,
                                title: a.title,
                                decision: "REJECTED",
                                remarks: "",
                                revisionCategory: "",
                              })}>
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

            {d.transmittals.length > 0 && (
              <Section title="Transmittals">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Ref</TableHeader>
                      <TableHeader>Purpose</TableHeader>
                      <TableHeader>Channel</TableHeader>
                      <TableHeader>Issued</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.transmittals.map((t) => (
                      <TableRow key={t.ref}>
                        <TableCell>{t.ref}</TableCell>
                        <TableCell>{t.purpose}</TableCell>
                        <TableCell>{t.channel}</TableCell>
                        <TableCell>{t.dateIssued ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Section>
            )}

            <Section title="My requests & feedback">
              <DataState
                loading={submissionsQ.isLoading}
                isEmpty={(submissionsQ.data ?? []).length === 0}
                columnCount={6}
                empty={{ title: "Nothing submitted yet", description: "Your acknowledgements, change requests and feedback appear here." }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Revision</TableHeader>
                      <TableHeader>Subject</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Architect response</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(submissionsQ.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{PORTAL_SUBMISSION_KIND_LABEL[s.kind as PortalSubmissionKind] ?? s.kind}</TableCell>
                        <TableCell>
                          {s.revisionCategory ? (
                            <Tag type={REVISION_CATEGORY_TAG[s.revisionCategory as RevisionCategoryT] ?? "gray"} size="sm">
                              {REVISION_CATEGORY_LABEL[s.revisionCategory as RevisionCategoryT] ?? s.revisionCategory}
                            </Tag>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>
                          <Tag type={PORTAL_SUBMISSION_STATUS_TAG[s.status as PortalSubmissionStatus] ?? "blue"}>
                            {PORTAL_SUBMISSION_STATUS_LABEL[s.status as PortalSubmissionStatus] ?? s.status}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {s.status === "IMPACT_SENT" ? (
                            <Stack gap={1}>
                              {s.affectsCosting && <Tag type="red" size="sm">Affects costing</Tag>}
                              {s.affectsTimeline && <Tag type="magenta" size="sm">Affects timeline</Tag>}
                              {s.isBillable && <Tag type="purple" size="sm">Billable</Tag>}
                              {s.architectComment && <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>{s.architectComment}</p>}
                            </Stack>
                          ) : (s.responseNote ?? "—")}
                        </TableCell>
                        <TableCell>
                          <Stack orientation="horizontal" gap={2}>
                            {s.status === "IMPACT_SENT" && (
                              <Button kind="primary" size="sm"
                                onClick={() => setImpactResponse({
                                  submissionId: s.id,
                                  subject: s.subject,
                                  affectsCosting: s.affectsCosting ?? false,
                                  affectsTimeline: s.affectsTimeline ?? false,
                                  isBillable: s.isBillable ?? false,
                                  architectComment: s.architectComment,
                                  remarks: "",
                                })}>
                                Review &amp; respond
                              </Button>
                            )}
                            <Button kind="ghost" size="sm" onClick={() => setThreadFor({ id: s.id, subject: s.subject })}>
                              Conversation
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </Section>

            {/* ── Revision dashboard ───────────────────────────────────────── */}
            <Stack gap={3}>
              <h4>Revision dashboard</h4>
              <Grid>
                <Column sm={4} md={4} lg={8}>
                  <Tile>
                    <Stack gap={3}>
                      <p className="esti-label" style={{ margin: 0 }}>Change requests by category</p>
                      {revisionStatsQ.isLoading ? (
                        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>Loading…</p>
                      ) : changesByCat.length === 0 ? (
                        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>No change requests yet.</p>
                      ) : (
                        <Table size="sm" useZebraStyles>
                          <TableHead>
                            <TableRow>
                              <TableHeader>Category</TableHeader>
                              <TableHeader>Count</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {changesByCat.map((c) => (
                              <TableRow key={c.label}>
                                <TableCell>{c.label}</TableCell>
                                <TableCell>{c.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Stack>
                  </Tile>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <Tile>
                    <Stack gap={3}>
                      <p className="esti-label" style={{ margin: 0 }}>Drawing revisions by type</p>
                      {revisionStatsQ.isLoading ? (
                        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>Loading…</p>
                      ) : drawingsByRev.length === 0 ? (
                        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>No drawing revisions yet.</p>
                      ) : (
                        <Table size="sm" useZebraStyles>
                          <TableHead>
                            <TableRow>
                              <TableHeader>Revision</TableHeader>
                              <TableHeader>Count</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {drawingsByRev.map((r) => (
                              <TableRow key={r.label}>
                                <TableCell>{r.label}</TableCell>
                                <TableCell>{r.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Stack>
                  </Tile>
                </Column>
              </Grid>
            </Stack>

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
          primaryButtonDisabled={
            respond.isPending ||
            (decision?.decision === "REVISIONS" && !decision.revisionCategory)
          }
          onRequestClose={() => setDecision(null)}
          onRequestSubmit={() => decision && respond.mutate({
            approvalId: decision.approvalId,
            decision: decision.decision,
            remarks: decision.remarks || undefined,
            revisionCategory:
              decision.decision === "REVISIONS"
                ? (decision.revisionCategory as RevisionCategoryT)
                : undefined,
          })}
        >
          {decision && (
            <Stack gap={5}>
              <Select id="dec-kind" labelText="Decision" value={decision.decision}
                onChange={(e) => setDecision({
                  ...decision,
                  decision: e.target.value as PortalApprovalDecision,
                  revisionCategory: e.target.value === "REVISIONS" ? "MINOR" : "",
                })}>
                <SelectItem value="APPROVED" text="Approve" />
                <SelectItem value="REVISIONS" text="Request revisions" />
                <SelectItem value="REJECTED" text="Reject" />
              </Select>
              {decision.decision === "REVISIONS" && (
                <Select
                  id="dec-rev-cat"
                  labelText="Revision category"
                  helperText="Major and Critical revisions may affect scope, fees and schedule."
                  value={decision.revisionCategory}
                  onChange={(e) => setDecision({
                    ...decision,
                    revisionCategory: e.target.value as RevisionCategoryT,
                  })}
                >
                  {RevisionCategory.options.map((c) => (
                    <SelectItem key={c} value={c} text={REVISION_CATEGORY_LABEL[c]} />
                  ))}
                </Select>
              )}
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
            projectId: openId,
            subject: request.subject,
            body: request.body,
            revisionCategory: request.revisionCategory,
            attentionToId: request.attentionToId || undefined,
            refDrawingId: request.refDrawingId || undefined,
          })}
        >
          <Form onSubmit={(e) => e.preventDefault()}>
            <Stack gap={5}>
              <Select
                id="cr-cat"
                labelText="Revision category"
                helperText="How significant is this change for scope, fees or schedule?"
                value={request.revisionCategory}
                onChange={(e) => setRequest((r) => ({
                  ...r,
                  revisionCategory: e.target.value as RevisionCategoryT,
                }))}
              >
                {RevisionCategory.options.map((c) => (
                  <SelectItem key={c} value={c} text={REVISION_CATEGORY_LABEL[c]} />
                ))}
              </Select>
              {teamMembers.length > 0 && (
                <Select
                  id="cr-attn"
                  labelText="Attention to (optional)"
                  helperText="Which team member should handle this?"
                  value={request.attentionToId}
                  onChange={(e) => setRequest((r) => ({ ...r, attentionToId: e.target.value }))}
                >
                  <SelectItem value="" text="— any team member —" />
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} text={`${m.fullName} (${m.role})`} />
                  ))}
                </Select>
              )}
              {drawings.length > 0 && (
                <Select
                  id="cr-drawing"
                  labelText="Reference drawing (optional)"
                  helperText="Which drawing does this change relate to?"
                  value={request.refDrawingId}
                  onChange={(e) => setRequest((r) => ({ ...r, refDrawingId: e.target.value }))}
                >
                  <SelectItem value="" text="— no specific drawing —" />
                  {drawings.map((dr) => (
                    <SelectItem key={dr.id} value={dr.id} text={`${dr.ref} — ${dr.title}`} />
                  ))}
                </Select>
              )}
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

        {/* ── impact assessment response modal ─────────────────────────── */}
        <Modal
          open={impactResponse !== null}
          modalHeading={impactResponse ? `Impact assessment — ${impactResponse.subject}` : "Impact assessment"}
          primaryButtonText={respondImpact.isPending ? "Submitting…" : "Approve"}
          secondaryButtonText="Reject"
          danger={false}
          primaryButtonDisabled={respondImpact.isPending}
          onRequestClose={() => setImpactResponse(null)}
          onSecondarySubmit={() => impactResponse && respondImpact.mutate({
            submissionId: impactResponse.submissionId,
            approved: false,
            remarks: impactResponse.remarks || undefined,
          })}
          onRequestSubmit={() => impactResponse && respondImpact.mutate({
            submissionId: impactResponse.submissionId,
            approved: true,
            remarks: impactResponse.remarks || undefined,
          })}
        >
          {impactResponse && (
            <Stack gap={5}>
              <p>Your architect has assessed the impact of this change request:</p>
              <Stack gap={3}>
                <Checkbox
                  id="ia-costing" labelText="Affects costing"
                  checked={impactResponse.affectsCosting}
                  readOnly
                />
                <Checkbox
                  id="ia-timeline" labelText="Affects timeline"
                  checked={impactResponse.affectsTimeline}
                  readOnly
                />
                <Checkbox
                  id="ia-billable" labelText="Additional billable work"
                  checked={impactResponse.isBillable}
                  readOnly
                />
              </Stack>
              {impactResponse.architectComment && (
                <Tile>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                    Architect's note
                  </p>
                  <p>{impactResponse.architectComment}</p>
                </Tile>
              )}
              <TextArea
                id="ia-remarks"
                labelText="Your remarks (optional)"
                helperText="Your response will be shared with the architect."
                rows={3}
                value={impactResponse.remarks}
                onChange={(e) => setImpactResponse({ ...impactResponse, remarks: e.target.value })}
              />
              {respondImpact.error && (
                <InlineNotification kind="error" title="Could not submit"
                  subtitle={respondImpact.error.message} hideCloseButton lowContrast />
              )}
            </Stack>
          )}
        </Modal>

        {/* ── conversation thread modal ─────────────────────────────────── */}
        <Modal
          open={threadFor !== null}
          modalHeading={threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}
          primaryButtonText="Close" passiveModal
          onRequestClose={() => setThreadFor(null)}
        >
          {threadFor && (
            <SubmissionThread
              messages={threadQ.data ?? []}
              loading={threadQ.isLoading}
              pending={reply.isPending}
              onReply={(body) => reply.mutate({ submissionId: threadFor.id, body })}
            />
          )}
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
