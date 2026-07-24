/**
 * AORMS-Studio — project pre-construction R&O panel.
 * Risks, opportunities, design phase gates (shared framework with consultancy).
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
  CONS_RISK_STATUS_TAG,
  CONSULTANCY_PHASE_GATE_CHECKLIST,
  ConsPhaseGateKey,
  OPPORTUNITY_AREA_LABEL,
  OPPORTUNITY_RESPONSE_LABEL,
  OpportunityArea,
  OpportunityResponse,
  OpportunitySource,
  OpportunityStatus,
  RISK_RESPONSE_LABEL,
  RiskResponse,
  RiskStatus,
  opportunityPriority,
  opportunityScore,
} from "@esti/contracts";
import { RowActionsMenu } from "../RowActionsMenu.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

const SOURCES = OpportunitySource.options;
const AREAS = OpportunityArea.options;
const OPP_RESPONSES = OpportunityResponse.options;
const RISK_RESPONSES = RiskResponse.options;
const GATES = ConsPhaseGateKey.options;

export function ProjectPreconPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.projectPrecon.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const invalidate = () => utils.projectPrecon.listByProject.invalidate({ projectId });

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskTitle, setRiskTitle] = useState("");
  const [riskL, setRiskL] = useState("3");
  const [riskI, setRiskI] = useState("3");
  const [riskResponse, setRiskResponse] = useState<RiskResponse>("REDUCE");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");

  const [oppOpen, setOppOpen] = useState(false);
  const [oppTitle, setOppTitle] = useState("");
  const [oppSource, setOppSource] = useState<OpportunitySource>("WORKSHOP");
  const [oppArea, setOppArea] = useState<OpportunityArea>("DESIGN");
  const [oppP, setOppP] = useState("3");
  const [oppI, setOppI] = useState("3");
  const [oppResponse, setOppResponse] = useState<OpportunityResponse>("ENHANCE");
  const [oppOwner, setOppOwner] = useState("");
  const [oppAction, setOppAction] = useState("");

  const [gateOpen, setGateOpen] = useState(false);
  const [gateKey, setGateKey] = useState<ConsPhaseGateKey>("CONCEPT");
  const [gateChecks, setGateChecks] = useState<Record<string, boolean>>({});
  const [gateDecision, setGateDecision] = useState<"PENDING" | "GO" | "HOLD" | "NO_GO">("PENDING");
  const [gateNotes, setGateNotes] = useState("");

  const createRisk = trpc.projectPrecon.createRisk.useMutation({
    meta: { errorTitle: "Couldn't raise the risk" },
    onSuccess: () => {
      invalidate();
      setRiskOpen(false);
    },
  });
  const updateRisk = trpc.projectPrecon.updateRisk.useMutation({
    meta: { errorTitle: "Couldn't update the risk" },
    onSuccess: invalidate,
  });
  const removeRisk = trpc.projectPrecon.removeRisk.useMutation({
    meta: { errorTitle: "Couldn't delete the risk" },
    onSuccess: invalidate,
  });
  const createOpp = trpc.projectPrecon.createOpportunity.useMutation({
    meta: { errorTitle: "Couldn't record the opportunity" },
    onSuccess: () => {
      invalidate();
      setOppOpen(false);
    },
  });
  const updateOpp = trpc.projectPrecon.updateOpportunity.useMutation({
    meta: { errorTitle: "Couldn't update the opportunity" },
    onSuccess: invalidate,
  });
  const removeOpp = trpc.projectPrecon.removeOpportunity.useMutation({
    meta: { errorTitle: "Couldn't delete the opportunity" },
    onSuccess: invalidate,
  });
  const upsertGate = trpc.projectPrecon.upsertPhaseGate.useMutation({
    meta: { errorTitle: "Couldn't save the phase gate" },
    onSuccess: () => {
      invalidate();
      setGateOpen(false);
    },
  });

  function openGate(key: ConsPhaseGateKey) {
    const existing = q.data?.phaseGates.find((g) => g.gateKey === key);
    setGateKey(key);
    setGateChecks(
      existing?.checklist && typeof existing.checklist === "object"
        ? { ...(existing.checklist as Record<string, boolean>) }
        : {},
    );
    setGateDecision(
      (existing?.decision as "PENDING" | "GO" | "HOLD" | "NO_GO" | undefined) ?? "PENDING",
    );
    setGateNotes(existing?.notes ?? "");
    setGateOpen(true);
  }

  if (q.isLoading) {
    return <span className="esti-label esti-label--secondary">Loading R&amp;O…</span>;
  }
  if (q.isError) {
    return (
      <Typography variant="body2" color="error">
        {q.error.message}
      </Typography>
    );
  }

  const risks = q.data?.risks ?? [];
  const opportunities = q.data?.opportunities ?? [];
  const phaseGates = q.data?.phaseGates ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pre-construction risk &amp; opportunity — planning and design gates for this Studio
        project. Same framework as AORMS-Consultancy (not construction readiness).
      </Typography>

      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
            Risks
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setRiskTitle("");
              setRiskL("3");
              setRiskI("3");
              setRiskResponse("REDUCE");
              setRiskOwner("");
              setRiskMitigation("");
              setRiskOpen(true);
            }}
          >
            Add risk
          </Button>
        </Stack>
        {risks.length === 0 ? (
          <span className="esti-label esti-label--secondary">No risks on this project yet.</span>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Project risk register">
              <TableHead>
                <TableRow>
                  <TableCell>Risk</TableCell>
                  <TableCell align="center">Inherent</TableCell>
                  <TableCell>Response</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {risks.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <span>{r.title}</span>
                        {r.mitigation && (
                          <span className="esti-label esti-label--secondary">
                            Mitigation: {r.mitigation}
                          </span>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {`${r.likelihood}×${r.impact} = ${(r.likelihood ?? 0) * (r.impact ?? 0)}`}
                    </TableCell>
                    <TableCell>
                      {RISK_RESPONSE_LABEL[r.response as RiskResponse] ?? r.response}
                    </TableCell>
                    <TableCell>
                      <StatusTag value={r.status as RiskStatus} map={CONS_RISK_STATUS_TAG} />
                    </TableCell>
                    <TableCell align="right">
                      <RowActionsMenu
                        actions={[
                          ...(r.status === "OPEN"
                            ? [
                                {
                                  label: "Mark mitigated",
                                  onClick: () =>
                                    updateRisk.mutate({ id: r.id, status: "MITIGATED" }),
                                },
                              ]
                            : []),
                          ...(r.status !== "CLOSED"
                            ? [
                                {
                                  label: "Close",
                                  onClick: () => updateRisk.mutate({ id: r.id, status: "CLOSED" }),
                                },
                              ]
                            : []),
                          {
                            label: "Delete",
                            danger: true,
                            onClick: () => removeRisk.mutate({ id: r.id }),
                          },
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

      <Box>
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
              setOppOpen(true);
            }}
          >
            Add opportunity
          </Button>
        </Stack>
        {opportunities.length === 0 ? (
          <span className="esti-label esti-label--secondary">No opportunities recorded yet.</span>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Project opportunity register">
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
                {opportunities.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <span>{o.title}</span>
                        <span className="esti-label esti-label--secondary">
                          {OPPORTUNITY_AREA_LABEL[o.area as OpportunityArea] ?? o.area}
                          {" · "}
                          {opportunityPriority(o.probability, o.impact)}
                        </span>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {`${o.probability}×${o.impact} = ${opportunityScore(o.probability, o.impact)}`}
                    </TableCell>
                    <TableCell>
                      {OPPORTUNITY_RESPONSE_LABEL[o.response as OpportunityResponse] ??
                        o.response}
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
                          ...(o.status !== "REALIZED" && o.status !== "CLOSED"
                            ? [
                                {
                                  label: "Mark realized",
                                  onClick: () =>
                                    updateOpp.mutate({ id: o.id, status: "REALIZED" }),
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          Design phase gates
        </Typography>
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

      <Dialog open={riskOpen} onClose={() => setRiskOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Project risk</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={riskTitle}
              onChange={(e) => setRiskTitle(e.target.value)}
              required
              autoFocus
            />
            <Stack direction="row" spacing={1}>
              <TextField
                label="Likelihood (1–5)"
                value={riskL}
                onChange={(e) => setRiskL(e.target.value)}
                inputMode="numeric"
              />
              <TextField
                label="Impact (1–5)"
                value={riskI}
                onChange={(e) => setRiskI(e.target.value)}
                inputMode="numeric"
              />
            </Stack>
            <TextField
              select
              label="Response"
              value={riskResponse}
              onChange={(e) => setRiskResponse(e.target.value as RiskResponse)}
            >
              {RISK_RESPONSES.map((r) => (
                <MenuItem key={r} value={r}>
                  {RISK_RESPONSE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Owner" value={riskOwner} onChange={(e) => setRiskOwner(e.target.value)} />
            <TextField
              label="Mitigation"
              value={riskMitigation}
              onChange={(e) => setRiskMitigation(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRiskOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!riskTitle.trim() || createRisk.isPending}
            onClick={() =>
              createRisk.mutate({
                projectId,
                title: riskTitle.trim(),
                likelihood: Math.min(5, Math.max(1, Number(riskL) || 3)),
                impact: Math.min(5, Math.max(1, Number(riskI) || 3)),
                response: riskResponse,
                owner: riskOwner.trim() || undefined,
                mitigation: riskMitigation.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

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
              {OPP_RESPONSES.map((r) => (
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOppOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!oppTitle.trim() || createOpp.isPending}
            onClick={() =>
              createOpp.mutate({
                projectId,
                title: oppTitle.trim(),
                source: oppSource,
                area: oppArea,
                probability: Math.min(5, Math.max(1, Number(oppP) || 3)),
                impact: Math.min(5, Math.max(1, Number(oppI) || 3)),
                response: oppResponse,
                owner: oppOwner.trim() || undefined,
                actionPlan: oppAction.trim() || undefined,
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
                projectId,
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
    </Stack>
  );
}
