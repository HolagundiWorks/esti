/**
 * AORMS Studio Intelligence — universal screen shell.
 *
 * One structure for every tab: a header, a row of 4 KPI cards, then a data table
 * that fills the rest of the viewport and scrolls *inside its Tile* (the page
 * itself never scrolls). Pure Carbon — Tile + DataTable only; status is the ●▲■
 * glyph in its alert colour (zoneState.ts). Colour only from `--cds-*` tokens.
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GLYPH_CLASS, glyphFor, STATE_WORD, ZONE_COLOR } from "./zoneState.js";
import type { ZoneState } from "./zoneState.js";

export type { ZoneState } from "./zoneState.js";

// ── Status glyph (spec §5) — shape + alert colour ───────────────────────────────

export function StatusSymbol({
  state,
  sm = false,
  label,
}: {
  state: ZoneState;
  sm?: boolean;
  label?: string;
}) {
  const glyph = glyphFor(state);
  return (
    <span
      className={`esti-geo ${GLYPH_CLASS[glyph]}${sm ? " esti-geo--sm" : ""}`}
      style={{ color: ZONE_COLOR[state] }}
      aria-label={label ?? STATE_WORD[state]}
    >
      {glyph}
    </span>
  );
}

// ── Screen header ───────────────────────────────────────────────────────────────

function ScreenHeader({ title, state, signal }: { title: string; state: ZoneState; signal?: string }) {
  return (
    <div className="esti-zone-head esti-abstract__head">
      <div className="esti-grow">
        <h2>{title}</h2>
        {signal && <p style={{ color: "var(--cds-text-secondary)" }}>{signal}</p>}
      </div>
      <span className="esti-label" style={{ color: ZONE_COLOR[state] }}>
        <StatusSymbol state={state} sm /> {STATE_WORD[state]}
      </span>
    </div>
  );
}

// ── Data types ──────────────────────────────────────────────────────────────────

export type Kpi = { label: string; value: string | number; state?: ZoneState };
export type TableRowData = { state?: ZoneState; cells: ReactNode[]; href?: string };

// ── Universal shell: header · 4 KPI cards · scrollable table ─────────────────────

export function AbstractScreenShell({
  title,
  state,
  signal,
  kpis,
  tableTitle,
  headers,
  rows,
  empty = "Nothing to show.",
}: {
  title: string;
  state: ZoneState;
  signal?: string;
  kpis: Kpi[];
  tableTitle?: string;
  headers: string[];
  rows: TableRowData[];
  empty?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="esti-abstract">
      <ScreenHeader title={title} state={state} signal={signal} />

      <div className="esti-kpi-row">
        {kpis.slice(0, 4).map((k) => (
          <Tile key={k.label} className="esti-kpi-card">
            <span className="esti-label--helper">{k.label}</span>
            <h3 style={{ color: k.state ? ZONE_COLOR[k.state] : undefined }}>{k.value}</h3>
          </Tile>
        ))}
      </div>

      <Tile className="esti-abstract-table">
        {tableTitle && <span className="esti-label esti-label--secondary">{tableTitle}</span>}
        <div className="esti-abstract-table__scroll">
          {rows.length === 0 ? (
            <p className="esti-label--secondary" style={{ padding: "var(--cds-spacing-03) 0" }}>
              <StatusSymbol state="stable" sm /> {empty}
            </p>
          ) : (
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader> </TableHeader>
                  {headers.map((h) => (
                    <TableHeader key={h}>{h}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow
                    key={i}
                    className={r.href ? "esti-row-clickable" : undefined}
                    onClick={r.href ? () => navigate(r.href!) : undefined}
                  >
                    <TableCell>
                      <StatusSymbol state={r.state ?? "stable"} sm />
                    </TableCell>
                    {r.cells.map((c, j) => (
                      <TableCell key={j}>{c}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Tile>
    </div>
  );
}
