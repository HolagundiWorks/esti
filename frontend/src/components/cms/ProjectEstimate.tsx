import { useEffect, useState } from "react";
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
} from "@carbon/react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import {
  cmsAmountPaise,
  computeQuantity,
  formatINR,
  type CmsDimensions,
  type CmsMeasurementType,
} from "@esti/contracts";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const MEASURE_TYPES: CmsMeasurementType[] = ["VOLUME", "AREA", "LENGTH", "COUNT"];
const LOCATION_KINDS = ["ZONE", "BUILDING", "FLOOR", "ROOM", "SECTION"];

/** Which dimension fields a measurement type needs (length dims in mm). */
const DIM_FIELDS: Record<CmsMeasurementType, { key: keyof CmsDimensions; label: string }[]> = {
  VOLUME: [
    { key: "length", label: "Length (mm)" },
    { key: "height", label: "Height (mm)" },
    { key: "thickness", label: "Thickness (mm)" },
  ],
  AREA: [
    { key: "length", label: "Length (mm)" },
    { key: "height", label: "Height (mm)" },
  ],
  LENGTH: [{ key: "length", label: "Length (mm)" }],
  COUNT: [{ key: "nos", label: "Nos" }],
};

type ElementRow = {
  id: string;
  code: string;
  description: string;
  locationName: string | null;
  measurementType: string;
  quantity: number;
  unit: string | null;
  ratePaise: number;
  amountPaise: number;
};

