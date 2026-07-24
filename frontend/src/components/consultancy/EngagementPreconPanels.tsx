/**
 * Pre-construction R&O panels — opportunity register + design phase gates.
 * Consultancy scope (docs/esti/AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md).
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
  CONS_OPPORTUNITY_STATUS_TAG,
  CONS_PHASE_GATE_LABEL,
  CONSULTANCY_PHASE_GATE_CHECKLIST,
  ConsPhaseGateKey,
  OPPORTUNITY_AREA_LABEL,
  OPPORTUNITY_RESPONSE_LABEL,
  OpportunityArea,
  OpportunityResponse,
  OpportunitySource,
  OpportunityStatus,
  opportunityPriority,
  opportunityScore,
} from "@esti/contracts";
import { RowActionsMenu } from "../RowActionsMenu.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type OpportunityRow = {
  id: string;
  title: string;
  source: string;
  area: string;
  probability: number;
  impact: number;
  response: string;
  owner: string | null;
  actionPlan: string | null;
  status: string;
};

type PhaseGateRow = {
  id: string;
  gateKey: string;
  checklist: Record<string, boolean> | null;
  decision: string;
  notes: string | null;
  decidedByName: string | null;
};

const SOURCES = OpportunitySource.options;
const AREAS = OpportunityArea.options;
const RESPONSES = OpportunityResponse.options;
const GATES = ConsPhaseGateKey.options;

export function EngagementPreconPanels({
  engagementId,
  opportunities,
  phaseGates,
  onInvalidate,
}: {
  engagementId: string;
  opportunities: OpportunityRow[];
  phaseGates: PhaseGateRow[];
  onInvalidate: () => void;
}) {
  const [oppOpen, setOppOpen] = useState(false);
  const [oppTitle, setOppTitle] = useState("");
  const [oppSource, setOppSource] = useState<OpportunitySource>("WORKSHOP");
  const [oppArea, setOppArea] = useState<OpportunityArea>("DESIGN");
  const [oppP, setOppP] = useState("3");
  const [oppI, setOppI] = useState("3");
  const [oppResponse, setOppResponse] = useState<OpportunityResponse>("ENHANCE");
  const [oppOwner, setOppOwner] = useState("");
  const [oppAction, setOppAction] = useState("");
  const [oppValue, setOppValue] = useState("");

  const [gateOpen, setGateOpen] = useState(false);
  const [gateKey, setGateKey] = useState<ConsPhaseGateKey>("CONCEPT");
  const [gateChecks, setGateChecks] = useState<Record<string, boolean>>({});
  const [gateDecision, setGateDecision] = useState<"PENDING" | "GO" | "HOLD" | "NO_GO">("PENDING");
  const [gateNotes, setGateNotes] = useState("");

  const createOpp = trpc.consultancy.opportunities.create.useMutation({
    meta: { errorTitle: "Couldn't record the opportunity" },
    onSuccess: () => {
      onInvalidate();
      setOppOpen(false);
    },
  });
  const updateOpp = trpc.consultancy.opportunities.update.useMutation({
    meta: { errorTitle: "Couldn't update the opportunity" },
    onSuccess: onInvalidate,
  });
  const removeOpp = trpc.consultancy.opportunities.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the opportunity" },
    onSuccess: onInvalidate,
  });
  const upsertGate = trpc.consultancy.phaseGates.upsert.useMutation({
    meta: { errorTitle: "Couldn't save the phase gate" },
    onSuccess: () => {
      onInvalidate();
      setGateOpen(false);
    },
  });

  function openGate(key: ConsPhaseGateKey) {
    const existing = phaseGates.find((g) => g.gateKey === key);
    setGateKey(key);
    setGateChecks(
      existing?.checklist && typeof existing.checklist === "object" ? { ...existing.checklist } : {},
    );
    setGateDecision(
      (existing?.decision as "PENDING" | "GO" | "HOLD" | "NO_GO" | undefined) ?? "PENDING",
    );
    setGateNotes(existing?.notes ?? "");
    setGateOpen(true);
  }

  return (
    <>
      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Opportunities
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setOppTitle("");
              setOppSource("WORKSHOP");
              setOppArea("DESIGN");
              setOppP("3");
              setOppI("3");
              setOppResponse("ENHANCE");
              setOppOwner("");
              setOppAction("");
              setOppValue("");
              setOppOpen(true);
            }}
          >
            Add opportunity
          </Button>
        </Stack>
        {opportunities.length === 0 ? (
          <span className="esti-label esti-label--secondary">
            No opportunities yet — capture value from workshops, design reviews, and lessons
            (pre-construction R&amp;O).
          </span>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Opportunity register">
              <TableHead>
                <TableRow>
                  <TableCell>Opportunity</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell>Response</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.map((o) => {
                  const pri = opportunityPriority(o.probability, o.impact);
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <span>{o.title}</span>
                          <span className="esti-label esti-label--secondary">
                            {OPPORTUNITY_AREA_LABEL[o.area as OpportunityArea] ?? o.area}
                            {" · "}
                            {pri}
                            {o.owner ? ` · ${o.owner}` : ""}
                          </span>
                        </Stack>
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {`${o.probability}×${o.impact} = ${opportunityScore(o.probability, o.impact)}`}
                      </TableCell>
                      <TableCell>
                        {OPPORTUNITY_RESPONSE_LABEL[o.response as OpportunityResponse] ?? o.response}
                      </TableCell>
                      <TableCell>
                        <StatusTag
                          value={o.status as OpportunityStatus}
                          map={CONS_OPPORTUNITY_STATUS_TAG}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <RowActionsMenu
                          actions={[
                            ...(o.status === "OPEN"
                              ? [
                                  {
                                    label: "Mark in progress",
                                    onClick: () =>
                                      updateOpp.mutate({ id: o.id, status: "IN_PROGRESS" }),
                                  },
                                ]
                              : []),
                            ...(o.status !== "REALIZED" && o.status !== "CLOSED"
                              ? [
                                  {
                                    label: "Mark realized",
                                    onClick: () =>
                                      updateOpp.mutate({ id: o.id, status: "REALIZED" }),
                                  },
                                ]
                              : []),
                            ...(o.status !== "CLOSED"
                              ? [
                                  {
                                    label: "Close",
                                    onClick: () => updateOpp.mutate({ id: o.id, status: "CLOSED" }),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              danger: true,
                              onClick: () => removeOpp.mutate({ id: o.id }),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box sx={{ pt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Design phase gates
          </Typography>
          <Button size="small" variant="text" onClick={() => openGate("CONCEPT")}>
            Record gate
          </Button>
        </Stack>
        <span className="esti-label esti-label--secondary">
          Go / hold / no-go for design stages — not construction readiness.
        </span>
        <Stack spacing={0.5} sx={{ mt: 0.75 }}>
          {GATES.map((key) => {
            const g = phaseGates.find((x) => x.gateKey === key);
            return (
              <Stack key={key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" className="esti-grow">
                  {CONS_PHASE_GATE_LABEL[key]}
                </Typography>
                <span className="esti-label esti-label--secondary">
                  {g ? `${g.decision}${g.decidedByName ? ` · ${g.decidedByName}` : ""}` : "—"}
                </span>
                <Button size="small" variant="text" onClick={() => openGate(key)}>
                  {g ? "Update" : "Open"}
                </Button>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Dialog open={oppOpen} onClose={() => setOppOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Opportunity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={oppTitle}
              onChange={(e) => setOppTitle(e.target.value)}
              required
              autoFocus
            />
            <TextField
              select
              label="Source"
              value={oppSource}
              onChange={(e) => setOppSource(e.target.value as OpportunitySource)}
            >
              {SOURCES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Area"
              value={oppArea}
              onChange={(e) => setOppArea(e.target.value as OpportunityArea)}
            >
              {AREAS.map((a) => (
                <MenuItem key={a} value={a}>
                  {OPPORTUNITY_AREA_LABEL[a]}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Probability (1–5)"
                value={oppP}
                onChange={(e) => setOppP(e.target.value)}
                inputMode="numeric"
              />
              <TextField
                label="Impact (1–5)"
                value={oppI}
                onChange={(e) => setOppI(e.target.value)}
                inputMode="numeric"
              />
            </Stack>
            <TextField
              select
              label="Response"
              value={oppResponse}
              onChange={(e) => setOppResponse(e.target.value as OpportunityResponse)}
            >
              {RESPONSES.map((r) => (
                <MenuItem key={r} value={r}>
                  {OPPORTUNITY_RESPONSE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Owner" value={oppOwner} onChange={(e) => setOppOwner(e.target.value)} />
            <TextField
              label="Action plan"
              value={oppAction}
              onChange={(e) => setOppAction(e.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              label="Value note"
              value={oppValue}
              onChange={(e) => setOppValue(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOppOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!oppTitle.trim() || createOpp.isPending}
            onClick={() =>
              createOpp.mutate({
                engagementId,
                title: oppTitle.trim(),
                source: oppSource,
                area: oppArea,
                probability: Math.min(5, Math.max(1, Number(oppP) || 3)),
                impact: Math.min(5, Math.max(1, Number(oppI) || 3)),
                response: oppResponse,
                owner: oppOwner.trim() || undefined,
                actionPlan: oppAction.trim() || undefined,
                valueNote: oppValue.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{CONS_PHASE_GATE_LABEL[gateKey]} gate</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            <TextField
              select
              label="Gate"
              value={gateKey}
              onChange={(e) => openGate(e.target.value as ConsPhaseGateKey)}
            >
              {GATES.map((g) => (
                <MenuItem key={g} value={g}>
                  {CONS_PHASE_GATE_LABEL[g]}
                </MenuItem>
              ))}
            </TextField>
            {CONSULTANCY_PHASE_GATE_CHECKLIST.map((c) => (
              <FormControlLabel
                key={c.key}
                control={
                  <Checkbox
                    checked={Boolean(gateChecks[c.key])}
                    onChange={(e) =>
                      setGateChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))
                    }
                  />
                }
                label={c.label}
              />
            ))}
            <TextField
              select
              label="Decision"
              value={gateDecision}
              onChange={(e) =>
                setGateDecision(e.target.value as "PENDING" | "GO" | "HOLD" | "NO_GO")
              }
            >
              <MenuItem value="PENDING">PENDING</MenuItem>
              <MenuItem value="GO">GO</MenuItem>
              <MenuItem value="HOLD">HOLD</MenuItem>
              <MenuItem value="NO_GO">NO_GO</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              value={gateNotes}
              onChange={(e) => setGateNotes(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={upsertGate.isPending}
            onClick={() =>
              upsertGate.mutate({
                engagementId,
                gateKey,
                checklist: gateChecks,
                decision: gateDecision,
                notes: gateNotes.trim() || undefined,
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
