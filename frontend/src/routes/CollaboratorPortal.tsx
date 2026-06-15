import {
  Button,
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
} from "@carbon/react";
import {
  CONSULTANT_SUBMISSION_KIND_LABEL,
  CONSULTANT_SUBMISSION_STATUS_LABEL,
  CONSULTANT_SUBMISSION_STATUS_TAG,
  ConsultantOriginKind,
  formatINR,
  type ConsultantOriginKind as ConsultantOriginKindT,
  type ConsultantSubmissionKind as ConsultantSubmissionKindT,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PortalHeader } from "../components/PortalHeader.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function CollaboratorPortal() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const openId = projectId ?? null;
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.collab.branding.useQuery();
  const projectsQ = trpc.collab.myProjects.useQuery();
  const detailQ = trpc.collab.projectDetail.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const submissionsQ = trpc.collab.mySubmissions.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const activityQ = trpc.collab.activityFeed.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const assignedQ = trpc.collab.assignedTasks.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const completeTask = trpc.collab.completeTask.useMutation({
    onSuccess: () => {
      utils.collab.assignedTasks.invalidate();
      utils.collab.activityFeed.invalidate();
    },
  });
  const d = detailQ.data;

  useEffect(() => {
    if (openId && detailQ.isError) {
      navigate("/", { replace: true });
    }
  }, [openId, detailQ.isError, navigate]);

  // ── write state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<{ kind: ConsultantOriginKindT; subject: string; body: string } | null>(null);
  const submit = trpc.collab.submit.useMutation({
    onSuccess: () => {
      utils.collab.mySubmissions.invalidate();
      utils.collab.activityFeed.invalidate();
      setForm(null);
    },
  });

  // ── conversation thread ────────────────────────────────────────────────────
  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.collab.submissionThread.useQuery(
    { submissionId: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.collab.replySubmission.useMutation({
    onSuccess: () => utils.collab.submissionThread.invalidate(),
  });

  return (
    <>
      <PortalHeader
        companyName={brandingQ.data?.companyName}
        logoUrl={brandingQ.data?.logoUrl}
        portalLabel="Consultant portal"
        onSignOut={() => logout.mutate()}
        signingOut={logout.isPending}
      />
      <Content>
        {!openId && (
          <Stack gap={5}>
            <Stack gap={2}>
              <h1>Your engagements</h1>
              <p>
                Projects you are engaged on — status, stages, issued drawings,
                your fee balance, and your deliverables, RFIs and notes.
              </p>
            </Stack>
            <Grid>
              {(projectsQ.data ?? []).length === 0 && (
                <p>No engagements yet.</p>
              )}
              {(projectsQ.data ?? []).map((p) => {
                const balance = p.agreedFeePaise - p.paidPaise;
                return (
                  <Column key={p.id} sm={4} md={4} lg={4}>
                    <ClickableTile onClick={() => navigate(`/projects/${p.id}`)}>
                      <Stack gap={3}>
                        <p>{p.ref}</p>
                        <h3>{p.title}</h3>
                        <Tag type="cool-gray">{p.status}</Tag>
                        <p>Balance {formatINR(balance, { paise: false })}</p>
                      </Stack>
                    </ClickableTile>
                  </Column>
                );
              })}
            </Grid>
          </Stack>
        )}

        {openId && d && (
          <Stack gap={6}>
            <Stack gap={3}>
              <Button kind="ghost" size="sm" onClick={() => navigate("/")}>
                ← All engagements
              </Button>
              <h2>{d.project.title}</h2>
              <p>
                {d.project.ref} · {d.project.projectType} ·{" "}
                {d.project.jurisdiction} ·{" "}
                <Tag type="cool-gray">{d.project.status}</Tag>
              </p>
              <Stack orientation="horizontal" gap={3}>
                <Button size="sm" onClick={() => setForm({ kind: "DELIVERABLE", subject: "", body: "" })}>
                  Submit deliverable
                </Button>
                <Button size="sm" kind="tertiary" onClick={() => setForm({ kind: "RFI", subject: "", body: "" })}>
                  Raise RFI
                </Button>
                <Button size="sm" kind="tertiary" onClick={() => setForm({ kind: "NOTE", subject: "", body: "" })}>
                  Add note
                </Button>
              </Stack>
            </Stack>

            <TableContainer title="Your engagement">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Scope</TableHeader>
                    <TableHeader>Agreed</TableHeader>
                    <TableHeader>Paid</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{d.engagement.scope ?? "—"}</TableCell>
                    <TableCell>
                      {formatINR(d.engagement.agreedFeePaise, { paise: false })}
                    </TableCell>
                    <TableCell>
                      {formatINR(d.engagement.paidPaise, { paise: false })}
                    </TableCell>
                    <TableCell>
                      {formatINR(
                        d.engagement.agreedFeePaise - d.engagement.paidPaise,
                        { paise: false },
                      )}
                    </TableCell>
                    <TableCell>{d.engagement.status}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer title="Stages">
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
            </TableContainer>

            <TableContainer title="Issued drawings">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Title</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.drawings.map((dr) => (
                    <TableRow key={dr.ref}>
                      <TableCell>{dr.ref}</TableCell>
                      <TableCell>{dr.title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer title="Tasks assigned to me">
              <DataState
                loading={assignedQ.isLoading}
                isEmpty={(assignedQ.data ?? []).length === 0}
                columnCount={3}
                empty={{ title: "No assigned tasks", description: "Tasks the firm assigns to you appear here." }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Task</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Action</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(assignedQ.data ?? []).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {t.subject}
                          {t.body && <div className="esti-label esti-label--secondary">{t.body}</div>}
                        </TableCell>
                        <TableCell>
                          <Tag type={t.status === "RESOLVED" ? "green" : "blue"}>
                            {t.status === "RESOLVED" ? "Done" : "Open"}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {t.status !== "RESOLVED" && (
                            <Button kind="ghost" size="sm" disabled={completeTask.isPending}
                              onClick={() => completeTask.mutate({ submissionId: t.id })}>
                              Mark done
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </TableContainer>

            <TableContainer title="My deliverables, RFIs & notes">
              <DataState
                loading={submissionsQ.isLoading}
                isEmpty={(submissionsQ.data ?? []).length === 0}
                columnCount={4}
                empty={{ title: "Nothing submitted yet", description: "Your deliverables, RFIs and notes appear here." }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Subject</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Firm response</TableHeader>
                      <TableHeader>Conversation</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(submissionsQ.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{CONSULTANT_SUBMISSION_KIND_LABEL[s.kind as ConsultantSubmissionKindT] ?? s.kind}</TableCell>
                        <TableCell>
                          {s.subject}
                          {s.body && <div className="esti-label esti-label--secondary">{s.body}</div>}
                        </TableCell>
                        <TableCell>
                          <Tag type={CONSULTANT_SUBMISSION_STATUS_TAG[s.status as SubmissionStatus] ?? "blue"}>
                            {CONSULTANT_SUBMISSION_STATUS_LABEL[s.status as SubmissionStatus] ?? s.status}
                          </Tag>
                        </TableCell>
                        <TableCell>{s.responseNote ?? "—"}</TableCell>
                        <TableCell>
                          <Button kind="ghost" size="sm" onClick={() => setThreadFor({ id: s.id, subject: s.subject })}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </TableContainer>

            <TableContainer title="Activity">
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
            </TableContainer>
          </Stack>
        )}

        {/* ── submission modal ──────────────────────────────────────────── */}
        <Modal
          open={form !== null}
          modalHeading={form ? `${CONSULTANT_SUBMISSION_KIND_LABEL[form.kind]} — ${d?.project.ref ?? ""}` : "Submit"}
          primaryButtonText={submit.isPending ? "Submitting…" : "Submit"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!form?.subject || submit.isPending}
          onRequestClose={() => setForm(null)}
          onRequestSubmit={() => form && openId && submit.mutate({
            projectId: openId, kind: form.kind, subject: form.subject,
            body: form.body || undefined,
          })}
        >
          {form && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Stack gap={5}>
                <Select id="cs-kind" labelText="Type" value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as ConsultantOriginKindT })}>
                  {ConsultantOriginKind.options.map((k) => (
                    <SelectItem key={k} value={k} text={CONSULTANT_SUBMISSION_KIND_LABEL[k]} />
                  ))}
                </Select>
                <TextInput id="cs-subject" labelText="Subject" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                <TextArea id="cs-body" labelText="Details (optional)" rows={4} value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })} />
                {submit.error && (
                  <InlineNotification kind="error" title="Could not submit"
                    subtitle={submit.error.message} hideCloseButton lowContrast />
                )}
              </Stack>
            </Form>
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
