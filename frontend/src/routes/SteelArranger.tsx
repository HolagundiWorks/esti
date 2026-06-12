/**
 * SteelFlow AI — Interactive Steel Arranger + Automated BBS Generator.
 * Route: /steel-arranger
 *
 * Layout: SidePanel (sessions + elements) | Main canvas + BBS table | AI panel
 */
import {
  Button,
  Column,
  DataTable,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextInput,
  Tile,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { Add, ChartCustom, Delete, Document, Idea, TrashCan } from "@carbon/icons-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import {
  SF_BAR_DIAS,
  SF_BAR_TYPES,
  SF_BAR_TYPE_LABEL,
  SF_ELEMENT_TYPES,
  SF_STIRRUP_TYPES,
  SF_STIRRUP_LABEL,
  sfDevelopmentLength,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";
import { useSteelStore } from "../store/useSteelStore.js";
import { computeBbsRows, totalSteelKg } from "../engine/bbsEngine.js";

// ─── Beam/Column SVG cross-section canvas ─────────────────────────────────────

function CrossSection({
  widthMm,
  depthMm,
  coverMm,
  rebars,
  stirrups,
}: {
  widthMm: number;
  depthMm: number;
  coverMm: number;
  rebars: { diaMm: number; barType: string; quantity: number; posX?: number | null; posY?: number | null }[];
  stirrups: { diaMm: number; spacingMm: number }[];
}) {
  // Scale to fit in 320×320 viewBox
  const scale = Math.min(320 / widthMm, 320 / depthMm);
  const vw = widthMm * scale;
  const vh = depthMm * scale;

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={vw}
      height={vh}
      style={{ display: "block", maxWidth: "100%" }}
      aria-label="Cross-section"
    >
      {/* Concrete outline */}
      <rect
        x={0}
        y={0}
        width={vw}
        height={vh}
        fill="var(--cds-layer-01)"
        stroke="var(--cds-border-strong-01)"
        strokeWidth={1.5}
      />
      {/* Cover zone */}
      <rect
        x={coverMm * scale}
        y={coverMm * scale}
        width={(widthMm - 2 * coverMm) * scale}
        height={(depthMm - 2 * coverMm) * scale}
        fill="none"
        stroke="var(--cds-border-subtle-01)"
        strokeWidth={0.5}
        strokeDasharray="4 3"
      />
      {/* Stirrups */}
      {stirrups.map((s, i) => {
        const sw = (widthMm - 2 * coverMm) * scale;
        const sh = (depthMm - 2 * coverMm) * scale;
        const x = coverMm * scale;
        const y = coverMm * scale;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={sw}
            height={sh}
            fill="none"
            stroke="var(--cds-support-warning)"
            strokeWidth={s.diaMm * scale}
            opacity={0.7}
          />
        );
      })}
      {/* Rebars */}
      {rebars.map((r, i) => {
        const count = r.quantity;
        const dia = r.diaMm * scale;
        const topBars = ["TOP_MAIN", "EXTRA_TOP"].includes(r.barType);
        const botBars = ["BOTTOM_MAIN", "EXTRA_BOTTOM"].includes(r.barType);
        // Auto-distribute if posX/posY not set
        const xs = Array.from({ length: count }, (_, k) => {
          if (count === 1) return vw / 2;
          const usable = (widthMm - 2 * coverMm) * scale;
          return coverMm * scale + (k * usable) / (count - 1);
        });
        const y = topBars
          ? vh - coverMm * scale - dia / 2
          : botBars
            ? coverMm * scale + dia / 2
            : vh / 2;

        return xs.map((x, k) => (
          <circle
            key={`${i}-${k}`}
            cx={r.posX != null ? r.posX * scale : x}
            cy={r.posY != null ? r.posY * scale : y}
            r={Math.max(dia / 2, 2)}
            fill="var(--cds-support-info)"
            stroke="var(--cds-background)"
            strokeWidth={0.8}
          />
        ));
      })}
    </svg>
  );
}

