import {
  Button,
  InlineNotification,
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
import {
  type EstimateMeasurement,
  lineQuantity,
  measurementQty,
  measurementRows,
} from "@esti/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "../lib/trpc.js";
import {
  type MeasureState,
  dropRecorded,
  moveRow,
  pressEnter,
  previewColumnQty,
  setValue,
  startMeasuring,
} from "../lib/estimateSheet.js";

/**
 * Estimates (Estimation OS rebuild, phase 1) — the Excel-inspired,
 * keyboard-first measurement sheet.
 *
 *   /        element search over the Knowledge Bank item library
 *   ↑ / ↓    move through search results (and parameter fields while measuring)
 *   Space    select the highlighted element
 *   Enter    open the measurement block · advance down the column ·
 *            record the column (last row)
 *   Enter ×2 close the item — mapped child items queue up as dependencies
 */

type Element = { id: string; name: string; category: string | null; unit: string };
type DepQueueItem = { kbItemId: string; name: string; unit: string };

type EntryPhase =
  | { phase: "slash"; text: string; highlight: number }
  | { phase: "armed"; element: Element; dep?: { parentLineId: string; index: number; total: number } }
  | {
      phase: "measuring";
      element: Element;
      /** The persisted line — opening the sheet created it (backend openLine). */
      lineId: string;
      state: MeasureState;
      dep?: { parentLineId: string; index: number; total: number };
    };

function fmtQty(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/** One saved line — each measurement is a row; parameters + Qty are columns. */
function SavedLine({ no, line }: {
  no: string;
  line: {
    description: string;
    unit: string;
    measurements?: unknown;
    parentLineId: string | null;
    derived?: boolean;
  };
}) {
  const ms = (line.measurements ?? []) as EstimateMeasurement[];
  const rows = measurementRows(line.unit);
  const keys: (keyof EstimateMeasurement)[] = ["nos", "l", "b", "h"];
  return (
    <TableContainer
      title={
        <span>
          {no} · {line.description}{" "}
          {line.derived && (
            <Tag type="teal" size="sm">
              auto
            </Tag>
          )}
        </span>
      }
      description={`Unit: ${line.unit} · Qty: ${fmtQty(lineQuantity(ms, line.unit))} ${line.unit}`}
    >
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>#</TableHeader>
            {rows.map((label, r) => (
              <TableHeader key={label + r}>{label}</TableHeader>
            ))}
            <TableHeader>Qty ({line.unit})</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {ms.map((m, i) => (
            <TableRow key={i}>
              <TableCell>M{i + 1}</TableCell>
              {rows.map((_, r) => (
                <TableCell key={r}>{m[keys[r]!] ?? "—"}</TableCell>
              ))}
              <TableCell>{fmtQty(measurementQty(m, line.unit))}</TableCell>
            </TableRow>
          ))}
          {ms.length === 0 && (
            <TableRow>
              <TableCell colSpan={rows.length + 2}>—</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function EstimateSheet({ estimateId, onBack }: { estimateId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const estimateQ = trpc.estimates.get.useQuery({ id: estimateId });
  const openLine = trpc.estimates.openLine.useMutation();
  const addMeasurement = trpc.estimates.addMeasurement.useMutation();
  const deriveDependencies = trpc.estimates.deriveDependencies.useMutation();
  const closeLine = trpc.estimates.closeLine.useMutation({
    onSuccess: () => void utils.estimates.get.invalidate({ id: estimateId }),
  });

  const [entry, setEntry] = useState<EntryPhase>({ phase: "slash", text: "", highlight: 0 });
  const [depQueue, setDepQueue] = useState<DepQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const slashRef = useRef<HTMLInputElement>(null);
  const activeCellRef = useRef<HTMLInputElement>(null);
  // Guards against a second armed-Enter (key repeat) creating a duplicate line
  // before the armed→measuring re-render lands.
  const openingRef = useRef(false);
  // Guards against a held closing-Enter re-firing closeItem (and deriveDependencies)
  // during the two-round-trip window before entry leaves the measuring phase.
  const closingRef = useRef(false);

  const searchQuery = entry.phase === "slash" && entry.text.startsWith("/")
    ? entry.text.slice(1).trim()
    : null;
  const searchQ = trpc.estimates.searchElements.useQuery(
    { q: searchQuery ?? "" },
    { enabled: searchQuery !== null },
  );
  const results = (searchQuery !== null ? searchQ.data : undefined) ?? [];

  const measureRowIdx = entry.phase === "measuring" ? entry.state.rowIdx : 0;
  const measureCols = entry.phase === "measuring" ? entry.state.recorded.length : 0;
  useEffect(() => {
    if (entry.phase === "slash") slashRef.current?.focus();
    if (entry.phase === "measuring") activeCellRef.current?.focus();
  }, [entry.phase, measureRowIdx, measureCols]);

  const lines = estimateQ.data?.lines ?? [];
  const mains = lines.filter((l) => !l.parentLineId);

  // Live readout while measuring: the line's running total and the qty of the
  // column currently being typed (0 flags a still-missing dimension before Enter).
  const runningTotalQty =
    entry.phase === "measuring" ? lineQuantity(entry.state.recorded, entry.element.unit) : 0;
  const currentColumnQty = entry.phase === "measuring" ? previewColumnQty(entry.state) : null;

  /** Number a line: main items 1..n, dependencies parent.1, parent.2… */
  const lineNo = (line: (typeof lines)[number]): string => {
    if (!line.parentLineId) return String(mains.findIndex((m) => m.id === line.id) + 1);
    const pIdx = mains.findIndex((m) => m.id === line.parentLineId);
    const sibs = lines.filter((l) => l.parentLineId === line.parentLineId);
    return `${pIdx + 1}.${sibs.findIndex((s) => s.id === line.id) + 1}`;
  };

  /** Enter in the armed state — open the sheet: the backend creates the line. */
  async function openSheet() {
    if (entry.phase !== "armed" || openingRef.current) return;
    openingRef.current = true;
    setError(null);
    try {
      const line = await openLine.mutateAsync({
        estimateId,
        kbItemId: entry.element.id,
        parentLineId: entry.dep?.parentLineId ?? null,
        description: entry.element.name,
        unit: entry.element.unit,
      });
      setEntry({
        ...entry,
        phase: "measuring",
        lineId: line.id,
        state: startMeasuring(entry.element.unit),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the measurement sheet");
    } finally {
      openingRef.current = false;
    }
  }

  /** Single Enter on the last row — persist the recorded column immediately.
   *  On failure the column is rolled back out of the live sheet (and its running
   *  total) so nothing is shown as recorded that the server didn't accept. */
  async function recordColumn(lineId: string, m: EstimateMeasurement) {
    try {
      await addMeasurement.mutateAsync({ lineId, ...m });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the measurement");
      setEntry((prev) =>
        prev.phase === "measuring" ? { ...prev, state: dropRecorded(prev.state, m) } : prev,
      );
    }
  }

  /** Double Enter — close the sheet; empty lines are pruned server-side. */
  async function closeItem() {
    if (entry.phase !== "measuring" || closingRef.current) return;
    closingRef.current = true;
    const { dep, lineId } = entry;
    setError(null);
    try {
      const { kept } = await closeLine.mutateAsync({ id: lineId });
      if (!dep) {
        // Auto-derive dependency children from this line's measurements; only the
        // MANUAL ones come back to be punched by hand.
        const manual = kept
          ? (await deriveDependencies.mutateAsync({ parentLineId: lineId })).manual
          : [];
        await utils.estimates.get.invalidate({ id: estimateId });
        if (manual.length > 0) {
          setDepQueue(manual.map((c) => ({ kbItemId: c.kbItemId, name: c.name, unit: c.unit })));
          setEntry({
            phase: "armed",
            element: { id: manual[0]!.kbItemId, name: manual[0]!.name, category: null, unit: manual[0]!.unit },
            dep: { parentLineId: lineId, index: 0, total: manual.length },
          });
          return;
        }
        setDepQueue([]);
        setEntry({ phase: "slash", text: "", highlight: 0 });
        return;
      }
      // Dependency closed — advance the queue.
      const nextIdx = dep.index + 1;
      if (nextIdx < depQueue.length) {
        const n = depQueue[nextIdx]!;
        setEntry({
          phase: "armed",
          element: { id: n.kbItemId, name: n.name, category: null, unit: n.unit },
          dep: { parentLineId: dep.parentLineId, index: nextIdx, total: dep.total },
        });
      } else {
        setDepQueue([]);
        setEntry({ phase: "slash", text: "", highlight: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the item");
    } finally {
      closingRef.current = false;
    }
  }

  function onSlashKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (entry.phase !== "slash") return;
    if (searchQuery !== null && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEntry({ ...entry, highlight: (entry.highlight + 1) % results.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEntry({ ...entry, highlight: (entry.highlight - 1 + results.length) % results.length });
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const el = results[Math.min(entry.highlight, results.length - 1)]!;
        setEntry({ phase: "armed", element: el });
        return;
      }
    }
    if (e.key === "Escape") setEntry({ phase: "slash", text: "", highlight: 0 });
  }

  function onArmedKey(e: React.KeyboardEvent) {
    if (entry.phase !== "armed") return;
    if (e.key === "Enter") {
      e.preventDefault();
      void openSheet();
    }
  }

  function onMeasureKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (entry.phase !== "measuring") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEntry({ ...entry, state: moveRow(entry.state, 1) });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setEntry({ ...entry, state: moveRow(entry.state, -1) });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const r = pressEnter(entry.state);
      if (r.kind === "closed") {
        void closeItem();
        return;
      }
      if (r.kind === "invalid") {
        setError(r.reason);
        return;
      }
      setError(null);
      if (r.kind === "recorded") {
        void recordColumn(entry.lineId, r.state.recorded[r.state.recorded.length - 1]!);
      }
      setEntry({ ...entry, state: r.state });
    }
  }

  /** Leaving mid-measurement: close the open line first (closeLine prunes it
   *  if nothing was recorded) so an abandoned sheet leaves no empty line. */
  async function exit() {
    if (entry.phase === "measuring") {
      try {
        await closeLine.mutateAsync({ id: entry.lineId });
      } catch {
        /* navigate away regardless */
      }
    }
    onBack();
  }

  const est = estimateQ.data;
  if (!est) return null;

  return (
    <Stack gap={5}>
      <div className="esti-row-between">
        <h4>{est.title}</h4>
        <div className="esti-row">
          <Tag type="gray" size="sm">{mains.length} item{mains.length === 1 ? "" : "s"}</Tag>
          <Button size="sm" kind="ghost" onClick={() => void exit()}>All estimates</Button>
        </div>
      </div>
      <p className="esti-label esti-label--helper">
        Type “/” then the element name · ↑↓ to choose · Space to select · Enter opens the
        block, walks the Nos/dimension fields and records the measurement · Enter on an empty
        measurement closes the item — mapped dependencies follow automatically.
      </p>

      {lines.map((line) => (
        <SavedLine key={line.id} no={lineNo(line)} line={line} />
      ))}

      {/* ── Active entry ── */}
      <Tile className="esti-fill">
        {entry.phase === "slash" && (
          <Stack gap={3}>
            <TextInput
              id="estimate-slash"
              ref={slashRef}
              labelText={`Item ${mains.length + 1}`}
              placeholder="/ element…"
              value={entry.text}
              autoComplete="off"
              onChange={(e) => setEntry({ phase: "slash", text: e.target.value, highlight: 0 })}
              onKeyDown={onSlashKey}
            />
            {searchQuery !== null && (
              <Stack gap={2}>
                {results.length === 0 && (
                  <p className="esti-label esti-label--secondary">No matching elements.</p>
                )}
                {results.map((r, i) => (
                  <div key={r.id} className="esti-row-between">
                    <span>
                      {i === entry.highlight ? <Tag type="purple" size="sm">▸</Tag> : null} {r.name}
                      {r.category ? <span className="esti-label esti-label--secondary"> · {r.category}</span> : null}
                    </span>
                    <Tag type="gray" size="sm">{r.unit}</Tag>
                  </div>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {entry.phase !== "slash" && (
          <Stack gap={4}>
            <div className="esti-row-between">
              <span>
                {entry.dep && (
                  <Tag type="teal" size="sm">
                    Dependency {entry.dep.index + 1}/{entry.dep.total}
                  </Tag>
                )}{" "}
                <strong>{entry.element.name}</strong>
              </span>
              <span className="esti-row">
                {entry.phase === "measuring" && (
                  <Tag type="blue" size="sm">
                    Σ {fmtQty(runningTotalQty)} {entry.element.unit}
                  </Tag>
                )}
                <Tag type="gray" size="sm">{entry.element.unit}</Tag>
              </span>
            </div>

            {entry.phase === "armed" && (
              <div role="presentation" tabIndex={0} onKeyDown={onArmedKey} ref={(el) => el?.focus()}>
                <p className="esti-label esti-label--secondary">
                  Enter to start measurements{entry.dep ? " · Enter twice more to skip this dependency" : ""}.
                </p>
              </div>
            )}

            {entry.phase === "measuring" && (
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>#</TableHeader>
                    {entry.state.rows.map((label, r) => (
                      <TableHeader key={label + r}>{label}</TableHeader>
                    ))}
                    <TableHeader>Qty ({entry.element.unit})</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entry.state.recorded.map((m, i) => {
                    const keys: (keyof EstimateMeasurement)[] = ["nos", "l", "b", "h"];
                    return (
                      <TableRow key={i}>
                        <TableCell>M{i + 1}</TableCell>
                        {entry.state.rows.map((_, r) => (
                          <TableCell key={r}>{m[keys[r]!] ?? "—"}</TableCell>
                        ))}
                        <TableCell>{fmtQty(measurementQty(m, entry.element.unit))}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell>New</TableCell>
                    {entry.state.rows.map((label, r) => (
                      <TableCell key={label + r}>
                        <TextInput
                          id={`m-${r}`}
                          ref={r === entry.state.rowIdx ? activeCellRef : undefined}
                          labelText=""
                          hideLabel
                          size="sm"
                          className="esti-input-sm"
                          autoComplete="off"
                          value={entry.state.column[r] ?? ""}
                          onChange={(e) =>
                            setEntry({
                              ...entry,
                              state: setValue({ ...entry.state, rowIdx: r }, e.target.value),
                            })
                          }
                          onFocus={() => setEntry({ ...entry, state: { ...entry.state, rowIdx: r } })}
                          onKeyDown={onMeasureKey}
                        />
                      </TableCell>
                    ))}
                    <TableCell>{currentColumnQty == null ? "—" : fmtQty(currentColumnQty)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Stack>
        )}
        {error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={error} />
        )}
      </Tile>
    </Stack>
  );
}

export function ProjectEstimates({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.estimates.list.useQuery({ projectId });
  const create = trpc.estimates.create.useMutation({
    onSuccess: (row) => {
      void utils.estimates.list.invalidate({ projectId });
      setOpenId(row.id);
    },
  });
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const estimatesList = useMemo(() => listQ.data ?? [], [listQ.data]);

  if (openId) return <EstimateSheet estimateId={openId} onBack={() => setOpenId(null)} />;

  return (
    <Stack gap={5}>
      <Tile className="esti-fill">
        <Stack gap={4}>
          <h4>Estimates</h4>
          <p className="esti-label esti-label--secondary">
            Keyboard-first measurement sheets — elements from the Item Library, dimensions
            driven by the element's unit, dependencies queued automatically.
          </p>
          <div className="esti-row">
            <TextInput
              id="new-estimate-title"
              labelText="New estimate"
              placeholder={`Estimate ${estimatesList.length + 1}`}
              className="esti-input-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button
              size="md"
              disabled={create.isPending}
              onClick={() =>
                create.mutate({
                  projectId,
                  title: title.trim() || `Estimate ${estimatesList.length + 1}`,
                })
              }
            >
              New estimate
            </Button>
          </div>
          {create.isError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not create"
              subtitle={create.error.message}
            />
          )}
        </Stack>
      </Tile>

      {estimatesList.map((e) => (
        <Tile key={e.id} className="esti-fill">
          <div className="esti-row-between">
            <span>
              <strong>{e.title}</strong>{" "}
              <Tag type={e.status === "DRAFT" ? "gray" : "green"} size="sm">{e.status}</Tag>
            </span>
            <Button size="sm" kind="tertiary" onClick={() => setOpenId(e.id)}>
              Open sheet
            </Button>
          </div>
        </Tile>
      ))}
    </Stack>
  );
}
