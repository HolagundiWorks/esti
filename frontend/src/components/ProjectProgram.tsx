import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  ProgressBar,
  Select,
  SelectItem,
  Stack,
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
import { Add, TrashCan } from "@carbon/icons-react";
import {
  PROGRAM_SPACE_CATEGORY_LABEL,
  PROGRAM_STATUS_LABEL,
  PROGRAM_STATUS_TAG,
  ProgramSpaceCategory,
  can,
  type ProgramStatus,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

function area(n: number): string {
  return (Number.isInteger(n) ? n : Number(n.toFixed(2))).toLocaleString("en-IN");
}
function floorLabel(level: number): string {
  if (level === 0) return "Ground";
  if (level < 0) return `Basement ${Math.abs(level)}`;
  return `Floor ${level}`;
}

export function ProjectProgram({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const utils = trpc.useUtils();

  const q = trpc.program.summary.useQuery({ projectId });
  const data = q.data;

  const inv = () => utils.program.summary.invalidate({ projectId });
  const getOrCreate = trpc.program.getOrCreate.useMutation({ onSuccess: inv });
  const freeze = trpc.program.freeze.useMutation({ onSuccess: inv });
  const newVersion = trpc.program.newVersion.useMutation({ onSuccess: inv });
  const removeSpace = trpc.program.removeSpace.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const blank = { name: "", category: "BEDROOM", floorLevel: "0", unitAreaSqm: "", count: "1", notes: "" };
  const [form, setForm] = useState(blank);
  const addSpace = trpc.program.addSpace.useMutation({
    onSuccess: () => { inv(); setOpen(false); setForm(blank); },
  });

  if (q.isLoading) return <p className="esti-label--secondary">Loading program…</p>;

  // No program yet — offer to start one.
  if (!data) {
    return (
      <Stack gap={5}>
        <h4 style={{ margin: 0 }}>Program formulation</h4>
        <p className="esti-label--secondary">
          The program is the space schedule formulated within the feasibility envelope.
          Record the pre-project assessment in the Pipeline tab to set the maximum built
          extent, then start the program here.
        </p>
        {canWrite && (
          <div>
            <Button onClick={() => getOrCreate.mutate({ projectId })} disabled={getOrCreate.isPending}>
              {getOrCreate.isPending ? "Starting…" : "Start program"}
            </Button>
          </div>
        )}
      </Stack>
    );
  }

  const { program, spaces, totalProgrammedAreaSqm, maxBuiltAreaSqm, utilizationPct, remainingAreaSqm, overEnvelope, floorsUsed, byFloor, byCategory } = data;
  const status = program.status as ProgramStatus;
  const frozen = status === "FROZEN";
  const editable = canWrite && !frozen;

  return (
    <Stack gap={6}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0 }}>Program formulation</h4>
        <Tag type="gray" size="sm">v{program.version}</Tag>
        <Tag type={PROGRAM_STATUS_TAG[status] ?? "gray"} size="sm">{PROGRAM_STATUS_LABEL[status] ?? status}</Tag>
        {overEnvelope && <Tag type="red" size="sm">Over feasibility envelope</Tag>}
      </div>

      {/* KPI strip — feasibility envelope is the source of truth */}
      <Grid condensed>
        {[
          { label: "Max built extent (feasibility)", value: maxBuiltAreaSqm > 0 ? `${area(maxBuiltAreaSqm)} sqm` : "—" },
          { label: "Programmed area", value: `${area(totalProgrammedAreaSqm)} sqm` },
          { label: "Remaining", value: remainingAreaSqm == null ? "—" : `${area(remainingAreaSqm)} sqm` },
          { label: "Floors used", value: String(floorsUsed) },
        ].map((k) => (
          <Column key={k.label} sm={2} md={4} lg={4}>
            <Tile style={{ padding: "var(--cds-spacing-04)" }}>
              <p className="esti-label--secondary">{k.label}</p>
              <p style={{ fontSize: "1.125rem", fontWeight: 600, marginTop: "var(--cds-spacing-02)" }}>{k.value}</p>
            </Tile>
          </Column>
        ))}
      </Grid>

      {utilizationPct != null && (
        <ProgressBar
          label="Envelope utilization"
          helperText={`${utilizationPct.toFixed(1)}% of the feasibility max built extent`}
          value={Math.min(100, utilizationPct)}
          max={100}
          status={overEnvelope ? "error" : "active"}
        />
      )}
      {maxBuiltAreaSqm <= 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No feasibility envelope"
          subtitle="Record a pre-project assessment (Pipeline tab) so the program can be checked against the max built extent."
        />
      )}
      {overEnvelope && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Program exceeds the feasibility envelope"
          subtitle="The programmed area is larger than the feasible max built extent. Reduce the program or revisit the assessment — this is advisory, not blocking."
        />
      )}

      {/* Spaces */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)" }}>
        <h5 style={{ margin: 0 }}>Spaces</h5>
        {editable && <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setOpen(true)}>Add space</Button>}
      </div>
      {spaces.length === 0 ? (
        <p className="esti-label--secondary">No spaces yet. Add rooms/spaces from the client requirements.</p>
      ) : (
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Space</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Floor</TableHeader>
                <TableHeader>Unit area</TableHeader>
                <TableHeader>Count</TableHeader>
                <TableHeader>Area</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {spaces.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{PROGRAM_SPACE_CATEGORY_LABEL[s.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL] ?? s.category}</TableCell>
                  <TableCell>{floorLabel(s.floorLevel)}</TableCell>
                  <TableCell>{area(s.unitAreaSqm)} sqm</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell>{area(s.areaSqm)} sqm</TableCell>
                  <TableCell>
                    {editable && (
                      <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Remove"
                        disabled={removeSpace.isPending}
                        onClick={() => removeSpace.mutate({ id: s.id, programId: program.id })} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rollups */}
      {spaces.length > 0 && (
        <Grid condensed>
          <Column sm={4} md={4} lg={8}>
            <TableContainer title="By floor">
              <Table size="sm">
                <TableHead><TableRow><TableHeader>Floor</TableHeader><TableHeader>Spaces</TableHeader><TableHeader>Area</TableHeader></TableRow></TableHead>
                <TableBody>
                  {byFloor.map((f) => (
                    <TableRow key={f.floorLevel}>
                      <TableCell>{floorLabel(f.floorLevel)}</TableCell>
                      <TableCell>{f.spaceCount}</TableCell>
                      <TableCell>{area(f.areaSqm)} sqm</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Column>
          <Column sm={4} md={4} lg={8}>
            <TableContainer title="By category">
              <Table size="sm">
                <TableHead><TableRow><TableHeader>Category</TableHeader><TableHeader>Spaces</TableHeader><TableHeader>Area</TableHeader></TableRow></TableHead>
                <TableBody>
                  {byCategory.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell>{PROGRAM_SPACE_CATEGORY_LABEL[c.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL] ?? c.category}</TableCell>
                      <TableCell>{c.spaceCount}</TableCell>
                      <TableCell>{area(c.areaSqm)} sqm</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Column>
        </Grid>
      )}

      {/* Version controls */}
      {canWrite && (
        <div style={{ display: "flex", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
          {!frozen ? (
            <Button kind="primary" size="sm" disabled={freeze.isPending} onClick={() => freeze.mutate({ programId: program.id })}>
              {freeze.isPending ? "Freezing…" : "Freeze program (set revision baseline)"}
            </Button>
          ) : (
            <Button kind="secondary" size="sm" disabled={newVersion.isPending} onClick={() => newVersion.mutate({ projectId })}>
              {newVersion.isPending ? "Creating…" : "Start new version"}
            </Button>
          )}
        </div>
      )}
      {frozen && (
        <p className="esti-label--secondary">
          Frozen on {program.frozenAt ? new Date(program.frozenAt).toLocaleDateString("en-IN") : "—"} — this version is the baseline that design revisions are measured against.
        </p>
      )}

      {/* Add space modal */}
      <Modal
        open={open}
        modalHeading="Add program space"
        primaryButtonText={addSpace.isPending ? "Adding…" : "Add space"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || !form.unitAreaSqm || addSpace.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          addSpace.mutate({
            programId: program.id,
            name: form.name,
            category: form.category as (typeof ProgramSpaceCategory.options)[number],
            floorLevel: Number(form.floorLevel || 0),
            unitAreaSqm: Number(form.unitAreaSqm || 0),
            count: Number(form.count || 1),
            notes: form.notes || undefined,
          })
        }
      >
        <Stack gap={4}>
          <TextInput id="ps-name" labelText="Space name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select id="ps-cat" labelText="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {ProgramSpaceCategory.options.map((c) => <SelectItem key={c} value={c} text={PROGRAM_SPACE_CATEGORY_LABEL[c]} />)}
          </Select>
          <TextInput id="ps-floor" type="number" labelText="Floor level (0 = ground, -1 = basement)" value={form.floorLevel} onChange={(e) => setForm({ ...form, floorLevel: e.target.value })} />
          <TextInput id="ps-area" type="number" labelText="Unit area (sqm)" value={form.unitAreaSqm} onChange={(e) => setForm({ ...form, unitAreaSqm: e.target.value })} />
          <TextInput id="ps-count" type="number" labelText="Count" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
          <TextArea id="ps-notes" labelText="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {addSpace.error && <InlineNotification kind="error" title="Error" subtitle={addSpace.error.message} lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}