// ─── BBS Table ─────────────────────────────────────────────────────────────────

function BbsTable({ rows }: { rows: ReturnType<typeof computeBbsRows> }) {
  if (rows.length === 0)
    return <p>No bars or stirrups defined yet.</p>;

  const total = totalSteelKg(rows);

  return (
    <Stack gap={3}>
      <div style={{ overflowX: "auto" }}>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Element</TableHeader>
              <TableHeader>Mark</TableHeader>
              <TableHeader>Dia (mm)</TableHeader>
              <TableHeader>Shape</TableHeader>
              <TableHeader>Qty</TableHeader>
              <TableHeader>Cut. Length (mm)</TableHeader>
              <TableHeader>Total Length (mm)</TableHeader>
              <TableHeader>Unit Wt (kg/m)</TableHeader>
              <TableHeader>Total Wt (kg)</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.elementCode}</TableCell>
                <TableCell>{r.barMark}</TableCell>
                <TableCell>T{r.diaMm}</TableCell>
                <TableCell>{r.shapeCode}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.cuttingLengthMm.toLocaleString()}</TableCell>
                <TableCell>{r.totalLengthMm.toLocaleString()}</TableCell>
                <TableCell>{r.unitWeightKgPerM}</TableCell>
                <TableCell>{r.totalWeightKg}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={8}><strong>Total Steel Weight</strong></TableCell>
              <TableCell><strong>{total} kg</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Stack>
  );
}

// ─── AI Review panel ────────────────────────────────────────────────────────────

function AiReviewPanel({ elementId }: { elementId: string }) {
  const reviewQ = trpc.steelflow.aiReview.useQuery({ elementId });

  if (reviewQ.isLoading) return <InlineLoading description="Running IS:456 review…" />;
  if (reviewQ.error)
    return (
      <InlineNotification kind="error" lowContrast hideCloseButton title="Review failed" />
    );

  const r = reviewQ.data!;
  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Tag type="gray" size="sm">Summary</Tag>
        <p>Total steel: <strong>{r.summary.totalSteelKg} kg</strong></p>
        <p>Steel ratio: <strong>{r.summary.steelPercentage}%</strong></p>
      </Stack>

      {r.warnings.length > 0 && (
        <Stack gap={2}>
          <Tag type="red" size="sm">IS:456 Warnings</Tag>
          {r.warnings.map((w, i) => (
            <InlineNotification
              key={i}
              kind="warning"
              lowContrast
              hideCloseButton
              title={w}
            />
          ))}
        </Stack>
      )}

      {r.suggestions.length > 0 && (
        <Stack gap={2}>
          <Tag type="blue" size="sm">Suggestions</Tag>
          {r.suggestions.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </Stack>
      )}

      {r.warnings.length === 0 && (
        <InlineNotification
          kind="success"
          lowContrast
          hideCloseButton
          title="No IS:456 violations detected."
        />
      )}
    </Stack>
  );
}

// ─── Add rebar form ─────────────────────────────────────────────────────────────

