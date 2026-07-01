/**
 * AORMS Studio Abstract — universal screen shell + register primitives.
 *
 * One pattern, many screens (dashboard spec §3/§4/§12). Every dashboard tab is
 * composed from these pieces:
 *   Header · Current State · Active Pressures · Register Snapshot ·
 *   Evidence / Suggested Action · ESTI Observation
 *
 * Pure Carbon: Tile / Stack / StructuredList / ProgressBar / Tag + semantic HTML.
 * Colour comes only from Carbon `--cds-*` tokens applied inline from ZONE_COLOR
 * (the same data-driven token pattern used across ESTI). No custom palettes.
 */
import {
  Column,
  Grid,
  ProgressBar,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
} from "@carbon/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// ── Zone state + palette (spec §6) ─────────────────────────────────────────────

export type ZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

export const ZONE_COLOR: Record<ZoneState, string> = {
  stable: "var(--cds-support-success)",
  watch: "var(--cds-support-info)",
  friction: "var(--cds-support-warning)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-secondary)",
};

const STATE_WORD: Record<ZoneState, string> = {
  stable: "Stable",
  watch: "Watch",
  friction: "Friction",
  critical: "Critical",
  inactive: "Inactive",
};

export function zoneTagType(s: ZoneState): "green" | "blue" | "purple" | "red" | "gray" {
  if (s === "critical") return "red";
  if (s === "friction") return "purple";
  if (s === "watch") return "blue";
  if (s === "stable") return "green";
  return "gray";
}

// ── Status symbol language (spec §5) ────────────────────────────────────────────
// ● Handled · ▲ Monitoring · ■ Act · ✕ Critical.
// StatusSymbol never emits ■ on its own: the single blue ■ Act marker is placed
// explicitly on the one primary Active Pressure (one ■ per screen). critical → ✕,
// watch/friction → ▲, stable/inactive → ●.

export type Glyph = "●" | "▲" | "■" | "✕";

export function glyphFor(state: ZoneState): Glyph {
  if (state === "critical") return "✕";
  if (state === "watch" || state === "friction") return "▲";
  return "●";
}

const GLYPH_CLASS: Record<Glyph, string> = {
  "●": "esti-geo--circle",
  "▲": "esti-geo--triangle",
  "■": "esti-geo--square",
  "✕": "esti-geo--x",
};

export function StatusSymbol({
  state,
  act = false,
  sm = false,
  label,
}: {
  state: ZoneState;
  act?: boolean;
  sm?: boolean;
  label?: string;
}) {
  const glyph: Glyph = act ? "■" : glyphFor(state);
  const color = act ? "var(--cds-interactive)" : ZONE_COLOR[state];
  return (
    <span
      className={`esti-geo ${GLYPH_CLASS[glyph]}${sm ? " esti-geo--sm" : ""}${act ? " esti-geo--act" : ""}`}
      style={{ color }}
      aria-label={label ?? STATE_WORD[state]}
    >
      {glyph}
    </span>
  );
}

// ── Section title ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return <span className="esti-label esti-label--secondary">{children}</span>;
}

// ── 1 · Screen header (spec §3) ─────────────────────────────────────────────────

export function ScreenHeader({
  title,
  state,
  signal,
}: {
  title: string;
  state: ZoneState;
  signal?: string;
}) {
  return (
    <div className="esti-zone-head">
      <div className="esti-grow">
        <h2>{title}</h2>
        {signal && <p style={{ color: "var(--cds-text-secondary)" }}>{signal}</p>}
      </div>
      <Tag type={zoneTagType(state)} size="md">
        {STATE_WORD[state]}
      </Tag>
    </div>
  );
}

// ── 2 · Current State (spec §7) ─────────────────────────────────────────────────

export function CurrentStateBlock({
  condition,
  state,
  band,
  balancePct,
  signal,
}: {
  condition: string;
  state: ZoneState;
  band: string;
  balancePct: number;
  signal: string;
}) {
  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <SectionTitle>CURRENT STATE</SectionTitle>
        <h3 style={{ color: ZONE_COLOR[state] }}>{condition}</h3>
        <div className="esti-row-between">
          <span className="esti-label">{band}</span>
          <span className="esti-label--secondary">{balancePct}% Operational Balance</span>
        </div>
        <ProgressBar label="Operational balance" hideLabel value={balancePct} max={100} size="small" />
        <p>{signal}</p>
      </Stack>
    </Tile>
  );
}

// ── 3 · Active Pressures (spec §7 — max 3, one ■ Act) ───────────────────────────

export type Pressure = {
  domain: string;
  issue: string;
  impact?: string;
  action: string;
  owner?: string;
  state: ZoneState;
  href?: string;
};

