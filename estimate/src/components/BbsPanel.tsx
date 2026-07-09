import { Add, TrashCan } from "@carbon/icons-react";
import {
  Accordion,
  AccordionItem,
  Button,
  Dropdown,
  NumberInput,
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
  Tile,
} from "@carbon/react";
import { computeMemberBBS, type Exposure, type MemberInput, type SteelGrade } from "@esti/contracts";
import type { BbsMemberRow } from "../core/model.js";
import { newId } from "../core/model.js";
import { useStore } from "../store.js";

const num = (v: string | number): number => Number(v) || 0;
const STEEL_GRADES: SteelGrade[] = ["Fe415", "Fe500", "Fe500D", "Fe550", "Fe550D"];
const EXPOSURES: Exposure[] = ["mild", "moderate", "severe", "verySevere", "extreme"];
const ELEMENTS = ["SLAB", "BEAM", "COLUMN", "FOOTING"] as const;
type Element = (typeof ELEMENTS)[number];

const FIELDS: Record<Element, { key: string; label: string; def: number }[]> = {
  SLAB: [
    { key: "lengthMm", label: "Span L (mm)", def: 4000 },
    { key: "widthMm", label: "Width (mm)", def: 3000 },
    { key: "mainDiaMm", label: "Main Ø", def: 12 },
    { key: "mainSpacingMm", label: "Main spacing", def: 150 },
    { key: "distDiaMm", label: "Dist Ø", def: 8 },
    { key: "distSpacingMm", label: "Dist spacing", def: 200 },
  ],
  BEAM: [
    { key: "clearSpanMm", label: "Clear span (mm)", def: 6000 },
    { key: "widthMm", label: "Width (mm)", def: 300 },
    { key: "depthMm", label: "Depth (mm)", def: 450 },
    { key: "bottomDiaMm", label: "Bottom Ø", def: 16 },
    { key: "bottomNos", label: "Bottom nos", def: 3 },
    { key: "topDiaMm", label: "Top Ø", def: 12 },
    { key: "topNos", label: "Top nos", def: 2 },
    { key: "stirrupDiaMm", label: "Stirrup Ø", def: 8 },
    { key: "stirrupSpacingMm", label: "Stirrup spacing", def: 150 },
  ],
  COLUMN: [
    { key: "heightMm", label: "Height (mm)", def: 3000 },
    { key: "widthMm", label: "Width (mm)", def: 300 },
    { key: "depthMm", label: "Depth (mm)", def: 300 },
    { key: "verticalDiaMm", label: "Vertical Ø", def: 16 },
    { key: "verticalNos", label: "Vertical nos", def: 6 },
    { key: "tieDiaMm", label: "Tie Ø", def: 8 },
    { key: "tieSpacingMm", label: "Tie spacing", def: 150 },
  ],
  FOOTING: [
    { key: "lengthMm", label: "Length (mm)", def: 1500 },
    { key: "widthMm", label: "Width (mm)", def: 1500 },
    { key: "xDiaMm", label: "X Ø", def: 12 },
    { key: "xSpacingMm", label: "X spacing", def: 150 },
    { key: "yDiaMm", label: "Y Ø", def: 12 },
    { key: "ySpacingMm", label: "Y spacing", def: 150 },
  ],
};

function defaultMember(element: Element): BbsMemberRow {
  const geom: Record<string, number> = {};
  for (const f of FIELDS[element]) geom[f.key] = f.def;
  return {
    id: newId("bbs"),
    element,
    concreteGradeMpa: 25,
    steelGrade: "Fe500",
    exposure: "mild",
    ...geom,
  } as unknown as BbsMemberRow;
}