export function ProjectEstimate({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const locationsQ = trpc.cms.locations.listByProject.useQuery({ projectId });
  const itemsQ = trpc.kb.items.list.useQuery();

  const invalEl = () => utils.cms.elements.listByProject.invalidate({ projectId });
  const createEl = trpc.cms.elements.create.useMutation({ onSuccess: invalEl });
  const updateEl = trpc.cms.elements.update.useMutation({ onSuccess: invalEl });
  const removeEl = trpc.cms.elements.remove.useMutation({ onSuccess: invalEl });
  const createLoc = trpc.cms.locations.create.useMutation({
    onSuccess: () => utils.cms.locations.listByProject.invalidate({ projectId }),
  });

  // ── Location add ──
  const [locKind, setLocKind] = useState("FLOOR");
  const [locName, setLocName] = useState("");

  // ── Element modal ──
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [specId, setSpecId] = useState("");
  const [gridRef, setGridRef] = useState("");
  const [mType, setMType] = useState<CmsMeasurementType>("VOLUME");
  const [dims, setDims] = useState<Record<string, string>>({});
  const [rateRupees, setRateRupees] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const specsQ = trpc.kb.specifications.listByItem.useQuery(
    { itemId },
    { enabled: !!itemId },
  );
  // When a spec is picked, prefill the rate from it (override allowed).
  useEffect(() => {
    if (!specId) return;
    const spec = (specsQ.data ?? []).find((s) => s.id === specId);
    if (spec) setRateRupees(String((spec.ratePaise ?? 0) / 100));
  }, [specId, specsQ.data]);

  const elements = (elementsQ.data?.elements ?? []) as ElementRow[];
  const totalPaise = elementsQ.data?.totalPaise ?? 0;
  const locations = locationsQ.data ?? [];
  const items = itemsQ.data ?? [];

  const numDims: CmsDimensions = Object.fromEntries(
    DIM_FIELDS[mType].map((f) => [f.key, Number(dims[f.key] ?? "") || 0]),
  );
  const previewQty = computeQuantity(mType, numDims);
  const previewRate = Math.round((Number(rateRupees) || 0) * 100);
  const previewAmount = cmsAmountPaise(previewQty, previewRate);

  function openNew() {
    setEditId(null);
    setLocationId("");
    setItemId("");
    setSpecId("");
    setGridRef("");
    setMType("VOLUME");
    setDims({});
    setRateRupees("");
    setOpen(true);
  }

  function submit() {
    const dimensions: CmsDimensions = numDims;
    const ratePaise = previewRate;
    if (editId) {
      updateEl.mutate({ id: editId, measurementType: mType, dimensions, ratePaise, gridRef: gridRef || null });
    } else {
      createEl.mutate({
        projectId,
        locationId: locationId || null,
        itemId: itemId || undefined,
        specificationId: specId || undefined,
        gridRef: gridRef || undefined,
        measurementType: mType,
        dimensions,
        ratePaise: specId ? undefined : ratePaise, // spec rate snapshots unless manual
      });
    }
    setOpen(false);
  }

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={4}>
        <Stack gap={2} className="esti-grow">
          <h2>Estimate</h2>
          <p>
            Each line is a physical <strong>Element</strong> (EL-001…) with one permanent
            identity. Pick an item + specification, enter dimensions, and the quantity and
            amount derive automatically.
          </p>
        </Stack>
        <Tag type="green" size="lg">{`Total ${formatINR(totalPaise)}`}</Tag>
        <Button renderIcon={Add} onClick={openNew}>New element</Button>
      </Stack>

      {/* Locations */}
      <Stack gap={3}>
        <h4>Locations</h4>
        <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <Select id="loc-kind" labelText="Kind" value={locKind} onChange={(e) => setLocKind(e.target.value)}>
            {LOCATION_KINDS.map((k) => <SelectItem key={k} value={k} text={k} />)}
          </Select>
          <TextInput id="loc-name" labelText="Name" placeholder="e.g. Ground Floor" value={locName} onChange={(e) => setLocName(e.target.value)} />
          <Button
            kind="tertiary"
            renderIcon={Add}
            disabled={!locName.trim() || createLoc.isPending}
            onClick={() => {
              createLoc.mutate({ projectId, kind: locKind as never, name: locName.trim() });
              setLocName("");
            }}
          >
            Add location
          </Button>
          <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
            {locations.map((l) => (
              <Tag key={l.id} type="gray" size="sm">{`${l.name} (${l.kind})`}</Tag>
            ))}
          </Stack>
        </Stack>
      </Stack>

      {/* Elements */}
      <DataState
        loading={elementsQ.isLoading}
        isEmpty={elements.length === 0}
        columnCount={8}
        empty={{ title: "No elements yet", description: "Add the first physical element to start the estimate.", action: <Button size="sm" renderIcon={Add} onClick={openNew}>New element</Button> }}
      >
        <TableContainer title="Elements">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {elements.map((el) => (
                <TableRow key={el.id}>
                  <TableCell>{el.code}</TableCell>
                  <TableCell>{el.description}</TableCell>
                  <TableCell>{el.locationName ?? "—"}</TableCell>
                  <TableCell>{el.quantity}</TableCell>
                  <TableCell>{el.unit ?? "—"}</TableCell>
                  <TableCell>{formatINR(el.ratePaise)}</TableCell>
                  <TableCell>{formatINR(el.amountPaise)}</TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Edit}
                        iconDescription="Edit dimensions"
                        tooltipPosition="left"
                        onClick={() => {
                          setEditId(el.id);
                          setMType(el.measurementType as CmsMeasurementType);
                          const full = (elementsQ.data?.elements ?? []).find((x) => x.id === el.id);
                          const d = (full?.dimensions ?? {}) as Record<string, number>;
                          setDims(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])));
                          setRateRupees(String(el.ratePaise / 100));
                          setGridRef("");
                          setLocationId("");
                          setItemId("");
                          setSpecId("");
                          setOpen(true);
                        }}
                      />
                      <Button kind="danger--ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Remove" tooltipPosition="left" onClick={() => setConfirmId(el.id)} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading={editId ? "Edit element" : "New element"}
        primaryButtonText={createEl.isPending || updateEl.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createEl.isPending || updateEl.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={submit}
        size="md"
      >
        <Stack gap={5}>
          {!editId && (
            <>
              <Select id="el-loc" labelText="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <SelectItem value="" text="—" />
                {locations.map((l) => <SelectItem key={l.id} value={l.id} text={`${l.name} (${l.kind})`} />)}
              </Select>
              <Select id="el-item" labelText="Item" value={itemId} onChange={(e) => { setItemId(e.target.value); setSpecId(""); }}>
                <SelectItem value="" text="Select item…" />
                {items.map((it) => <SelectItem key={it.id} value={it.id} text={`${it.name} (${it.unit})`} />)}
              </Select>
              <Select id="el-spec" labelText="Specification" value={specId} disabled={!itemId} onChange={(e) => setSpecId(e.target.value)}>
                <SelectItem value="" text={itemId ? "Select specification…" : "Pick an item first"} />
                {(specsQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id} text={`${s.name}${s.unit ? ` · ${s.unit}` : ""} · ${formatINR(s.ratePaise ?? 0)}`} />)}
              </Select>
              <TextInput id="el-grid" labelText="Grid reference" placeholder="e.g. A1" value={gridRef} onChange={(e) => setGridRef(e.target.value)} />
            </>
          )}
          <Select id="el-mtype" labelText="Measurement" value={mType} onChange={(e) => { setMType(e.target.value as CmsMeasurementType); setDims({}); }}>
            {MEASURE_TYPES.map((t) => <SelectItem key={t} value={t} text={t} />)}
          </Select>
          <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
            {DIM_FIELDS[mType].map((f) => (
              <TextInput key={f.key} id={`el-dim-${f.key}`} labelText={f.label} type="number" value={dims[f.key] ?? ""} onChange={(e) => setDims((s) => ({ ...s, [f.key]: e.target.value }))} />
            ))}
            <TextInput id="el-rate" labelText="Rate (₹)" type="number" value={rateRupees} onChange={(e) => setRateRupees(e.target.value)} />
          </Stack>
          <Tag type="blue" size="md">{`Quantity ${previewQty} · Amount ${formatINR(previewAmount)}`}</Tag>
        </Stack>
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove element?"
        body="The element and any of its components are removed. Records that referenced it keep their snapshot."
        confirmText="Remove"
        onConfirm={() => { if (confirmId) removeEl.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
    </Stack>
  );
}