function AddRebarForm({ elementId }: { elementId: string }) {
  const [dia, setDia] = useState(12);
  const [barType, setBarType] = useState<string>("BOTTOM_MAIN");
  const [qty, setQty] = useState(2);
  const [cutLen, setCutLen] = useState("");
  const [mark, setMark] = useState("");
  const utils = trpc.useUtils();

  const createMut = trpc.steelflow.createRebar.useMutation({
    onSuccess: () => {
      utils.steelflow.listRebars.invalidate({ elementId });
    },
  });

  function handleAdd() {
    createMut.mutate({
      elementId,
      barMark: mark || `T${dia}`,
      diaMm: dia as 6|8|10|12|16|20|25|32,
      barType: barType as typeof SF_BAR_TYPES[number],
      quantity: qty,
      cuttingLengthMm: cutLen ? parseInt(cutLen) : undefined,
      shapeCode: "A",
    });
    setMark("");
    setCutLen("");
  }

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <TextInput
          id="rebar-mark"
          labelText="Mark"
          size="sm"
          placeholder="T12"
          value={mark}
          onChange={(e) => setMark(e.target.value)}
        />
        <Select
          id="rebar-dia"
          labelText="Dia (mm)"
          size="sm"
          value={dia}
          onChange={(e) => setDia(Number(e.target.value))}
        >
          {SF_BAR_DIAS.map((d) => (
            <SelectItem key={d} value={d} text={`T${d}`} />
          ))}
        </Select>
        <Select
          id="rebar-type"
          labelText="Bar type"
          size="sm"
          value={barType}
          onChange={(e) => setBarType(e.target.value)}
        >
          {SF_BAR_TYPES.map((t) => (
            <SelectItem key={t} value={t} text={SF_BAR_TYPE_LABEL[t]} />
          ))}
        </Select>
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput
          id="rebar-qty"
          label="Quantity"
          size="sm"
          min={1}
          max={50}
          value={qty}
          onChange={(_e, { value }) => setQty(Number(value))}
        />
        <TextInput
          id="rebar-cutlen"
          labelText="Cut. length (mm, optional)"
          size="sm"
          placeholder="auto"
          value={cutLen}
          onChange={(e) => setCutLen(e.target.value)}
        />
      </Stack>
      <Button
        kind="primary"
        size="sm"
        renderIcon={Add}
        onClick={handleAdd}
        disabled={createMut.isPending}
      >
        Add rebar
      </Button>
    </Stack>
  );
}

// ─── Add stirrup form ───────────────────────────────────────────────────────────

function AddStirrupForm({ elementId }: { elementId: string }) {
  const [dia, setDia] = useState(8);
  const [spacing, setSpacing] = useState(150);
  const [stirrupType, setStirrupType] = useState("CLOSED");
  const utils = trpc.useUtils();

  const createMut = trpc.steelflow.createStirrup.useMutation({
    onSuccess: () => {
      utils.steelflow.listStirrups.invalidate({ elementId });
    },
  });

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <Select
          id="stir-dia"
          labelText="Dia (mm)"
          size="sm"
          value={dia}
          onChange={(e) => setDia(Number(e.target.value))}
        >
          {[6, 8, 10].map((d) => (
            <SelectItem key={d} value={d} text={`T${d}`} />
          ))}
        </Select>
        <Select
          id="stir-type"
          labelText="Type"
          size="sm"
          value={stirrupType}
          onChange={(e) => setStirrupType(e.target.value)}
        >
          {SF_STIRRUP_TYPES.map((t) => (
            <SelectItem key={t} value={t} text={SF_STIRRUP_LABEL[t]} />
          ))}
        </Select>
        <NumberInput
          id="stir-spacing"
          label="Spacing (mm)"
          size="sm"
          min={50}
          max={500}
          step={25}
          value={spacing}
          onChange={(_e, { value }) => setSpacing(Number(value))}
        />
      </Stack>
      <Button
        kind="primary"
        size="sm"
        renderIcon={Add}
        onClick={() =>
          createMut.mutate({
            elementId,
            diaMm: dia as 6|8|10|12|16|20|25|32,
            stirrupType: stirrupType as typeof SF_STIRRUP_TYPES[number],
            spacingMm: spacing,
            hookAngle: 135,
          })
        }
        disabled={createMut.isPending}
      >
        Add stirrup
      </Button>
    </Stack>
  );
}

// ─── Element editor ─────────────────────────────────────────────────────────────