/** Bar Bending Schedule — RCC members with per-bar schedule drill-down. */
export function BbsPanel() {
  const bbs = useStore((s) => s.model.bbs);
  const rates = useStore((s) => s.model.steelRatePaiseByDia);
  const { addBbs, updateBbs, removeBbs, setSteelRate } = useStore();

  const diameters = Array.from(
    new Set(bbs.flatMap((m) => safeMember(m)?.byDiameter.map((d) => d.diaMm) ?? [])),
  ).sort((a, b) => a - b);

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
        <h2 className="est-h2">BBS members</h2>
        {ELEMENTS.map((el) => (
          <Button key={el} size="sm" kind="tertiary" renderIcon={Add} onClick={() => addBbs(defaultMember(el))}>
            {el.charAt(0) + el.slice(1).toLowerCase()}
          </Button>
        ))}
      </Stack>

      <p className="est-help">
        Enter geometry once — cut lengths and weights are computed per IS 456 / IS 2502. Export includes the steel
        schedule for AORMS › Cost Management › BBS.
      </p>

      {bbs.length === 0 && <p className="est-help">Add slab, beam, column, or footing members.</p>}

      {bbs.map((m) => {
        const el = m.element as Element;
        const computed = safeMember(m);
        return (
          <Tile key={m.id}>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
                <Tag type="blue" size="md">{el}</Tag>
                {computed && (
                  <Tag type="teal" size="sm">
                    {computed.totalWeightKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
                  </Tag>
                )}
                <TextInput
                  id={`ref-${m.id}`}
                  labelText="Member ref"
                  size="sm"
                  className="est-w-sm"
                  value={m.ref ?? ""}
                  onChange={(e) => updateBbs(m.id, { ref: e.target.value })}
                />
                <Button hasIconOnly size="sm" kind="ghost" renderIcon={TrashCan} iconDescription="Remove member" onClick={() => removeBbs(m.id)} />
              </Stack>

              <div className="est-field-grid">
                {FIELDS[el].map((f) => (
                  <NumberInput
                    key={f.key}
                    id={`${m.id}-${f.key}`}
                    label={f.label}
                    min={0}
                    value={(m as unknown as Record<string, number>)[f.key] ?? f.def}
                    onChange={(_e, { value }) => updateBbs(m.id, { [f.key]: num(value) } as Partial<BbsMemberRow>)}
                  />
                ))}
                <NumberInput
                  id={`${m.id}-grade`}
                  label="Concrete grade (MPa)"
                  min={0}
                  value={m.concreteGradeMpa}
                  onChange={(_e, { value }) => updateBbs(m.id, { concreteGradeMpa: num(value) })}
                />
                <Dropdown
                  id={`${m.id}-steel`}
                  titleText="Steel grade"
                  label="Steel grade"
                  items={STEEL_GRADES}
                  selectedItem={m.steelGrade}
                  onChange={({ selectedItem }) => selectedItem && updateBbs(m.id, { steelGrade: selectedItem })}
                />
                <Dropdown
                  id={`${m.id}-exp`}
                  titleText="Exposure"
                  label="Exposure"
                  items={EXPOSURES}
                  selectedItem={m.exposure ?? "mild"}
                  onChange={({ selectedItem }) => selectedItem && updateBbs(m.id, { exposure: selectedItem })}
                />
              </div>

              {computed && computed.bars.length > 0 && (
                <Accordion>
                  <AccordionItem title={`Bar schedule (${computed.bars.length} bars)`}>
                    <TableContainer>
                      <Table size="sm">
                        <TableHead>
                          <TableRow>
                            <TableHeader>Mark</TableHeader>
                            <TableHeader>Role</TableHeader>
                            <TableHeader>Ø</TableHeader>
                            <TableHeader>Nos</TableHeader>
                            <TableHeader>Cut (mm)</TableHeader>
                            <TableHeader>kg</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {computed.bars.map((b) => (
                            <TableRow key={b.mark}>
                              <TableCell>{b.mark}</TableCell>
                              <TableCell>{b.role}</TableCell>
                              <TableCell>{b.diaMm}</TableCell>
                              <TableCell>{b.nos}</TableCell>
                              <TableCell>{b.cutLengthMm}</TableCell>
                              <TableCell>{b.weightKg}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionItem>
                </Accordion>
              )}
            </Stack>
          </Tile>
        );
      })}

      {diameters.length > 0 && (
        <Tile>
          <Stack gap={3}>
            <span className="est-help">Steel rate by diameter (₹/kg) — as-estimated; AORMS re-prices on import.</span>
            <div className="est-field-grid">
              {diameters.map((d) => (
                <NumberInput
                  key={d}
                  id={`steelrate-${d}`}
                  label={`Ø${d} (₹/kg)`}
                  min={0}
                  value={(rates[d] ?? 0) / 100}
                  onChange={(_e, { value }) => setSteelRate(d, Math.round(num(value) * 100))}
                />
              ))}
            </div>
          </Stack>
        </Tile>
      )}
    </Stack>
  );
}

function safeMember(m: BbsMemberRow) {
  try {
    return computeMemberBBS(m as MemberInput);
  } catch {
    return null;
  }
}
