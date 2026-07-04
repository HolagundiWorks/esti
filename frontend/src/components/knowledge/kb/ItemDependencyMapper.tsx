import { useState } from "react";
import {
  Button,
  NumberInput,
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
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import {
  KbDependencyType,
  MEASUREMENT_DERIVATION_LABEL,
  MeasurementDerivation,
} from "@esti/contracts";
import { DataState } from "../../DataState.js";
import { trpc } from "../../../lib/trpc.js";

const EMPTY = {
  parentItemId: "",
  childItemId: "",
  ratio: 1,
  dependencyType: "MANDATORY" as const,
  derivation: "MANUAL" as MeasurementDerivation,
};

/** Authoring for item dependencies that drive CMS-3 Component auto-generation. */
export function ItemDependencyMapper() {
  const utils = trpc.useUtils();
  const itemsQ = trpc.kb.items.list.useQuery();
  const depsQ = trpc.kb.dependencies.list.useQuery();
  const items = itemsQ.data ?? [];
  const deps = depsQ.data ?? [];

  const inv = () => utils.kb.dependencies.list.invalidate();
  const create = trpc.kb.dependencies.create.useMutation({ onSuccess: () => { inv(); setForm({ ...EMPTY }); } });
  const update = trpc.kb.dependencies.update.useMutation({ onSuccess: inv });
  const remove = trpc.kb.dependencies.remove.useMutation({ onSuccess: inv });
  const [form, setForm] = useState<{
    parentItemId: string;
    childItemId: string;
    ratio: number;
    dependencyType: "MANDATORY" | "OPTIONAL" | "SEQUENCE";
    derivation: MeasurementDerivation;
  }>({ ...EMPTY });

  const canAdd = form.parentItemId && form.childItemId && form.parentItemId !== form.childItemId;

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h3>Item dependencies</h3>
        <p className="esti-label esti-label--secondary">
          A parent activity implies a child activity whose measurement is derived automatically in
          the estimate. Pick a derivation formula (e.g. a column’s shuttering = perimeter × height);
          RATIO uses child qty = parent qty × ratio; MANUAL is punched by hand.
        </p>
      </Stack>

      <Stack orientation="horizontal" gap={4} className="esti-row">
        <Select id="dep-parent" labelText="Parent item" value={form.parentItemId}
          onChange={(e) => setForm({ ...form, parentItemId: e.target.value })}>
          <SelectItem value="" text="Select…" />
          {items.map((i) => <SelectItem key={i.id} value={i.id} text={i.name} />)}
        </Select>
        <Select id="dep-child" labelText="Child item" value={form.childItemId}
          onChange={(e) => setForm({ ...form, childItemId: e.target.value })}>
          <SelectItem value="" text="Select…" />
          {items.map((i) => <SelectItem key={i.id} value={i.id} text={i.name} />)}
        </Select>
        <div className="esti-input-sm">
          <NumberInput id="dep-ratio" label="Ratio" value={form.ratio} min={0} step={0.1}
            onChange={(_e, { value }) => setForm({ ...form, ratio: Number(value) })} />
        </div>
        <Select id="dep-type" labelText="Type" value={form.dependencyType}
          onChange={(e) => setForm({ ...form, dependencyType: e.target.value as typeof form.dependencyType })}>
          {KbDependencyType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
        </Select>
        <Select id="dep-deriv" labelText="Derivation" value={form.derivation}
          onChange={(e) => setForm({ ...form, derivation: e.target.value as MeasurementDerivation })}>
          {MeasurementDerivation.options.map((d) => (
            <SelectItem key={d} value={d} text={MEASUREMENT_DERIVATION_LABEL[d]} />
          ))}
        </Select>
        <Button renderIcon={Add} disabled={!canAdd || create.isPending}
          onClick={() => create.mutate(form)}>Add</Button>
      </Stack>

      <DataState
        loading={depsQ.isLoading}
        isEmpty={!depsQ.isLoading && deps.length === 0}
        columnCount={6}
        empty={{ title: "No dependencies", description: "Map a parent activity to a dependent child activity." }}
      >
        <TableContainer title="Dependencies">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Parent</TableHeader>
                <TableHeader>Child</TableHeader>
                <TableHeader>Ratio</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Derivation</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {deps.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.parentItemName ?? "—"}</TableCell>
                  <TableCell>{d.childItemName ?? "—"}</TableCell>
                  <TableCell>{d.ratio}</TableCell>
                  <TableCell><Tag type={d.dependencyType === "MANDATORY" ? "blue" : "gray"} size="sm">{d.dependencyType}</Tag></TableCell>
                  <TableCell>
                    <Select id={`dep-deriv-${d.id}`} labelText="Derivation" hideLabel size="sm"
                      value={d.derivation ?? "MANUAL"}
                      onChange={(e) => update.mutate({ id: d.id, derivation: e.target.value as MeasurementDerivation })}>
                      {MeasurementDerivation.options.map((x) => (
                        <SelectItem key={x} value={x} text={MEASUREMENT_DERIVATION_LABEL[x]} />
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button kind="danger--ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                      iconDescription="Remove" onClick={() => remove.mutate({ id: d.id })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
