/**
 * SOP closeout panels for an engagement detail — lessons, NC/CAPA, MoM,
 * WIP review, contract review, litigation hold.
 */
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  CONS_NC_STATUS_TAG,
  ConsNcSeverity,
  ConsNcStatus,
  ConsWipDecision,
  formatINR,
} from "@esti/contracts";
import { RowActionsMenu } from "../RowActionsMenu.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

/** Subset of `consultancy.engagements.get` used by closeout panels. */
type EngagementDetail = {
  id: string;
  litigationHold: boolean;
  retentionNote: string | null;
  feePosition: { wipPaise: number } | null;
  lessons: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    recommendation: string | null;
    status: string;
  }>;
  ncs: Array<{
    id: string;
    code: string;
    title: string;
    severity: string;
    status: string;
    correctiveAction: string | null;
    preventiveAction: string | null;
  }>;
  moms: Array<{
    id: string;
    ref: string;
    title: string;
    meetingDate: string;
    attendees: string | null;
    minutes: string | null;
    status: string;
  }>;
  wipReviews: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    wipPaise: number;
    decision: string;
    reviewedByName: string;
  }>;
  contractReviews: Array<{
    id: string;
    reviewDate: string;
    requirementsDefined: boolean;
    capabilityConfirmed: boolean;
    conflictChecked: boolean;
    proposalVsContractOk: boolean;
    decision: string;
    reviewerName: string;
  }>;
};

const NC_SEVERITIES = ConsNcSeverity.options;
const WIP_DECISIONS = ConsWipDecision.options;

