import {
  Button,
  InlineNotification,
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
import { useEffect, useMemo, useState } from "react";
import { STATES, districtsFor } from "@esti/contracts";
import { BbmpFarRuleTable } from "./knowledge/BbmpFarRuleTable.js";
import {
  BbmpRuleSetEditor,
  defaultBbmpCatalogInput,
} from "./knowledge/BbmpRuleSetEditor.js";
import type { BbmpRuleCatalogInput } from "@esti/contracts";
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

type DetailTarget =
  | { kind: "rie"; id: string }
  | { kind: "bbmp"; id: string };

export function RuleVersionManager({ versions, canManage, onRefresh }: Props) {
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const bbmpSetsQ = trpc.bbmpRules.listRuleSets.useQuery();
  const detailBbmpCatalogQ = trpc.bbmpRules.catalogByRuleSetId.useQuery(
    { ruleSetId: detail?.kind === "bbmp" ? detail.id : "" },
    { enabled: detail?.kind === "bbmp" },
  );

  const createMut = trpc.ruleVersions.create.useMutation({
    onSuccess: () => {
      onRefresh();
      setCreateOpen(false);
      resetForm();
    },
  });
  const bbmpCreateMut = trpc.bbmpRules.createRuleSet.useMutation({
    onSuccess: () => {
      utils.bbmpRules.listRuleSets.invalidate();
      utils.bbmpRules.activeCatalog.invalidate();
      onRefresh();
      setCreateOpen(false);
      resetForm();
    },
  });
  const reviewMut = trpc.ruleVersions.submitForReview.useMutation({ onSuccess: onRefresh });
  const publishMut = trpc.ruleVersions.publish.useMutation({ onSuccess: onRefresh });
  const bbmpPublishMut = trpc.bbmpRules.publishRuleSet.useMutation({
    onSuccess: () => {
      utils.bbmpRules.listRuleSets.invalidate();
      utils.bbmpRules.activeCatalog.invalidate();
    },
  });

  const [form, setForm] = useState({
    state: "Karnataka",
    district: "Bengaluru Urban",
    authority: "BBMP",
    buildingUse: "RESIDENTIAL",
    effectiveDate: "",
    sourceCitation: "",
    notes: "",
    bbmpLabel: "",
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
  });
  const [bbmpCatalog, setBbmpCatalog] = useState<BbmpRuleCatalogInput>(defaultBbmpCatalogInput);

  const isBBMP = form.authority === "BBMP";

  function resetForm() {
    setForm({
      state: "Karnataka",
      district: "Bengaluru Urban",
      authority: "BBMP",
      buildingUse: "RESIDENTIAL",
      effectiveDate: "",
      sourceCitation: "",
      notes: "",
      bbmpLabel: "",
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
    });
    setBbmpCatalog(defaultBbmpCatalogInput());
  }

  useEffect(() => {
    if (isBBMP && !form.bbmpLabel && form.effectiveDate) {
      setForm((f) => ({
        ...f,
        bbmpLabel: `BBMP ${f.buildingUse} · ${f.effectiveDate}`,
      }));
    }
  }, [isBBMP, form.effectiveDate, form.buildingUse, form.bbmpLabel]);

  function buildRieData() {
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
      far: farDefault,
      setbacks: setbackDefault,
      heightLimits: {
        absoluteMaxM: Number(form.heightMaxM),
        floorHeightM: Number(form.heightFloorM),
        clause: form.heightClause,
      },
      parking: {
        car: { sqmPerECS: Number(form.parkingCarSqm), basis: "built_up" as const, clause: "" },
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
      approvalDocs: docsDefault,
    };
  }

  function submitCreate() {
    if (isBBMP) {
      bbmpCreateMut.mutate({
        label: form.bbmpLabel || `BBMP ${form.buildingUse} · ${form.effectiveDate}`,
        effectiveDate: form.effectiveDate,
        sourceCitation: form.sourceCitation || undefined,
        notes: form.notes || undefined,
        catalog: bbmpCatalog,
      });
      return;
    }
    createMut.mutate({
      state: form.state,
      district: form.district,
      authority: form.authority,
      buildingUse: form.buildingUse,
      effectiveDate: form.effectiveDate,
      sourceCitation: form.sourceCitation || undefined,
      notes: form.notes || undefined,
      data: buildRieData(),
    });
  }

  const detailRv = detail?.kind === "rie" ? versions.find((v) => v.id === detail.id) : null;
  const detailBbmp =
    detail?.kind === "bbmp"
      ? (bbmpSetsQ.data ?? []).find((rs) => rs.id === detail.id)
      : null;

  const libraryRows = useMemo(() => {
    const rieRows = versions.map((rv) => ({
      key: `rie-${rv.id}`,
      kind: "rie" as const,
      id: rv.id,
      name: rv.authority,
      district: rv.district,
      state: rv.state,
      buildingUse: rv.buildingUse,
      effectiveDate: rv.effectiveDate,
      status: rv.status,
      engine: rv.authority === "BBMP" ? "Development control" : "Site checklist",
      active: null as boolean | null,
      sourceCitation: rv.sourceCitation,
      rv,
    }));
    const bbmpRows = (bbmpSetsQ.data ?? []).map((rs) => ({
      key: `bbmp-${rs.id}`,
      kind: "bbmp" as const,
      id: rs.id,
      name: rs.label,
      district: "Bengaluru Urban",
      state: "Karnataka",
      buildingUse: "—",
      effectiveDate: rs.effectiveDate,
      status: rs.status,
      engine: "Development control",
      active: rs.active,
      sourceCitation: rs.sourceCitation,
      rs,
    }));
    return [...rieRows, ...bbmpRows].sort((a, b) =>
      b.effectiveDate.localeCompare(a.effectiveDate),
    );
  }, [versions, bbmpSetsQ.data]);
  const createPending = createMut.isPending || bbmpCreateMut.isPending;
  const canSubmit =
    form.state &&
    form.district &&
    form.authority &&
    form.buildingUse &&
    form.effectiveDate &&
    (!isBBMP || form.bbmpLabel.trim().length > 0);

  return (
    <>
      <Stack gap={4}>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>Add rule set</Button>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name / authority</TableHeader>
                <TableHeader>District</TableHeader>
                <TableHeader>State</TableHeader>
                <TableHeader>Building use</TableHeader>
                <TableHeader>Effective date</TableHeader>
                <TableHeader>Engine</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Active</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {libraryRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  <TableCell>{row.state}</TableCell>
                  <TableCell>{row.buildingUse}</TableCell>
                  <TableCell>{row.effectiveDate}</TableCell>
                  <TableCell>{row.engine}</TableCell>
                  <TableCell>
                    <Tag type={RULE_VERSION_STATUS_TAG[row.status as RuleVersionStatus] ?? "gray"}>
                      {RULE_VERSION_STATUS_LABEL[row.status as RuleVersionStatus] ?? row.status}
                    </Tag>
                  </TableCell>
                  <TableCell>{row.active === null ? "—" : row.active ? "Yes" : "—"}</TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setDetail({ kind: row.kind, id: row.id })}
                      >
                        View
                      </Button>
                      {canManage && row.kind === "rie" && row.status === "DRAFT" && (
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => reviewMut.mutate({ id: row.id })}
                        >
                          Submit for review
                        </Button>
                      )}
                      {canManage &&
                        row.kind === "rie" &&
                        (row.status === "DRAFT" || row.status === "REVIEW") && (
                          <Button
                            kind="primary"
                            size="sm"
                            onClick={() => publishMut.mutate({ id: row.id })}
                          >
                            Publish
                          </Button>
                        )}
                      {canManage &&
                        row.kind === "bbmp" &&
                        (row.status === "DRAFT" || row.status === "REVIEW") && (
                          <Button
                            kind="primary"
                            size="sm"
                            onClick={() => bbmpPublishMut.mutate({ id: row.id, setActive: true })}
                          >
                            Publish &amp; activate
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

      <Modal
        open={createOpen}
        modalHeading="New jurisdiction rule set"
        primaryButtonText={createPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canSubmit || createPending}
        onRequestClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        onRequestSubmit={submitCreate}
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="rv-state"
              labelText="State"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            >
              {STATES.map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
            <Select
              id="rv-dist"
              labelText="District"
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            >
              {(districtsFor(form.state).length > 0 ? districtsFor(form.state) : [form.district]).map(
                (d) => (
                  <SelectItem key={d} value={d} text={d} />
                ),
              )}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="rv-auth"
              labelText="Authority"
              value={form.authority}
              onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
            >
              {AUTHORITIES.map((a) => (
                <SelectItem key={a} value={a} text={a} />
              ))}
            </Select>
            <Select
              id="rv-use"
              labelText="Building use"
              value={form.buildingUse}
              onChange={(e) => setForm((f) => ({ ...f, buildingUse: e.target.value }))}
            >
              {BUILDING_USES.map((u) => (
                <SelectItem key={u} value={u} text={u} />
              ))}
            </Select>
            <TextInput
              id="rv-date"
              labelText="Effective date"
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
            />
          </Stack>
          <TextInput
            id="rv-source"
            labelText="Source citation"
            value={form.sourceCitation}
            onChange={(e) => setForm((f) => ({ ...f, sourceCitation: e.target.value }))}
          />
          <TextArea
            id="rv-notes"
            labelText="Notes (optional)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />

          {isBBMP ? (
            <>
              <InlineNotification
                kind="info"
                title="Development control tables"
                subtitle="FAR, setback, road margin, parking, and engine constants used for project envelope and audit calculations."
                hideCloseButton
                lowContrast
              />
              <TextInput
                id="bbmp-label"
                labelText="Rule set label"
                value={form.bbmpLabel}
                onChange={(e) => setForm((f) => ({ ...f, bbmpLabel: e.target.value }))}
                helperText="e.g. BBMP Building Bye-Laws 2003 — revised 2024"
              />
              <BbmpRuleSetEditor catalog={bbmpCatalog} onChange={setBbmpCatalog} />
            </>
          ) : (
            <>
              <InlineNotification
                kind="info"
                title="Site checklist parameters"
                subtitle="Height, parking, basement, and sustainability checks used by site feasibility assessments for non-BBMP authorities."
                hideCloseButton
                lowContrast
              />
              <Stack orientation="horizontal" gap={5}>
                <TextInput
                  id="rv-hmaxm"
                  labelText="Absolute max height (m)"
                  type="number"
                  value={form.heightMaxM}
                  onChange={(e) => setForm((f) => ({ ...f, heightMaxM: e.target.value }))}
                />
                <TextInput
                  id="rv-flrm"
                  labelText="Floor height (m)"
                  type="number"
                  value={form.heightFloorM}
                  onChange={(e) => setForm((f) => ({ ...f, heightFloorM: e.target.value }))}
                />
                <TextInput
                  id="rv-hclause"
                  labelText="Height clause ref"
                  value={form.heightClause}
                  onChange={(e) => setForm((f) => ({ ...f, heightClause: e.target.value }))}
                />
              </Stack>
              <Stack orientation="horizontal" gap={5}>
                <TextInput
                  id="rv-carsqm"
                  labelText="Car: sq m per ECS"
                  type="number"
                  value={form.parkingCarSqm}
                  onChange={(e) => setForm((f) => ({ ...f, parkingCarSqm: e.target.value }))}
                />
                <TextInput
                  id="rv-twratio"
                  labelText="2-wheeler ratio of car"
                  type="number"
                  value={form.parkingTwoBasis}
                  onChange={(e) => setForm((f) => ({ ...f, parkingTwoBasis: e.target.value }))}
                />
                <TextInput
                  id="rv-cycleslot"
                  labelText="Cycle: sq m per slot"
                  type="number"
                  value={form.parkingCycleSqm}
                  onChange={(e) => setForm((f) => ({ ...f, parkingCycleSqm: e.target.value }))}
                />
              </Stack>
              <Stack orientation="horizontal" gap={5}>
                <TextInput
                  id="rv-bsdepth"
                  labelText="Basement max depth (m)"
                  type="number"
                  value={form.basementDepthM}
                  onChange={(e) => setForm((f) => ({ ...f, basementDepthM: e.target.value }))}
                />
                <TextInput
                  id="rv-bsvent"
                  labelText="Basement vent opening (%)"
                  type="number"
                  value={form.basementVentPct}
                  onChange={(e) => setForm((f) => ({ ...f, basementVentPct: e.target.value }))}
                />
              </Stack>
              <TextInput
                id="rv-bsuses"
                labelText="Basement permitted uses (comma-sep)"
                value={form.basementUses}
                onChange={(e) => setForm((f) => ({ ...f, basementUses: e.target.value }))}
                helperText="e.g. PARKING,UTILITIES,STORAGE"
              />
              <Stack orientation="horizontal" gap={5}>
                <TextInput
                  id="rv-rwltr"
                  labelText="Rainwater: min ltr/sq m site"
                  type="number"
                  value={form.rwHarvestLtr}
                  onChange={(e) => setForm((f) => ({ ...f, rwHarvestLtr: e.target.value }))}
                />
                <TextInput
                  id="rv-solar"
                  labelText="Solar: min sq m/100 sq m BUA"
                  type="number"
                  value={form.solarSqm}
                  onChange={(e) => setForm((f) => ({ ...f, solarSqm: e.target.value }))}
                />
                <TextInput
                  id="rv-evpct"
                  labelText="EV charging: min % of parking"
                  type="number"
                  value={form.evPct}
                  onChange={(e) => setForm((f) => ({ ...f, evPct: e.target.value }))}
                />
                <TextInput
                  id="rv-gcpct"
                  labelText="Green cover: min % site area"
                  type="number"
                  value={form.gcPct}
                  onChange={(e) => setForm((f) => ({ ...f, gcPct: e.target.value }))}
                />
              </Stack>
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        open={!!detail}
        modalHeading={
          detailRv
            ? `${detailRv.authority} · ${detailRv.district} · ${detailRv.buildingUse}`
            : detailBbmp
              ? detailBbmp.label
              : "Rule set"
        }
        primaryButtonText="Close"
        passiveModal
        onRequestClose={() => setDetail(null)}
        size="lg"
      >
        {detailRv && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              <Tag type={RULE_VERSION_STATUS_TAG[detailRv.status as RuleVersionStatus] ?? "gray"}>
                {RULE_VERSION_STATUS_LABEL[detailRv.status as RuleVersionStatus] ?? detailRv.status}
              </Tag>
              <span>Effective {detailRv.effectiveDate}</span>
              <Tag type="blue" size="sm">Site checklist</Tag>
            </Stack>
            {detailRv.sourceCitation && (
              <p>
                <strong>Source:</strong> {detailRv.sourceCitation}
              </p>
            )}
            {detailRv.notes && <p>{detailRv.notes}</p>}
          </Stack>
        )}
        {detailBbmp && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              <Tag type={RULE_VERSION_STATUS_TAG[detailBbmp.status as RuleVersionStatus] ?? "gray"}>
                {RULE_VERSION_STATUS_LABEL[detailBbmp.status as RuleVersionStatus] ?? detailBbmp.status}
              </Tag>
              <span>Effective {detailBbmp.effectiveDate}</span>
              {detailBbmp.active ? <Tag type="green" size="sm">Active</Tag> : null}
              <Tag type="blue" size="sm">Development control</Tag>
            </Stack>
            {detailBbmp.sourceCitation && (
              <p>
                <strong>Source:</strong> {detailBbmp.sourceCitation}
              </p>
            )}
            {detailBbmp.notes && <p>{detailBbmp.notes}</p>}
            {detailBbmpCatalogQ.data ? (
              <BbmpFarRuleTable
                catalog={detailBbmpCatalogQ.data}
                title="FAR and ground cover bands"
                description="When site area qualifies for a higher band but the governing road width is lower, the lesser road-width band applies."
              />
            ) : (
              <p>Loading development-control tables…</p>
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
}
