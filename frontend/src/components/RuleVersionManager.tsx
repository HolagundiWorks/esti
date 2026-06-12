import {
  Button,
  Modal,
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
  TextInput,
  TextArea,
} from "@carbon/react";
import {
  RULE_VERSION_STATUS_LABEL,
  RULE_VERSION_STATUS_TAG,
  type RuleVersionStatus,
} from "@esti/contracts";
import { useState } from "react";
import { STATES, districtsFor } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

type RvRow = {
  id: string;
  state: string;
  district: string;
  authority: string;
  buildingUse: string;
  effectiveDate: string;
  status: string;
  sourceCitation: string | null;
  notes: string | null;
};

interface Props {
  versions: RvRow[];
  canManage: boolean;
  onRefresh: () => void;
}

const BUILDING_USES = ["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC", "INDUSTRIAL", "MIXED_USE"];
const AUTHORITIES = ["BBMP", "BDA", "BMRDA", "BIAPPA", "CMC", "TMC", "NWDA", "HMDA", "GHMC", "CIDCO", "MHADA", "Other"];

export function RuleVersionManager({ versions, canManage, onRefresh }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const createMut = trpc.ruleVersions.create.useMutation({ onSuccess: () => { onRefresh(); setCreateOpen(false); resetForm(); } });
  const reviewMut = trpc.ruleVersions.submitForReview.useMutation({ onSuccess: onRefresh });
  const publishMut = trpc.ruleVersions.publish.useMutation({ onSuccess: onRefresh });

  const [form, setForm] = useState({
    state: "Karnataka",
    district: "Bengaluru Urban",
    authority: "BBMP",
    buildingUse: "RESIDENTIAL",
    effectiveDate: "",
    sourceCitation: "",
    notes: "",
    farJson: "",
    setbacksJson: "",
    heightMaxM: "45",
    heightFloorM: "3.0",
    heightClause: "",
    parkingCarSqm: "100",
    parkingTwoBasis: "0.5",
    parkingCycleSqm: "200",
    basementDepthM: "4.5",
    basementVentPct: "2.5",
    basementUses: "PARKING,UTILITIES,STORAGE",
    rwHarvestLtr: "0.5",
    solarSqm: "0",
    evPct: "20",
    gcPct: "10",
    docsJson: "",
  });

  function resetForm() {
    setForm({ state: "Karnataka", district: "Bengaluru Urban", authority: "BBMP", buildingUse: "RESIDENTIAL", effectiveDate: "", sourceCitation: "", notes: "", farJson: "", setbacksJson: "", heightMaxM: "45", heightFloorM: "3.0", heightClause: "", parkingCarSqm: "100", parkingTwoBasis: "0.5", parkingCycleSqm: "200", basementDepthM: "4.5", basementVentPct: "2.5", basementUses: "PARKING,UTILITIES,STORAGE", rwHarvestLtr: "0.5", solarSqm: "0", evPct: "20", gcPct: "10", docsJson: "" });
  }

  function buildData() {
    const farDefault = [
      { maxRoadWidthM: 12, far: 1.75, coveragePct: 60, clause: "" },
      { maxRoadWidthM: 18, far: 2.25, coveragePct: 60, clause: "" },
      { maxRoadWidthM: 24, far: 2.5, coveragePct: 60, clause: "" },
      { maxRoadWidthM: 30, far: 3.0, coveragePct: 60, clause: "" },
      { maxRoadWidthM: 9999, far: 3.25, coveragePct: 60, clause: "" },
    ];
    const setbackDefault = [
      { maxHeightM: 11.5, frontM: 3.0, rearM: 1.5, sideM: 1.5, clause: "" },
      { maxHeightM: 15, frontM: 5.0, rearM: 3.0, sideM: 3.0, clause: "" },
      { maxHeightM: 18, frontM: 6.0, rearM: 3.0, sideM: 3.0, clause: "" },
      { maxHeightM: 24, frontM: 7.0, rearM: 5.0, sideM: 5.0, clause: "" },
      { maxHeightM: 9999, frontM: 10.0, rearM: 7.0, sideM: 7.0, clause: "" },
    ];
    const docsDefault = [
      { id: "ownership", label: "Title deed / ownership document", required: true },
      { id: "topo_survey", label: "Topographic survey plan", required: true },
      { id: "site_plan", label: "Site plan", required: true },
      { id: "building_plan", label: "Building plan", required: true },
      { id: "structural_cert", label: "Structural stability certificate", required: true },
      { id: "fire_noc", label: "Fire NOC", required: false },
      { id: "khata", label: "Khata extract", required: true },
      { id: "encumbrance", label: "Encumbrance certificate", required: true },
      { id: "tax_receipts", label: "Property tax paid receipts", required: true },
      { id: "undertaking", label: "Architect / owner undertaking", required: true },
    ];
    return {
      far: form.farJson ? JSON.parse(form.farJson) : farDefault,
      setbacks: form.setbacksJson ? JSON.parse(form.setbacksJson) : setbackDefault,
      heightLimits: { absoluteMaxM: Number(form.heightMaxM), floorHeightM: Number(form.heightFloorM), clause: form.heightClause },
      parking: {
        car: { sqmPerECS: Number(form.parkingCarSqm), basis: "built_up", clause: "" },
        twoWheeler: { ratioOfCar: Number(form.parkingTwoBasis), clause: "" },
        cycle: { sqmPerSlot: Number(form.parkingCycleSqm), clause: "" },
      },
      basement: {
        maxDepthM: Number(form.basementDepthM),
        ventilationOpeningPct: Number(form.basementVentPct),
        permittedUses: form.basementUses.split(",").map((s) => s.trim()).filter(Boolean),
        clause: "",
      },
      sustainability: {
        rainwaterHarvesting: { minPitVolumeLtrPerSqm: Number(form.rwHarvestLtr), clause: "" },
        solarPanels: { minSqmPer100SqmBuiltUp: Number(form.solarSqm), clause: "" },
        evCharging: { minPctParking: Number(form.evPct), clause: "" },
        greenCover: { minPctSiteArea: Number(form.gcPct), clause: "" },
      },
      approvalDocs: form.docsJson ? JSON.parse(form.docsJson) : docsDefault,
    };
  }

  const detailRv = detailId ? versions.find((v) => v.id === detailId) : null;

  return (
    <>
      <Stack gap={4}>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>New rule version</Button>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Authority</TableHeader>
                <TableHeader>District / State</TableHeader>
                <TableHeader>Building use</TableHeader>
                <TableHeader>Effective date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Source</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {versions.map((rv) => (
                <TableRow key={rv.id}>
                  <TableCell>{rv.authority}</TableCell>
                  <TableCell>{rv.district}, {rv.state}</TableCell>
                  <TableCell>{rv.buildingUse}</TableCell>
                  <TableCell>{rv.effectiveDate}</TableCell>
                  <TableCell>
                    <Tag type={RULE_VERSION_STATUS_TAG[rv.status as RuleVersionStatus] ?? "gray"}>
                      {RULE_VERSION_STATUS_LABEL[rv.status as RuleVersionStatus] ?? rv.status}
                    </Tag>
                  </TableCell>
                  <TableCell>{rv.sourceCitation ?? "—"}</TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button kind="ghost" size="sm" onClick={() => setDetailId(rv.id)}>
                        View
                      </Button>
                      {canManage && rv.status === "DRAFT" && (
                        <Button kind="ghost" size="sm" onClick={() => reviewMut.mutate({ id: rv.id })}>
                          Submit for review
                        </Button>
                      )}
                      {canManage && (rv.status === "DRAFT" || rv.status === "REVIEW") && (
                        <Button kind="primary" size="sm" onClick={() => publishMut.mutate({ id: rv.id })}>
                          Publish
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* ── Create modal ── */}
      <Modal
        open={createOpen}
        modalHeading="New rule version"
        primaryButtonText={createMut.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.state || !form.district || !form.authority || !form.buildingUse || !form.effectiveDate || createMut.isPending}
        onRequestClose={() => { setCreateOpen(false); resetForm(); }}
        onRequestSubmit={() => createMut.mutate({
          state: form.state,
          district: form.district,
          authority: form.authority,
          buildingUse: form.buildingUse,
          effectiveDate: form.effectiveDate,
          sourceCitation: form.sourceCitation || undefined,
          notes: form.notes || undefined,
          data: buildData(),
        })}
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <Select id="rv-state" labelText="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}>
              {STATES.map((s) => <SelectItem key={s} value={s} text={s} />)}
            </Select>
            <Select id="rv-dist" labelText="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}>
              {(districtsFor(form.state).length > 0 ? districtsFor(form.state) : [form.district]).map((d) => (
                <SelectItem key={d} value={d} text={d} />
              ))}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select id="rv-auth" labelText="Authority" value={form.authority} onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}>
              {AUTHORITIES.map((a) => <SelectItem key={a} value={a} text={a} />)}
            </Select>
            <Select id="rv-use" labelText="Building use" value={form.buildingUse} onChange={(e) => setForm((f) => ({ ...f, buildingUse: e.target.value }))}>
              {BUILDING_USES.map((u) => <SelectItem key={u} value={u} text={u} />)}
            </Select>
            <TextInput id="rv-date" labelText="Effective date" type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
          </Stack>
          <TextInput id="rv-source" labelText="Source citation" value={form.sourceCitation} onChange={(e) => setForm((f) => ({ ...f, sourceCitation: e.target.value }))} />
          <Stack orientation="horizontal" gap={5}>
            <TextInput id="rv-hmaxm" labelText="Absolute max height (m)" type="number" value={form.heightMaxM} onChange={(e) => setForm((f) => ({ ...f, heightMaxM: e.target.value }))} />
            <TextInput id="rv-flrm" labelText="Floor height (m)" type="number" value={form.heightFloorM} onChange={(e) => setForm((f) => ({ ...f, heightFloorM: e.target.value }))} />
            <TextInput id="rv-hclause" labelText="Height clause ref" value={form.heightClause} onChange={(e) => setForm((f) => ({ ...f, heightClause: e.target.value }))} />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <TextInput id="rv-carsqm" labelText="Car: sq m per ECS" type="number" value={form.parkingCarSqm} onChange={(e) => setForm((f) => ({ ...f, parkingCarSqm: e.target.value }))} />
            <TextInput id="rv-twratio" labelText="2-wheeler ratio of car" type="number" value={form.parkingTwoBasis} onChange={(e) => setForm((f) => ({ ...f, parkingTwoBasis: e.target.value }))} />
            <TextInput id="rv-cycleslot" labelText="Cycle: sq m per slot" type="number" value={form.parkingCycleSqm} onChange={(e) => setForm((f) => ({ ...f, parkingCycleSqm: e.target.value }))} />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <TextInput id="rv-bsdepth" labelText="Basement max depth (m)" type="number" value={form.basementDepthM} onChange={(e) => setForm((f) => ({ ...f, basementDepthM: e.target.value }))} />
            <TextInput id="rv-bsvent" labelText="Basement vent opening (%)" type="number" value={form.basementVentPct} onChange={(e) => setForm((f) => ({ ...f, basementVentPct: e.target.value }))} />
          </Stack>
          <TextInput id="rv-bsuses" labelText="Basement permitted uses (comma-sep)" value={form.basementUses} onChange={(e) => setForm((f) => ({ ...f, basementUses: e.target.value }))} helperText="e.g. PARKING,UTILITIES,STORAGE" />
          <Stack orientation="horizontal" gap={5}>
            <TextInput id="rv-rwltr" labelText="Rainwater: min ltr/sq m site" type="number" value={form.rwHarvestLtr} onChange={(e) => setForm((f) => ({ ...f, rwHarvestLtr: e.target.value }))} />
            <TextInput id="rv-solar" labelText="Solar: min sq m/100 sq m BUA" type="number" value={form.solarSqm} onChange={(e) => setForm((f) => ({ ...f, solarSqm: e.target.value }))} />
            <TextInput id="rv-evpct" labelText="EV charging: min % of parking" type="number" value={form.evPct} onChange={(e) => setForm((f) => ({ ...f, evPct: e.target.value }))} />
            <TextInput id="rv-gcpct" labelText="Green cover: min % site area" type="number" value={form.gcPct} onChange={(e) => setForm((f) => ({ ...f, gcPct: e.target.value }))} />
          </Stack>
          <TextArea id="rv-notes" labelText="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <p>FAR table and setback table use defaults matching BBMP seed. Override by editing the rule version after creation (contact support for advanced JSON import).</p>
        </Stack>
      </Modal>

      {/* ── Detail modal ── */}
      <Modal
        open={!!detailRv}
        modalHeading={detailRv ? `${detailRv.authority} · ${detailRv.district} · ${detailRv.buildingUse}` : "Rule version"}
        primaryButtonText="Close"
        passiveModal
        onRequestClose={() => setDetailId(null)}
        size="lg"
      >
        {detailRv && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              <Tag type={RULE_VERSION_STATUS_TAG[detailRv.status as RuleVersionStatus] ?? "gray"}>
                {RULE_VERSION_STATUS_LABEL[detailRv.status as RuleVersionStatus] ?? detailRv.status}
              </Tag>
              <span>Effective {detailRv.effectiveDate}</span>
            </Stack>
            {detailRv.sourceCitation && <p><strong>Source:</strong> {detailRv.sourceCitation}</p>}
            {detailRv.notes && <p>{detailRv.notes}</p>}
          </Stack>
        )}
      </Modal>
    </>
  );
}
