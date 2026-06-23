import {
  Button,
  Column,
  Grid,
  Modal,
  ProgressBar,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
  Tile,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  CONSTRUCTION_KIND_LABEL,
  SNAG_STATUS_LABEL,
  SUBMITTAL_REVIEW_LABEL,
  type SnagStatus,
  type SubmittalReviewCode,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "./DataState.js";
import { ProjectConstructionSchedule } from "./ProjectConstructionSchedule.js";
import { trpc } from "../lib/trpc.js";

export function ProjectPmc({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const [pmcTab, setPmcTab] = useState(0);
  const summaryQ = trpc.pmc.summary.useQuery({ projectId });
  const snagsQ = trpc.snags.listByProject.useQuery({ projectId });
  const constructionQ = trpc.construction.list.useQuery({ projectId, openOnly: true });
  const reportsQ = trpc.progressReports.listByProject.useQuery({ projectId });
  const liveQ = trpc.phaseProgress.listByProject.useQuery({ projectId });

  const createSnag = trpc.snags.create.useMutation({
    onSuccess: () => {
      void utils.snags.listByProject.invalidate({ projectId });
      void utils.pmc.summary.invalidate({ projectId });
    },
  });
  const updateSnag = trpc.snags.update.useMutation({
    onSuccess: () => {
      void utils.snags.listByProject.invalidate({ projectId });
      void utils.pmc.summary.invalidate({ projectId });
    },
  });
  const createReport = trpc.progressReports.createDraft.useMutation({
    onSuccess: () => void utils.progressReports.listByProject.invalidate({ projectId }),
  });
  const issueReport = trpc.progressReports.generatePdf.useMutation({
    onSuccess: () => void utils.progressReports.listByProject.invalidate({ projectId }),
  });
  const review = trpc.construction.review.useMutation({
    onSuccess: () => {
      void utils.construction.list.invalidate();
      void utils.pmc.summary.invalidate({ projectId });
    },
  });
  const updateStage = trpc.phaseProgress.update.useMutation({
    onSuccess: () => {
      void utils.phaseProgress.listByProject.invalidate({ projectId });
      void utils.pmc.summary.invalidate({ projectId });
    },
  });

  const [snagOpen, setSnagOpen] = useState(false);
  const [snagForm, setSnagForm] = useState({ location: "", trade: "", description: "" });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ code: "A" as SubmittalReviewCode, note: "" });

  const s = summaryQ.data;
  if (summaryQ.isLoading) return <p>Loading PMC…</p>;
  if (!s) return <p>PMC data unavailable.</p>;

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const cs = s.constructionSchedule;
  const schedulePct = cs?.percentComplete ?? 0;

  const hubPanel = (
    <Stack gap={6}>
      <Grid narrow>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={2}>
              <h4>Construction schedule</h4>
              <ProgressBar label="" hideLabel value={schedulePct} max={100} />
              <span>{schedulePct}%</span>
              {cs && cs.criticalOverdue > 0 && (
                <Tag type="red" size="sm">
                  {cs.criticalOverdue} critical overdue
                </Tag>
              )}
              <Button kind="ghost" size="sm" onClick={() => setPmcTab(1)}>
                Open schedule
              </Button>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={2}>
              <h4>Site coordination</h4>
              <p style={{ margin: 0 }}>{s.construction.openTotal} open items</p>
              <Button kind="ghost" size="sm" onClick={() => setPmcTab(2)}>
                Site ops
              </Button>
              <Button kind="ghost" size="sm" as={Link} to="/office/construction">
                Office inbox
              </Button>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={2}>
              <h4>PMC health</h4>
              <ProgressBar label="" hideLabel value={s.healthScore} max={100} />
              <span>{s.healthScore}/100</span>
              <Tag type={s.snags.overdue > 0 ? "red" : "green"} size="sm">
                {s.snags.open} open snags
              </Tag>
              {s.runningBills?.open > 0 && (
                <Tag type="blue" size="sm">
                  {s.runningBills.open} running bill{ s.runningBills.open === 1 ? "" : "s" }
                </Tag>
              )}
            </Stack>
          </Tile>
        </Column>
      </Grid>

      <div>
        <h4>Open items</h4>
        {s.openItems.length === 0 ?
          <p>Nothing urgent on the schedule.</p>
        : <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Item</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.openItems.map((item) => (
                  <TableRow key={`${item.kind}-${item.id}`}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.subtype}</TableCell>
                    <TableCell>{item.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        }
      </div>

      <p style={{ margin: 0, opacity: 0.85 }}>
        <Link to={`/projects/${projectId}?tab=programme`}>Office delivery programme →</Link>
        {" "}(milestones and internal tasks — separate from site construction schedule)
      </p>
    </Stack>
  );

  const siteOpsPanel = (
    <Stack gap={6}>
      {liveQ.data && liveQ.data.length > 0 && (
        <div>
          <h4>Live progress stages</h4>
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Phase</TableHeader>
                  <TableHeader>Stage</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {liveQ.data.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell>{st.phaseLabel}</TableCell>
                    <TableCell>{st.label}</TableCell>
                    <TableCell>
                      <Select
                        id={`st-${st.id}`}
                        labelText=""
                        hideLabel
                        size="sm"
                        value={st.status}
                        onChange={(e) =>
                          updateStage.mutate({
                            id: st.id,
                            projectId,
                            status: e.target.value as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE",
                          })
                        }
                      >
                        <SelectItem value="NOT_STARTED" text="Not started" />
                        <SelectItem value="IN_PROGRESS" text="In progress" />
                        <SelectItem value="COMPLETE" text="Complete" />
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Snag register</h4>
        <Button size="sm" renderIcon={Add} onClick={() => setSnagOpen(true)}>
          Add snag
        </Button>
      </Stack>

      <DataState
        loading={snagsQ.isLoading}
        isEmpty={(snagsQ.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No snags", description: "Track punch-list items for handover." }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(snagsQ.data ?? []).map((sn) => (
                <TableRow key={sn.id}>
                  <TableCell>{sn.ref}</TableCell>
                  <TableCell>{sn.location ?? "—"}</TableCell>
                  <TableCell>{sn.description}</TableCell>
                  <TableCell>
                    <Select
                      id={`sn-${sn.id}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={sn.status}
                      onChange={(e) =>
                        updateSnag.mutate({
                          id: sn.id,
                          projectId,
                          status: e.target.value as SnagStatus,
                        })
                      }
                    >
                      {(Object.keys(SNAG_STATUS_LABEL) as SnagStatus[]).map((k) => (
                        <SelectItem key={k} value={k} text={SNAG_STATUS_LABEL[k]} />
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <div>
        <h4>Construction items (this project)</h4>
        {(constructionQ.data ?? []).length === 0 ?
          <p>No open coordination items.</p>
        : <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Kind</TableHeader>
                  <TableHeader>Subject</TableHeader>
                  <TableHeader>Review</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {(constructionQ.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{CONSTRUCTION_KIND_LABEL[c.kind as keyof typeof CONSTRUCTION_KIND_LABEL]}</TableCell>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell>{c.reviewCode ?? "—"}</TableCell>
                    <TableCell>
                      {["MATERIAL_SUBMITTAL", "SHOP_DRAWING"].includes(c.kind) && (
                        <Button kind="ghost" size="sm" onClick={() => setReviewId(c.id)}>
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        }
      </div>

      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Progress reports</h4>
        <Button
          size="sm"
          renderIcon={Add}
          onClick={() =>
            createReport.mutate({
              projectId,
              periodStart: monthStart.toISOString().slice(0, 10),
              periodEnd: monthEnd.toISOString().slice(0, 10),
            })
          }
        >
          New draft
        </Button>
      </Stack>

      {(reportsQ.data ?? []).length === 0 ?
        <p>No progress reports yet.</p>
      : <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Period</TableHeader>
                <TableHeader>Schedule %</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(reportsQ.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.periodStart} – {r.periodEnd}
                  </TableCell>
                  <TableCell>{r.scheduleProgressPct ?? 0}%</TableCell>
                  <TableCell>
                    <Tag type={r.status === "ISSUED" ? "green" : "gray"} size="sm">
                      {r.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {r.status === "DRAFT" && (
                      <Button
                        size="sm"
                        onClick={() => issueReport.mutate({ id: r.id, projectId })}
                      >
                        Issue PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      }
    </Stack>
  );

  return (
    <Stack gap={6}>
      <div>
        <h3>Project management (PMC)</h3>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Site construction schedule, coordination, snags, and progress reports.
        </p>
      </div>

      <Tabs selectedIndex={pmcTab} onChange={({ selectedIndex }) => setPmcTab(selectedIndex)}>
        <TabList aria-label="PMC sections" contained>
          <Tab>Hub</Tab>
          <Tab>Schedule</Tab>
          <Tab>Site ops</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>{hubPanel}</TabPanel>
          <TabPanel>
            <ProjectConstructionSchedule projectId={projectId} />
          </TabPanel>
          <TabPanel>{siteOpsPanel}</TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        open={snagOpen}
        modalHeading="Add snag"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setSnagOpen(false)}
        onRequestSubmit={() => {
          createSnag.mutate({
            projectId,
            location: snagForm.location || undefined,
            trade: snagForm.trade || undefined,
            description: snagForm.description,
          });
          setSnagForm({ location: "", trade: "", description: "" });
          setSnagOpen(false);
        }}
      >
        <Stack gap={4}>
          <TextInput
            id="sn-loc"
            labelText="Location"
            value={snagForm.location}
            onChange={(e) => setSnagForm((f) => ({ ...f, location: e.target.value }))}
          />
          <TextInput
            id="sn-trade"
            labelText="Trade"
            value={snagForm.trade}
            onChange={(e) => setSnagForm((f) => ({ ...f, trade: e.target.value }))}
          />
          <TextArea
            id="sn-desc"
            labelText="Description"
            value={snagForm.description}
            onChange={(e) => setSnagForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
        </Stack>
      </Modal>

      <Modal
        open={!!reviewId}
        modalHeading="Submittal review"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setReviewId(null)}
        onRequestSubmit={() => {
          if (!reviewId) return;
          review.mutate({
            id: reviewId,
            reviewCode: reviewForm.code,
            reviewNote: reviewForm.note || undefined,
            status: reviewForm.code === "C" ? "DECLINED" : "RESOLVED",
          });
          setReviewId(null);
        }}
      >
        <Stack gap={4}>
          <Select
            id="rv-code"
            labelText="Review code"
            value={reviewForm.code}
            onChange={(e) => setReviewForm((f) => ({ ...f, code: e.target.value as SubmittalReviewCode }))}
          >
            {(Object.keys(SUBMITTAL_REVIEW_LABEL) as SubmittalReviewCode[]).map((k) => (
              <SelectItem key={k} value={k} text={`${k} — ${SUBMITTAL_REVIEW_LABEL[k]}`} />
            ))}
          </Select>
          <TextArea
            id="rv-note"
            labelText="Note"
            value={reviewForm.note}
            onChange={(e) => setReviewForm((f) => ({ ...f, note: e.target.value }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
