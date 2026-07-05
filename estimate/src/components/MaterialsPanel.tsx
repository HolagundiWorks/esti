import { Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  NumberInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { useStore } from "../store.js";

const num = (v: string | number): number => Number(v) || 0;

/** Material take-off lines (procurement basis). Optional — AORMS prices them. */
export function MaterialsPanel() {
  const materials = useStore((s) => s.model.materials);
  const { addMaterial, updateMaterial, removeMaterial } = useStore();

  return (
    <Stack gap={4}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
        <h2 className="est-h2">Material take-off</h2>
        <Button size="sm" kind="tertiary" renderIcon={Add} onClick={addMaterial}>
          Add material
        </Button>
      </Stack>

      {materials.length === 0 ? (
        <p className="est-help">Optional — the procurement take-off. Leave empty if AORMS derives it from recipes.</p>
      ) : (
        <TableContainer title="Materials">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Material</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Rate (₹)</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><TextInput size="sm" hideLabel labelText="" id={`mc-${m.id}`} value={m.code} onChange={(e) => updateMaterial(m.id, { code: e.target.value })} /></TableCell>
                  <TableCell><TextInput size="sm" hideLabel labelText="" id={`mm-${m.id}`} value={m.name} onChange={(e) => updateMaterial(m.id, { name: e.target.value })} /></TableCell>
                  <TableCell><TextInput size="sm" hideLabel labelText="" id={`mu-${m.id}`} value={m.unit} onChange={(e) => updateMaterial(m.id, { unit: e.target.value })} /></TableCell>
                  <TableCell><NumberInput size="sm" hideLabel label="" id={`mq-${m.id}`} min={0} value={m.qty} onChange={(_e, { value }) => updateMaterial(m.id, { qty: num(value) })} /></TableCell>
                  <TableCell><NumberInput size="sm" hideLabel label="" id={`mr-${m.id}`} min={0} value={(m.ratePaise ?? 0) / 100} onChange={(_e, { value }) => updateMaterial(m.id, { ratePaise: Math.round(num(value) * 100) })} /></TableCell>
                  <TableCell><Button hasIconOnly size="sm" kind="ghost" renderIcon={TrashCan} iconDescription="Remove" onClick={() => removeMaterial(m.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
