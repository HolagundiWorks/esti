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
  CONSULTANT_SUBMISSION_KIND_LABEL,
  CONSULTANT_SUBMISSION_STATUS_LABEL,
  CONSULTANT_SUBMISSION_STATUS_TAG,
  ConsultantSubmissionKind,
  formatINR,
  type ConsultantSubmissionKind as ConsultantSubmissionKindT,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function CollaboratorPortal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.collab.branding.useQuery();
  const projectsQ = trpc.collab.myProjects.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
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
  const d = detailQ.data;

  // ── write state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<{ kind: ConsultantSubmissionKindT; subject: string; body: string } | null>(null);
  const submit = trpc.collab.submit.useMutation({
    onSuccess: () => {
      utils.collab.mySubmissions.invalidate();
      utils.collab.activityFeed.invalidate();
      setForm(null);
    },
  });

  return (
    <>
      <Header aria-label="ESTI consultant portal">
        {brandingQ.data?.logoUrl && (
          <img src={brandingQ.data.logoUrl} alt="" className="esti-portal-logo" />
        )}
        <HeaderName prefix={brandingQ.data?.companyName ?? "ESTI"}>Consultant portal</HeaderName>
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
              <h2>Your engagements</h2>
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
                    <ClickableTile onClick={() => setOpenId(p.id)}>
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
              <Button kind="ghost" size="sm" onClick={() => setOpenId(null)}>
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
                  onChange={(e) => setForm({ ...form, kind: e.target.value as ConsultantSubmissionKindT })}>
                  {ConsultantSubmissionKind.options.map((k) => (
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
      </Content>
    </>
  );
}