export function EngagementCloseoutPanels({
  detail,
  canFees,
  onInvalidate,
}: {
  detail: EngagementDetail;
  canFees: boolean;
  onInvalidate: () => void;
}) {
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonCategory, setLessonCategory] = useState("GENERAL");
  const [lessonRec, setLessonRec] = useState("");

  const [ncOpen, setNcOpen] = useState(false);
  const [ncCode, setNcCode] = useState("");
  const [ncTitle, setNcTitle] = useState("");
  const [ncDesc, setNcDesc] = useState("");
  const [ncSeverity, setNcSeverity] = useState<ConsNcSeverity>("MINOR");
  const [ncCloseFor, setNcCloseFor] = useState<string | null>(null);
  const [ncCorrective, setNcCorrective] = useState("");
  const [ncPreventive, setNcPreventive] = useState("");

  const [momOpen, setMomOpen] = useState(false);
  const [momTitle, setMomTitle] = useState("");
  const [momDate, setMomDate] = useState("");
  const [momAttendees, setMomAttendees] = useState("");
  const [momMinutes, setMomMinutes] = useState("");

  const [wipOpen, setWipOpen] = useState(false);
  const [wipStart, setWipStart] = useState("");
  const [wipEnd, setWipEnd] = useState("");
  const [wipPaise, setWipPaise] = useState("");
  const [wipDecision, setWipDecision] = useState<ConsWipDecision>("HOLD");
  const [wipNotes, setWipNotes] = useState("");

  const [crOpen, setCrOpen] = useState(false);
  const [crDate, setCrDate] = useState("");
  const [crReq, setCrReq] = useState(false);
  const [crCap, setCrCap] = useState(false);
  const [crConflict, setCrConflict] = useState(false);
  const [crProposal, setCrProposal] = useState(false);
  const [crDecision, setCrDecision] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [crNotes, setCrNotes] = useState("");

  const [holdNote, setHoldNote] = useState(detail.retentionNote ?? "");

  const createLesson = trpc.consultancy.lessons.create.useMutation({
    meta: { errorTitle: "Couldn't record the lesson" },
    onSuccess: () => {
      onInvalidate();
      setLessonOpen(false);
    },
  });
  const publishLesson = trpc.consultancy.lessons.publish.useMutation({
    meta: { errorTitle: "Couldn't publish the lesson" },
    onSuccess: onInvalidate,
  });
  const removeLesson = trpc.consultancy.lessons.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the lesson" },
    onSuccess: onInvalidate,
  });

  const createNc = trpc.consultancy.ncs.create.useMutation({
    meta: { errorTitle: "Couldn't raise the NC" },
    onSuccess: () => {
      onInvalidate();
      setNcOpen(false);
    },
  });
  const advanceNc = trpc.consultancy.ncs.advance.useMutation({
    meta: { errorTitle: "Couldn't advance the NC" },
    onSuccess: onInvalidate,
  });
  const closeNc = trpc.consultancy.ncs.close.useMutation({
    meta: { errorTitle: "Couldn't close the NC" },
    onSuccess: () => {
      onInvalidate();
      setNcCloseFor(null);
    },
  });
  const removeNc = trpc.consultancy.ncs.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the NC" },
    onSuccess: onInvalidate,
  });

  const createMom = trpc.consultancy.moms.create.useMutation({
    meta: { errorTitle: "Couldn't record the MoM" },
    onSuccess: () => {
      onInvalidate();
      setMomOpen(false);
    },
  });
  const issueMom = trpc.consultancy.moms.issue.useMutation({
    meta: { errorTitle: "Couldn't issue the MoM" },
    onSuccess: onInvalidate,
  });
  const removeMom = trpc.consultancy.moms.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the MoM" },
    onSuccess: onInvalidate,
  });

  const createWip = trpc.consultancy.wipReviews.create.useMutation({
    meta: { errorTitle: "Couldn't record the WIP review" },
    onSuccess: () => {
      onInvalidate();
      setWipOpen(false);
    },
  });

  const createCr = trpc.consultancy.contractReviews.create.useMutation({
    meta: { errorTitle: "Couldn't record the contract review" },
    onSuccess: () => {
      onInvalidate();
      setCrOpen(false);
    },
  });

  const updateEng = trpc.consultancy.engagements.update.useMutation({
    meta: { errorTitle: "Couldn't update retention" },
    onSuccess: onInvalidate,
  });

  const lessons = detail.lessons ?? [];
  const ncs = detail.ncs ?? [];
  const moms = detail.moms ?? [];
  const wipReviews = detail.wipReviews ?? [];
  const contractReviews = detail.contractReviews ?? [];

  return (
    <>
      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Contract review
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setCrDate(new Date().toISOString().slice(0, 10));
              setCrReq(false);
              setCrCap(false);
              setCrConflict(false);
              setCrProposal(false);
              setCrDecision("PENDING");
              setCrNotes("");
              setCrOpen(true);
            }}
          >
            Record review
          </Button>
        </Stack>
        {contractReviews.length === 0 ? (
          <span className="esti-label esti-label--secondary">
            No contract review yet — ISO 9001 §8.2.3 checklist before LOA / signature.
          </span>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Contract reviews">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Checklist</TableCell>
                  <TableCell>Decision</TableCell>
                  <TableCell>Reviewer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contractReviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reviewDate}</TableCell>
                    <TableCell>
                      <span className="esti-label esti-label--secondary">
                        {[
                          r.requirementsDefined ? "req" : null,
                          r.capabilityConfirmed ? "cap" : null,
                          r.conflictChecked ? "coi" : null,
                          r.proposalVsContractOk ? "p↔c" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{r.decision}</TableCell>
                    <TableCell>{r.reviewerName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            NC / CAPA
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setNcCode(`NC-${String(ncs.length + 1).padStart(3, "0")}`);
              setNcTitle("");
              setNcDesc("");
              setNcSeverity("MINOR");
              setNcOpen(true);
            }}
          >
            Raise NC
          </Button>
        </Stack>
        {ncs.length === 0 ? (
          <span className="esti-label esti-label--secondary">
            No nonconformities on this engagement.
          </span>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="NC CAPA register">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {ncs.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.code}</TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell>{n.severity}</TableCell>
                    <TableCell>
                      <StatusTag value={n.status as ConsNcStatus} map={CONS_NC_STATUS_TAG} />
                    </TableCell>
                    <TableCell align="right">
                      <RowActionsMenu
                        actions={[
                          ...(n.status === "OPEN"
                            ? [
                                {
                                  label: "Start CAPA",
                                  onClick: () =>
                                    advanceNc.mutate({ id: n.id, status: "IN_PROGRESS" }),
                                },
                              ]
                            : []),
                          ...(n.status !== "CLOSED"
                            ? [
                                {
                                  label: "Close",
                                  onClick: () => {
                                    setNcCorrective(n.correctiveAction ?? "");
                                    setNcPreventive(n.preventiveAction ?? "");
                                    setNcCloseFor(n.id);
                                  },
                                },
                                {
                                  label: "Delete",
                                  danger: true,
                                  disabled: removeNc.isPending,
                                  onClick: () => removeNc.mutate({ id: n.id }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {canFees && (
        <Box sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
              WIP review
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getFullYear(), end.getMonth(), 1);
                setWipStart(start.toISOString().slice(0, 10));
                setWipEnd(end.toISOString().slice(0, 10));
                setWipPaise(String(Math.round((detail.feePosition?.wipPaise ?? 0) / 100)));
                setWipDecision("HOLD");
                setWipNotes("");
                setWipOpen(true);
              }}
            >
              Record decision
            </Button>
          </Stack>
          {wipReviews.length === 0 ? (
            <span className="esti-label esti-label--secondary">
              No monthly WIP decisions recorded yet.
            </span>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="WIP reviews">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">WIP</TableCell>
                    <TableCell>Decision</TableCell>
                    <TableCell>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wipReviews.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        {w.periodStart} → {w.periodEnd}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatINR(w.wipPaise)}
                      </TableCell>
                      <TableCell>{w.decision}</TableCell>
                      <TableCell>{w.reviewedByName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Minutes of meeting
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setMomTitle("");
              setMomDate(new Date().toISOString().slice(0, 10));
              setMomAttendees("");
              setMomMinutes("");
              setMomOpen(true);
            }}
          >
            Record MoM
          </Button>
        </Stack>
        {moms.length === 0 ? (
          <span className="esti-label esti-label--secondary">No MoMs on this engagement.</span>
        ) : (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {moms.map((m) => (
              <Box key={m.id} sx={{ p: 1.25, border: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} className="esti-grow">
                    {m.ref} · {m.title} · {m.meetingDate}
                  </Typography>
                  <span className="esti-label esti-label--secondary">{m.status}</span>
                  <RowActionsMenu
                    actions={[
                      ...(m.status === "DRAFT"
                        ? [
                            {
                              label: "Issue",
                              onClick: () => issueMom.mutate({ id: m.id }),
                            },
                            {
                              label: "Delete",
                              danger: true,
                              onClick: () => removeMom.mutate({ id: m.id }),
                            },
                          ]
                        : []),
                    ]}
                  />
                </Stack>
                {m.attendees && (
                  <span className="esti-label esti-label--secondary">Attendees: {m.attendees}</span>
                )}
                {m.minutes && <Typography variant="body2">{m.minutes}</Typography>}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Lessons learned
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setLessonCategory("GENERAL");
              setLessonTitle("");
              setLessonBody("");
              setLessonRec("");
              setLessonOpen(true);
            }}
          >
            Add lesson
          </Button>
        </Stack>
        {lessons.length === 0 ? (
          <span className="esti-label esti-label--secondary">
            No lessons yet — published lessons feed go/no-go and fee benchmarks.
          </span>
        ) : (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {lessons.map((l) => (
              <Box key={l.id} sx={{ p: 1.25, border: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} className="esti-grow">
                    {l.title}
                  </Typography>
                  <span className="esti-label esti-label--secondary">
                    {l.category} · {l.status}
                  </span>
                  <RowActionsMenu
                    actions={[
                      ...(l.status === "DRAFT"
                        ? [
                            {
                              label: "Publish",
                              onClick: () => publishLesson.mutate({ id: l.id }),
                            },
                          ]
                        : []),
                      {
                        label: "Delete",
                        danger: true,
                        onClick: () => removeLesson.mutate({ id: l.id }),
                      },
                    ]}
                  />
                </Stack>
                <Typography variant="body2">{l.body}</Typography>
                {l.recommendation && (
                  <span className="esti-label esti-label--secondary">
                    Recommendation: {l.recommendation}
                  </span>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ pt: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          Retention / litigation hold
        </Typography>
        <Stack spacing={1} sx={{ mt: 0.5, maxWidth: 480 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(detail.litigationHold)}
                onChange={(e) =>
                  updateEng.mutate({
                    id: detail.id,
                    litigationHold: e.target.checked,
                    retentionNote: holdNote || undefined,
                  })
                }
              />
            }
            label="Litigation hold — suspend archival destruction"
          />
          <TextField
            size="small"
            label="Retention note"
            value={holdNote}
            onChange={(e) => setHoldNote(e.target.value)}
            onBlur={() => {
              if ((detail.retentionNote ?? "") !== holdNote) {
                updateEng.mutate({ id: detail.id, retentionNote: holdNote || undefined });
              }
            }}
            multiline
            minRows={2}
          />
        </Stack>
      </Box>

      <Dialog open={lessonOpen} onClose={() => setLessonOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Lesson learned</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Category"
              value={lessonCategory}
              onChange={(e) => setLessonCategory(e.target.value)}
              size="small"
            />
            <TextField
              label="Title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="What happened"
              value={lessonBody}
              onChange={(e) => setLessonBody(e.target.value)}
              multiline
              minRows={3}
              required
            />
            <TextField
              label="Recommendation"
              value={lessonRec}
              onChange={(e) => setLessonRec(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLessonOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!lessonTitle.trim() || !lessonBody.trim() || createLesson.isPending}
            onClick={() =>
              createLesson.mutate({
                engagementId: detail.id,
                category: lessonCategory.trim() || "GENERAL",
                title: lessonTitle.trim(),
                body: lessonBody.trim(),
                recommendation: lessonRec.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ncOpen} onClose={() => setNcOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise nonconformity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Code" value={ncCode} onChange={(e) => setNcCode(e.target.value)} required />
            <TextField label="Title" value={ncTitle} onChange={(e) => setNcTitle(e.target.value)} required />
            <TextField
              select
              label="Severity"
              value={ncSeverity}
              onChange={(e) => setNcSeverity(e.target.value as ConsNcSeverity)}
            >
              {NC_SEVERITIES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={ncDesc}
              onChange={(e) => setNcDesc(e.target.value)}
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNcOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!ncCode.trim() || !ncTitle.trim() || createNc.isPending}
            onClick={() =>
              createNc.mutate({
                engagementId: detail.id,
                code: ncCode.trim(),
                title: ncTitle.trim(),
                description: ncDesc.trim() || undefined,
                severity: ncSeverity,
              })
            }
          >
            Raise
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!ncCloseFor} onClose={() => setNcCloseFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Close NC with CAPA</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Corrective action"
              value={ncCorrective}
              onChange={(e) => setNcCorrective(e.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              label="Preventive action"
              value={ncPreventive}
              onChange={(e) => setNcPreventive(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNcCloseFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!ncCloseFor || closeNc.isPending}
            onClick={() =>
              closeNc.mutate({
                id: ncCloseFor!,
                correctiveAction: ncCorrective.trim() || undefined,
                preventiveAction: ncPreventive.trim() || undefined,
              })
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={momOpen} onClose={() => setMomOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Minutes of meeting</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={momTitle} onChange={(e) => setMomTitle(e.target.value)} required />
            <TextField
              type="date"
              label="Meeting date"
              value={momDate}
              onChange={(e) => setMomDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <TextField
              label="Attendees"
              value={momAttendees}
              onChange={(e) => setMomAttendees(e.target.value)}
            />
            <TextField
              label="Minutes"
              value={momMinutes}
              onChange={(e) => setMomMinutes(e.target.value)}
              multiline
              minRows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMomOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!momTitle.trim() || !momDate || createMom.isPending}
            onClick={() =>
              createMom.mutate({
                engagementId: detail.id,
                title: momTitle.trim(),
                meetingDate: momDate,
                attendees: momAttendees.trim() || undefined,
                minutes: momMinutes.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={wipOpen} onClose={() => setWipOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>WIP review decision</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="date"
              label="Period start"
              value={wipStart}
              onChange={(e) => setWipStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              label="Period end"
              value={wipEnd}
              onChange={(e) => setWipEnd(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="WIP (₹)"
              value={wipPaise}
              onChange={(e) => setWipPaise(e.target.value)}
              inputMode="decimal"
            />
            <TextField
              select
              label="Decision"
              value={wipDecision}
              onChange={(e) => setWipDecision(e.target.value as ConsWipDecision)}
            >
              {WIP_DECISIONS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              value={wipNotes}
              onChange={(e) => setWipNotes(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWipOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!wipStart || !wipEnd || createWip.isPending}
            onClick={() =>
              createWip.mutate({
                engagementId: detail.id,
                periodStart: wipStart,
                periodEnd: wipEnd,
                wipPaise: Math.round(Number(wipPaise || 0) * 100),
                decision: wipDecision,
                notes: wipNotes.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={crOpen} onClose={() => setCrOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Contract review</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              type="date"
              label="Review date"
              value={crDate}
              onChange={(e) => setCrDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={<Checkbox checked={crReq} onChange={(e) => setCrReq(e.target.checked)} />}
              label="Requirements defined (incl. unstated + statutory)"
            />
            <FormControlLabel
              control={<Checkbox checked={crCap} onChange={(e) => setCrCap(e.target.checked)} />}
              label="Capability to deliver confirmed"
            />
            <FormControlLabel
              control={
                <Checkbox checked={crConflict} onChange={(e) => setCrConflict(e.target.checked)} />
              }
              label="Conflict of interest checked"
            />
            <FormControlLabel
              control={
                <Checkbox checked={crProposal} onChange={(e) => setCrProposal(e.target.checked)} />
              }
              label="Proposal vs contract differences resolved"
            />
            <TextField
              select
              label="Decision"
              value={crDecision}
              onChange={(e) =>
                setCrDecision(e.target.value as "PENDING" | "APPROVED" | "REJECTED")
              }
            >
              <MenuItem value="PENDING">PENDING</MenuItem>
              <MenuItem value="APPROVED">APPROVED</MenuItem>
              <MenuItem value="REJECTED">REJECTED</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              value={crNotes}
              onChange={(e) => setCrNotes(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!crDate || createCr.isPending}
            onClick={() =>
              createCr.mutate({
                engagementId: detail.id,
                reviewDate: crDate,
                requirementsDefined: crReq,
                capabilityConfirmed: crCap,
                conflictChecked: crConflict,
                proposalVsContractOk: crProposal,
                decision: crDecision,
                notes: crNotes.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