function ElementEditor({ elementId }: { elementId: string }) {
  const [showAi, setShowAi] = useState(false);

  const elementsQ = trpc.steelflow.listElements.useQuery(
    { sessionId: "" }, // won't be used; we select by id from list
    { enabled: false },
  );
  const rebarsQ = trpc.steelflow.listRebars.useQuery({ elementId });
  const stirrupsQ = trpc.steelflow.listStirrups.useQuery({ elementId });
  const utils = trpc.useUtils();

  const deleteRebarMut = trpc.steelflow.deleteRebar.useMutation({
    onSuccess: () => utils.steelflow.listRebars.invalidate({ elementId }),
  });
  const deleteStirrupMut = trpc.steelflow.deleteStirrup.useMutation({
    onSuccess: () => utils.steelflow.listStirrups.invalidate({ elementId }),
  });

  const rebars = rebarsQ.data ?? [];
  const stirrups = stirrupsQ.data ?? [];

  // We need element geometry for the canvas — get it from the active session's element list
  const sessId = useSteelStore((s) => s.activeSessionId) ?? "";
  const allElemsQ = trpc.steelflow.listElements.useQuery({ sessionId: sessId }, { enabled: !!sessId });
  const el = (allElemsQ.data ?? []).find((e) => e.id === elementId);

  // Compute BBS rows from local data
  const bbsRows =
    el
      ? computeBbsRows(
          el,
          rebars.map((r) => ({
            ...r,
            cuttingLengthMm: r.cuttingLengthMm ?? undefined,
            posX: r.posX ?? undefined,
            posY: r.posY ?? undefined,
          })),
          stirrups,
        )
      : [];

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(
      bbsRows.map((r) => ({
        "Element": r.elementCode,
        "Bar Mark": r.barMark,
        "Dia (mm)": `T${r.diaMm}`,
        "Shape": r.shapeCode,
        "Qty": r.quantity,
        "Cutting Length (mm)": r.cuttingLengthMm,
        "Total Length (mm)": r.totalLengthMm,
        "Unit Wt (kg/m)": r.unitWeightKgPerM,
        "Total Wt (kg)": r.totalWeightKg,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BBS");
    XLSX.writeFile(wb, `BBS_${el?.elementCode ?? "element"}.xlsx`);
  }

  if (!el) return <InlineLoading description="Loading element…" />;

  return (
    <Stack gap={5}>
      {/* Element info */}
      <Stack orientation="horizontal" gap={3}>
        <Tag type="gray" size="sm">{el.elementType}</Tag>
        <strong>{el.elementCode}</strong>
        <Tag type="blue" size="sm">{el.widthMm} × {el.depthMm} mm</Tag>
        <Tag type="teal" size="sm">L = {el.lengthMm.toLocaleString()} mm</Tag>
        <Tag type="gray" size="sm">M{el.fck} / Fe{el.fy}</Tag>
        <Tag type="gray" size="sm">Cover {el.coverMm} mm</Tag>
      </Stack>

      <Grid narrow>
        {/* Cross-section canvas */}
        <Column lg={6} md={4} sm={4}>
          <Tile>
            <Stack gap={3}>
              <Tag type="gray" size="sm">Cross-section</Tag>
              <CrossSection
                widthMm={el.widthMm}
                depthMm={el.depthMm}
                coverMm={el.coverMm}
                rebars={rebars}
                stirrups={stirrups}
              />
            </Stack>
          </Tile>
        </Column>

        {/* Rebars and stirrups */}
        <Column lg={10} md={4} sm={4}>
          <Tabs>
            <TabList aria-label="Reinforcement tabs">
              <Tab>Rebars ({rebars.length})</Tab>
              <Tab>Stirrups ({stirrups.length})</Tab>
              <Tab>BBS</Tab>
              <Tab>Dev. Length</Tab>
            </TabList>
            <TabPanels>
              {/* Rebars tab */}
              <TabPanel>
                <Stack gap={4}>
                  <AddRebarForm elementId={elementId} />
                  {rebars.length > 0 && (
                    <Stack gap={2}>
                      {rebars.map((r) => (
                        <Stack key={r.id} orientation="horizontal" gap={2}>
                          <Tag type="blue" size="sm">T{r.diaMm}</Tag>
                          <Tag type="gray" size="sm">{SF_BAR_TYPE_LABEL[r.barType as typeof SF_BAR_TYPES[number]] ?? r.barType}</Tag>
                          <p>{r.barMark} · {r.quantity} nos · {r.cuttingLengthMm ?? el.lengthMm} mm</p>
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            hasIconOnly
                            renderIcon={TrashCan}
                            iconDescription="Remove"
                            onClick={() => deleteRebarMut.mutate({ id: r.id })}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </TabPanel>

              {/* Stirrups tab */}
              <TabPanel>
                <Stack gap={4}>
                  <AddStirrupForm elementId={elementId} />
                  {stirrups.length > 0 && (
                    <Stack gap={2}>
                      {stirrups.map((s) => (
                        <Stack key={s.id} orientation="horizontal" gap={2}>
                          <Tag type="teal" size="sm">T{s.diaMm}</Tag>
                          <Tag type="gray" size="sm">{SF_STIRRUP_LABEL[s.stirrupType as typeof SF_STIRRUP_TYPES[number]] ?? s.stirrupType}</Tag>
                          <p>@ {s.spacingMm} mm c/c · {s.zone}</p>
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            hasIconOnly
                            renderIcon={TrashCan}
                            iconDescription="Remove"
                            onClick={() => deleteStirrupMut.mutate({ id: s.id })}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </TabPanel>

              {/* BBS tab */}
              <TabPanel>
                <Stack gap={4}>
                  <BbsTable rows={bbsRows} />
                  {bbsRows.length > 0 && (
                    <Button kind="ghost" size="sm" renderIcon={Document} onClick={exportXlsx}>
                      Export BBS (Excel)
                    </Button>
                  )}
                </Stack>
              </TabPanel>

              {/* Development length tab */}
              <TabPanel>
                <Stack gap={3}>
                  <p>IS:456 clause 26.2 — Development length for M{el.fck} / Fe{el.fy}:</p>
                  <div style={{ overflowX: "auto" }}>
                    <Table size="sm">
                      <TableHead>
                        <TableRow>
                          <TableHeader>Bar dia (mm)</TableHeader>
                          <TableHeader>Ld (mm)</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {SF_BAR_DIAS.map((d) => (
                          <TableRow key={d}>
                            <TableCell>T{d}</TableCell>
                            <TableCell>{sfDevelopmentLength(d, el.fy, el.fck)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Column>
      </Grid>

      {/* AI review */}
      <Stack orientation="horizontal" gap={3}>
        <Button
          kind={showAi ? "secondary" : "ghost"}
          size="sm"
          renderIcon={Idea}
          onClick={() => setShowAi((v) => !v)}
        >
          {showAi ? "Hide" : "IS:456 AI Review"}
        </Button>
      </Stack>
      {showAi && <AiReviewPanel elementId={elementId} />}
    </Stack>
  );
}

// ─── New element form ───────────────────────────────────────────────────────────

function NewElementForm({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: (id: string) => void;
}) {
  const [type, setType] = useState("BEAM");
  const [code, setCode] = useState("");
  const [length, setLength] = useState(5000);
  const [width, setWidth] = useState(230);
  const [depth, setDepth] = useState(450);
  const [cover, setCover] = useState(25);
  const [fck, setFck] = useState(25);
  const [fy, setFy] = useState(500);
  const utils = trpc.useUtils();

  const createMut = trpc.steelflow.createElement.useMutation({
    onSuccess: (row) => {
      utils.steelflow.listElements.invalidate({ sessionId });
      onCreated(row.id);
      setCode("");
    },
  });

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <Select
          id="el-type"
          labelText="Type"
          size="sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {SF_ELEMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t} text={t} />
          ))}
        </Select>
        <TextInput
          id="el-code"
          labelText="Code"
          size="sm"
          placeholder="B1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput
          id="el-len"
          label="Length (mm)"
          size="sm"
          min={300}
          max={30000}
          step={100}
          value={length}
          onChange={(_e, { value }) => setLength(Number(value))}
        />
        <NumberInput
          id="el-width"
          label="Width (mm)"
          size="sm"
          min={100}
          max={3000}
          step={25}
          value={width}
          onChange={(_e, { value }) => setWidth(Number(value))}
        />
        <NumberInput
          id="el-depth"
          label="Depth (mm)"
          size="sm"
          min={100}
          max={3000}
          step={25}
          value={depth}
          onChange={(_e, { value }) => setDepth(Number(value))}
        />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput
          id="el-cover"
          label="Cover (mm)"
          size="sm"
          min={15}
          max={75}
          step={5}
          value={cover}
          onChange={(_e, { value }) => setCover(Number(value))}
        />
        <Select
          id="el-fck"
          labelText="fck (MPa)"
          size="sm"
          value={fck}
          onChange={(e) => setFck(Number(e.target.value))}
        >
          {[20, 25, 30, 35, 40].map((v) => (
            <SelectItem key={v} value={v} text={`M${v}`} />
          ))}
        </Select>
        <Select
          id="el-fy"
          labelText="fy (MPa)"
          size="sm"
          value={fy}
          onChange={(e) => setFy(Number(e.target.value))}
        >
          {[250, 415, 500, 550].map((v) => (
            <SelectItem key={v} value={v} text={`Fe${v}`} />
          ))}
        </Select>
      </Stack>
      <Button
        kind="primary"
        size="sm"
        renderIcon={Add}
        onClick={() =>
          createMut.mutate({
            sessionId,
            elementType: type as typeof SF_ELEMENT_TYPES[number],
            elementCode: code || type[0] + "1",
            lengthMm: length,
            widthMm: width,
            depthMm: depth,
            coverMm: cover,
            fck,
            fy,
          })
        }
        disabled={createMut.isPending}
      >
        Add element
      </Button>
    </Stack>
  );
}

// ─── Main route ─────────────────────────────────────────────────────────────────

export function SteelArranger() {
  const { activeSessionId, activeElementId, setActiveSession, setActiveElement } =
    useSteelStore();

  const [newSessionName, setNewSessionName] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewElement, setShowNewElement] = useState(false);

  const utils = trpc.useUtils();
  const sessionsQ = trpc.steelflow.listSessions.useQuery();

  const createSessionMut = trpc.steelflow.createSession.useMutation({
    onSuccess: (row) => {
      utils.steelflow.listSessions.invalidate();
      setActiveSession(row.id);
      setNewSessionName("");
      setShowNewSession(false);
    },
  });
  const deleteSessionMut = trpc.steelflow.deleteSession.useMutation({
    onSuccess: () => {
      utils.steelflow.listSessions.invalidate();
      setActiveSession(null);
    },
  });
  const deleteElementMut = trpc.steelflow.deleteElement.useMutation({
    onSuccess: () => {
      utils.steelflow.listElements.invalidate({ sessionId: activeSessionId! });
      setActiveElement(null);
    },
  });

  const elementsQ = trpc.steelflow.listElements.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId },
  );

  const sessions = sessionsQ.data ?? [];
  const elements = elementsQ.data ?? [];

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3}>
        <Tag type="gray" size="sm">SteelFlow AI</Tag>
        <h1>Steel Arranger + BBS Generator</h1>
      </Stack>
      <p>
        Interactive reinforcement arrangement with automated Bar Bending Schedule
        generation per IS:456 / IS:2502.
      </p>

      <Grid narrow>
        {/* Sessions sidebar */}
        <Column lg={4} md={3} sm={4}>
          <Tile>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={2}>
                <Tag type="gray" size="sm">Sessions</Tag>
                <div className="esti-grow" />
                <Button
                  kind="ghost"
                  size="sm"
                  hasIconOnly
                  renderIcon={Add}
                  iconDescription="New session"
                  onClick={() => setShowNewSession(true)}
                />
              </Stack>

              {sessionsQ.isLoading ? (
                <InlineLoading description="Loading…" />
              ) : sessions.length === 0 ? (
                <p>No sessions yet. Create one to start arranging.</p>
              ) : (
                <Stack gap={2}>
                  {sessions.map((s) => (
                    <Stack key={s.id} orientation="horizontal" gap={2}>
                      <Button
                        kind={activeSessionId === s.id ? "primary" : "ghost"}
                        size="sm"
                        className="esti-grow"
                        onClick={() => setActiveSession(s.id)}
                      >
                        {s.name}
                      </Button>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription="Delete session"
                        onClick={() => deleteSessionMut.mutate({ id: s.id })}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Tile>

          {/* Elements list */}
          {activeSessionId && (
            <Tile style={{ marginBlockStart: "1rem" }}>
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={2}>
                  <Tag type="blue" size="sm">Elements</Tag>
                  <div className="esti-grow" />
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={Add}
                    iconDescription="New element"
                    onClick={() => setShowNewElement(true)}
                  />
                </Stack>

                {elementsQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : elements.length === 0 ? (
                  <p>No elements. Add a beam, column, slab, or footing.</p>
                ) : (
                  <Stack gap={2}>
                    {elements.map((e) => (
                      <Stack key={e.id} orientation="horizontal" gap={2}>
                        <Button
                          kind={activeElementId === e.id ? "secondary" : "ghost"}
                          size="sm"
                          className="esti-grow"
                          onClick={() => setActiveElement(e.id)}
                        >
                          {e.elementCode} ({e.elementType})
                        </Button>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          hasIconOnly
                          renderIcon={TrashCan}
                          iconDescription="Delete element"
                          onClick={() => deleteElementMut.mutate({ id: e.id })}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Tile>
          )}
        </Column>

        {/* Main editor */}
        <Column lg={12} md={5} sm={4}>
          {!activeSessionId ? (
            <Tile>
              <Stack gap={3}>
                <ChartCustom size={32} />
                <h3>Select or create a session to start</h3>
                <p>
                  A session represents one structural design — e.g. "Ground Floor Beams".
                  Each session can contain multiple structural elements (beams, columns, slabs, footings).
                </p>
                <Button
                  kind="primary"
                  size="sm"
                  renderIcon={Add}
                  onClick={() => setShowNewSession(true)}
                >
                  New session
                </Button>
              </Stack>
            </Tile>
          ) : !activeElementId ? (
            <Tile>
              <Stack gap={3}>
                <h3>Select an element to edit reinforcement</h3>
                <p>Choose an element from the sidebar, or add a new one.</p>
              </Stack>
            </Tile>
          ) : (
            <ElementEditor elementId={activeElementId} />
          )}
        </Column>
      </Grid>

      {/* New session modal */}
      <Modal
        open={showNewSession}
        modalHeading="New BBS session"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        onRequestClose={() => setShowNewSession(false)}
        onRequestSubmit={() => {
          if (newSessionName.trim())
            createSessionMut.mutate({ name: newSessionName.trim() });
        }}
      >
        <TextInput
          id="new-session-name"
          labelText="Session name"
          placeholder="Ground floor beams — Block A"
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
        />
      </Modal>

      {/* New element modal */}
      {activeSessionId && (
        <Modal
          open={showNewElement}
          modalHeading="Add structural element"
          passiveModal
          onRequestClose={() => setShowNewElement(false)}
        >
          <NewElementForm
            sessionId={activeSessionId}
            onCreated={(id) => {
              setActiveElement(id);
              setShowNewElement(false);
            }}
          />
        </Modal>
      )}
    </Stack>
  );
}