export function ActivePressureList({ pressures }: { pressures: Pressure[] }) {
  const items = pressures.slice(0, 3);
  // The single ■ Act marker: the top item, only when it is genuinely critical.
  const actIndex = items.findIndex((p) => p.state === "critical");
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <SectionTitle>ACTIVE PRESSURES</SectionTitle>
        {items.length === 0 ? (
          <div className="esti-row">
            <StatusSymbol state="stable" sm /> <span>No active pressures. Operating normally.</span>
          </div>
        ) : (
          items.map((p, i) => {
            const body = (
              <Stack gap={2}>
                <div className="esti-row">
                  <StatusSymbol state={p.state} act={i === actIndex} />
                  <Tag type={zoneTagType(p.state)} size="sm">
                    {p.domain}
                  </Tag>
                  {p.owner && <span className="esti-label--helper esti-grow" style={{ textAlign: "right" }}>{p.owner}</span>}
                </div>
                <p>{p.issue}</p>
                {p.impact && <span className="esti-label--helper">Impact · {p.impact}</span>}
                <span className="esti-label--secondary">→ {p.action}</span>
              </Stack>
            );
            return p.href ? (
              <Link key={i} to={p.href} className="esti-detail-item--link" style={{ display: "block" }}>
                {body}
              </Link>
            ) : (
              <div key={i}>{body}</div>
            );
          })
        )}
      </Stack>
    </Tile>
  );
}

// ── 4 · Register Snapshot (spec §7 — plain counts, no charts) ────────────────────

export type SnapshotRow = { label: string; value: string | number; state?: ZoneState };

export function RegisterSnapshot({ rows }: { rows: SnapshotRow[] }) {
  return (
    <Tile className="esti-fill">
      <Stack gap={3}>
        <SectionTitle>REGISTER SNAPSHOT</SectionTitle>
        <StructuredListWrapper isCondensed ariaLabel="Register snapshot">
          <StructuredListBody>
            {rows.map((r) => (
              <StructuredListRow key={r.label}>
                <StructuredListCell>{r.label}</StructuredListCell>
                <StructuredListCell style={{ textAlign: "right", color: r.state ? ZONE_COLOR[r.state] : undefined }}>
                  <strong>{r.value}</strong>
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </Stack>
    </Tile>
  );
}

// ── 5 · Evidence / Suggested Action (spec §7) ───────────────────────────────────

export type EvidenceRow = {
  fact: string;
  value?: string;
  state?: ZoneState;
  age?: string;
  href?: string;
};

export function EvidenceActionBlock({
  cause,
  action,
  rows,
  empty = "No supporting evidence — nothing outstanding.",
}: {
  cause?: string;
  action?: string;
  rows: EvidenceRow[];
  empty?: string;
}) {
  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <SectionTitle>EVIDENCE / SUGGESTED ACTION</SectionTitle>
        {cause && (
          <div>
            <span className="esti-label">Primary cause</span>
            <p>{cause}</p>
          </div>
        )}
        <Stack gap={2}>
          {rows.length === 0 ? (
            <div className="esti-row">
              <StatusSymbol state="stable" sm /> <span className="esti-label--secondary">{empty}</span>
            </div>
          ) : (
            rows.slice(0, 6).map((r, i) => {
              const inner = (
                <div className="esti-row">
                  <StatusSymbol state={r.state ?? "stable"} sm />
                  <span className="esti-grow">{r.fact}</span>
                  {r.value && <span className="esti-label--secondary">{r.value}</span>}
                  {r.age && <span className="esti-label--helper">{r.age}</span>}
                </div>
              );
              return r.href ? (
                <Link key={i} to={r.href} className="esti-detail-item--link" style={{ display: "block" }}>
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })
          )}
        </Stack>
        {action && (
          <div>
            <span className="esti-label">Suggested action</span>
            <p>{action}</p>
          </div>
        )}
      </Stack>
    </Tile>
  );
}

// ── 6 · ESTI Observation (spec §7 — small, observe not interrupt) ───────────────

export function EstiObservationPanel({
  observation,
  action,
}: {
  observation: string;
  action?: string;
}) {
  return (
    <Tile className="esti-fill">
      <Stack gap={3}>
        <SectionTitle>ESTI OBSERVATION</SectionTitle>
        <p>{observation}</p>
        {action && (
          <div>
            <span className="esti-label">Suggested action</span>
            <p>{action}</p>
          </div>
        )}
      </Stack>
    </Tile>
  );
}

// ── Universal shell (spec §3/§4) ────────────────────────────────────────────────
// Header + Current State span full width; Active Pressures (10) sits beside the
// Register Snapshot (6); Evidence (10) beside ESTI Observation (6). SUMMARY SHEETS
// and OFFICE LOG may omit Active Pressures — the snapshot then spans full width.

export function AbstractScreenShell({
  header,
  currentState,
  activePressures,
  registerSnapshot,
  evidence,
  observation,
}: {
  header: ReactNode;
  currentState: ReactNode;
  activePressures?: ReactNode;
  registerSnapshot: ReactNode;
  evidence: ReactNode;
  observation: ReactNode;
}) {
  const hasPressures = activePressures != null;
  return (
    <Grid fullWidth className="esti-abstract">
      <Column lg={16} md={8} sm={4}>
        {header}
      </Column>
      <Column lg={16} md={8} sm={4}>
        {currentState}
      </Column>
      {hasPressures && (
        <Column lg={10} md={8} sm={4}>
          {activePressures}
        </Column>
      )}
      <Column lg={hasPressures ? 6 : 16} md={8} sm={4}>
        {registerSnapshot}
      </Column>
      <Column lg={10} md={8} sm={4}>
        {evidence}
      </Column>
      <Column lg={6} md={8} sm={4}>
        {observation}
      </Column>
    </Grid>
  );
}
