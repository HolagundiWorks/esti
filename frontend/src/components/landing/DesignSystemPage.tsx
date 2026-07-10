import CheckIcon from "@mui/icons-material/Check";
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  BrandMark,
  colors,
  FONT_FAMILY,
  HealthGlassOrb,
  RADIUS,
  Surface,
  type HealthZoneState,
} from "@hcw/ui-kit";
import type { CSSProperties } from "react";
import { MarketingFooter } from "./MarketingFooter.js";

const DS_NAV = [
  { href: "/design-system#top", label: "Overview" },
  { href: "/design-system#thesis", label: "Thesis" },
  { href: "/design-system#layers", label: "Layers" },
  { href: "/design-system#spatial", label: "Spatial model" },
  { href: "/design-system#tokens", label: "Tokens" },
  { href: "/design-system#type", label: "Typography" },
  { href: "/design-system#components", label: "Components" },
  { href: "/design-system#ux", label: "UX principles" },
  { href: "/design-system#adopt", label: "Adopt" },
] as const;

export const DESIGN_SYSTEM_NAV = DS_NAV;

const LAYER_CARDS = [
  {
    n: "01",
    layer: "flat" as const,
    name: "Flat",
    tag: "Hyperminimalist",
    pct: "~90%",
    role: "Information at rest",
    uses: "Tables, body text, headings, labels, inputs at rest",
    feel: "Calm. Legible. Most pixels live here.",
  },
  {
    n: "02",
    layer: "soft" as const,
    name: "Soft",
    tag: "Neumorphic",
    pct: "~8%",
    role: "Objects you work within",
    uses: "Dialogs, panels, summary cards, recessed input wells",
    feel: "A physical block lifted off the canvas.",
  },
  {
    n: "03",
    layer: "glass" as const,
    name: "Glass",
    tag: "Glassmorphism",
    pct: "~2%",
    role: "Actions & alerts that rise",
    uses: "Hover, CTAs, ActionDock, priority alerts, rail chrome",
    feel: "Scarce on purpose — when everything glows, nothing does.",
  },
] as const;

const PALETTE = [
  { token: "background", hex: colors.background, label: "Fog Gray", role: "Canvas" },
  { token: "layer01", hex: colors.layer01, label: "Pure White", role: "Cards" },
  { token: "ink", hex: colors.ink, label: "Coal Black", role: "Ink" },
  { token: "textSecondary", hex: colors.textSecondary, label: "Slate", role: "Muted" },
  { token: "textHelper", hex: colors.textHelper, label: "Helper", role: "Hints · AA" },
  { token: "accent", hex: colors.accent, label: "Radiant Orange", role: "Fill accent only" },
  { token: "supportSuccess", hex: colors.supportSuccess, label: "Teal green", role: "Success" },
  { token: "supportWarning", hex: colors.supportWarning, label: "Saffron", role: "Warning" },
  { token: "supportError", hex: colors.supportError, label: "Burnt red", role: "Error" },
  { token: "supportInfo", hex: colors.supportInfo, label: "Slate blue", role: "Links · info" },
] as const;

const ORB_STATES: { state: HealthZoneState; label: string }[] = [
  { state: "stable", label: "Stable" },
  { state: "watch", label: "Watch" },
  { state: "friction", label: "Friction" },
  { state: "critical", label: "Critical" },
  { state: "inactive", label: "Inactive" },
];

const UX_LAWS = [
  { law: "Fitts's Law", rule: "Big, reachable targets", hcw: "44px chrome · dock bottom-centre" },
  { law: "Hick's Law", rule: "Fewer choices, faster decisions", hcw: "One ActionDock · rail nav only" },
  { law: "Miller's Law", rule: "Chunk working memory", hcw: "≤4 KPIs · ≤4 trust chips" },
  { law: "Von Restorff", rule: "Distinct stands out", hcw: "One orange accent · glass scarce" },
  { law: "Jakob's Law", rule: "Familiar geography", hcw: "Rail · stage · footer · dock everywhere" },
  { law: "Progressive disclosure", rule: "Reveal on demand", hcw: "FAQ details · create in dialogs" },
] as const;

function reveal(delay = 0): CSSProperties {
  return { "--lp-reveal-delay": `${delay}ms` } as CSSProperties;
}

function DsHead({
  id,
  tag,
  title,
  body,
}: {
  id: string;
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <div className="lp2-section-head lp2-ds-head lp2-reveal" id={id} style={reveal(0)}>
      <p className="lp2-section-head__tag">{tag}</p>
      <h2 className="lp2-section-head__title">{title}</h2>
      <p className="lp2-section-head__body">{body}</p>
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div className="lp2-ds">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="lp2-ds-hero" id="top" aria-labelledby="ds-h1">
        <div className="lp2-ds-hero__glow" aria-hidden />
        <div className="lp2-ds-hero__inner lp2-reveal" style={reveal(0)}>
          <p className="lp2-ds-hero__eyebrow">
            <span className="lp2-ds-hero__pkg">@hcw/ui-kit</span>
            <span className="lp2-ds-hero__sep" aria-hidden>
              ·
            </span>
            Human Centric Works
          </p>
          <h1 id="ds-h1" className="lp2-ds-hero__title">
            Depth encodes
            <span className="lp2-ds-hero__accent"> importance.</span>
          </h1>
          <p className="lp2-ds-hero__lead">
            HCW-UI-Kit is the layered design system behind every AORMS surface — workspace,
            portals, licensing console, and marketing. Three material languages stack by role:
            flat information, soft objects, glass action. You never pick a layer by taste.
          </p>
          <div className="lp2-ds-hero__marks">
            <BrandMark label="HCW" size="lg" />
            <span className="lp2-ds-hero__marks-sep" aria-hidden>
              ×
            </span>
            <BrandMark label="AORMS" size="lg" accent={false} />
          </div>
          <Stack direction="row" spacing={1.25} className="lp2-ds-hero__chips" sx={{ flexWrap: "wrap" }}>
            {["Layered surfaces", "Rail · Stage · Dock", "Urbanist", "WCAG AA"].map((c) => (
              <span key={c} className="lp2-ds-chip">
                <CheckIcon sx={{ fontSize: 14 }} aria-hidden />
                {c}
              </span>
            ))}
          </Stack>
        </div>

        <div className="lp2-ds-stack lp2-reveal" style={reveal(120)} aria-hidden>
          <Surface layer="flat" className="lp2-ds-stack__card lp2-ds-stack__card--flat">
            <span>L1 · Flat</span>
          </Surface>
          <Surface layer="soft" className="lp2-ds-stack__card lp2-ds-stack__card--soft">
            <span>L2 · Soft</span>
          </Surface>
          <Surface layer="glass" className="lp2-ds-stack__card lp2-ds-stack__card--glass">
            <span>L3 · Glass</span>
          </Surface>
        </div>
      </section>

      {/* ── Thesis ───────────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-thesis-title">
        <DsHead
          id="thesis"
          tag="Thesis"
          title="Calm at rest. Glass only when it acts."
          body="Most of an architecture office screen is reading — invoices, drawings registers, team load. The kit keeps ~90% of pixels flat so attention concentrates where work happens: the dock, alerts, and hover states that invite a click."
        />
        <div className="lp2-grid lp2-grid--3">
          {[
            {
              title: "Flat = info",
              body: "Fog Gray canvas, Pure White cards, hairline rules. No box shadows on data.",
            },
            {
              title: "Soft = object",
              body: "Neumorphic extrusion for dialogs and panels — something you handle.",
            },
            {
              title: "Glass = action",
              body: "Frosted lift for CTAs, dock chrome, and priority alerts. Orange concentrates here.",
            },
          ].map((t, i) => (
            <article key={t.title} className="lp2-tile lp2-reveal" style={reveal(40 * i)}>
              <div className="lp2-tile__body">
                <h3 className="lp2-tile__title">{t.title}</h3>
                <p className="lp2-tile__detail">{t.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Layers (live) ────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-layers-title">
        <DsHead
          id="layers"
          tag="Material layers"
          title="Pick the layer by role — not by mood."
          body="Use the decision tree: table at rest → flat; dialog → soft; dock or alert → glass; marketing rail → clearGlass; section opener → headingGlass; marketing sub-card → flat with hairlines only."
        />
        <div className="lp2-ds-layers">
          {LAYER_CARDS.map((card, i) => (
            <article
              key={card.n}
              className="lp2-ds-layer-card lp2-reveal"
              style={reveal(50 * i)}
            >
              <Surface layer={card.layer} sx={{ p: 2.5, height: "100%" }}>
                <p className="lp2-ds-layer-card__n">{card.n}</p>
                <p className="lp2-ds-layer-card__tag">{card.tag}</p>
                <h3 className="lp2-ds-layer-card__name">{card.name}</h3>
                <p className="lp2-ds-layer-card__pct">{card.pct} of pixels</p>
                <p className="lp2-ds-layer-card__role">{card.role}</p>
                <p className="lp2-ds-layer-card__uses">{card.uses}</p>
                <p className="lp2-ds-layer-card__feel">{card.feel}</p>
              </Surface>
            </article>
          ))}
        </div>

        <div className="lp2-ds-glass-row lp2-reveal" style={reveal(180)}>
          <Surface layer="clearGlass" sx={{ p: 2.5, flex: 1 }}>
            <p className="lp2-ds-mini__tag">Marketing</p>
            <h4 className="lp2-ds-mini__title">clearGlass</h4>
            <p className="lp2-ds-mini__body">
              Translucent rail — contours stay readable through the shell.
            </p>
          </Surface>
          <Surface layer="headingGlass" sx={{ p: 2.5, flex: 2 }}>
            <p className="lp2-ds-mini__tag">Marketing</p>
            <h4 className="lp2-ds-mini__title">headingGlass</h4>
            <p className="lp2-ds-mini__body">
              Full-width section band with accent left rule — the only stage glass on
              marketing pages. Sub-cards stay flat.
            </p>
          </Surface>
        </div>
      </section>

      {/* ── Spatial model ────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-spatial-title">
        <DsHead
          id="spatial"
          tag="Spatial model"
          title="Rail · Stage · Footer · Dock — one geography everywhere."
          body="Users build muscle memory when chrome never moves. The rail holds instruments and identity; the stage holds work; the taskbar footer holds tools; the ActionDock holds page-level intent in three fixed zones."
        />
        <div className="lp2-ds-shell lp2-reveal" style={reveal(60)} role="img" aria-label="AORMS shell diagram">
          <div className="lp2-ds-shell__ribbon">Ribbon — Projects · Clients · Teams · Office</div>
          <div className="lp2-ds-shell__body">
            <Surface layer="glass" className="lp2-ds-shell__rail">
              <span className="lp2-ds-shell__label">Rail 20%</span>
              <span className="lp2-ds-shell__hint">Identity · telemetry · tabs · login</span>
            </Surface>
            <div className="lp2-ds-shell__stage">
              <span className="lp2-ds-shell__label">Stage 80%</span>
              <span className="lp2-ds-shell__hint">Tables · editors · KPI head</span>
              <Surface layer="soft" className="lp2-ds-shell__panel">
                Layer 2 panel
              </Surface>
              <div className="lp2-ds-shell__dock" aria-hidden>
                <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--left">Delete</span>
                <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--center">＋ New</span>
                <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--right">Save</span>
              </div>
            </div>
          </div>
          <div className="lp2-ds-shell__footer">Taskbar — Calc · Studio · Tasks · Search · tray</div>
        </div>

        <div className="lp2-grid lp2-grid--3 lp2-ds-dock-legend">
          {[
            { z: "LEFT", tone: "Destroy", ex: "Delete · Discard · Cancel", cls: "left" },
            { z: "CENTER", tone: "Create", ex: "New · Add · Generate", cls: "center" },
            { z: "RIGHT", tone: "Commit", ex: "Save · Update · Send", cls: "right" },
          ].map((d) => (
            <div key={d.z} className={`lp2-ds-dock-legend__item lp2-ds-dock-legend__item--${d.cls}`}>
              <p className="lp2-ds-dock-legend__z">{d.z}</p>
              <p className="lp2-ds-dock-legend__tone">{d.tone}</p>
              <p className="lp2-ds-dock-legend__ex">{d.ex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tokens ───────────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-tokens-title">
        <DsHead
          id="tokens"
          tag="Design tokens"
          title="One source of truth — every portal moves together."
          body="Colour, radius, type, and surface recipes live in packages/hcw-ui-kit/src/tokens.ts. The MUI theme is built entirely from these. No raw hex in product screens."
        />
        <div className="lp2-ds-palette lp2-reveal" style={reveal(40)}>
          {PALETTE.map((sw) => (
            <div key={sw.token} className="lp2-ds-swatch">
              <div
                className="lp2-ds-swatch__chip"
                style={{
                  background: sw.hex,
                  color: sw.token === "accent" || sw.token === "ink" ? "#fff" : colors.ink,
                }}
              >
                {sw.hex}
              </div>
              <p className="lp2-ds-swatch__name">{sw.label}</p>
              <p className="lp2-ds-swatch__token">{sw.token}</p>
              <p className="lp2-ds-swatch__role">{sw.role}</p>
            </div>
          ))}
        </div>
        <div className="lp2-ds-meta lp2-reveal" style={reveal(100)}>
          <div>
            <p className="lp2-ds-meta__label">Corner radius</p>
            <p className="lp2-ds-meta__value">{RADIUS}px soft-square everywhere</p>
          </div>
          <div>
            <p className="lp2-ds-meta__label">Accent rule</p>
            <p className="lp2-ds-meta__value">Orange fills carry white text — links use slate</p>
          </div>
          <div>
            <p className="lp2-ds-meta__label">Package</p>
            <p className="lp2-ds-meta__value">@hcw/ui-kit · workspace monorepo</p>
          </div>
        </div>
      </section>

      {/* ── Typography ───────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-type-title">
        <DsHead
          id="type"
          tag="Typography"
          title="Urbanist — one voice from hero to DataGrid."
          body="Self-hosted via @fontsource/urbanist. Weights 400–700 across marketing and product. Editorial marketing type may extend the scale in landing.scss; app screens use the kit theme."
        />
        <div className="lp2-ds-type lp2-reveal" style={reveal(40)}>
          <p className="lp2-ds-type__display" style={{ fontFamily: FONT_FAMILY }}>
            Architecture practice, clarified.
          </p>
          <div className="lp2-ds-type__scale">
            {[
              { tag: "Display", size: "clamp(2rem, 4vw, 3rem)", weight: 700 },
              { tag: "H2 section", size: "clamp(1.5rem, 2.8vw, 2.25rem)", weight: 700 },
              { tag: "Body", size: "1.0625rem", weight: 400 },
              { tag: "Overline", size: "0.68rem", weight: 700, uppercase: true },
            ].map((row) => (
              <div key={row.tag} className="lp2-ds-type__row">
                <span className="lp2-ds-type__tag">{row.tag}</span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: row.size,
                    fontWeight: row.weight,
                    letterSpacing: row.uppercase ? "0.14em" : "-0.02em",
                    textTransform: row.uppercase ? "uppercase" : "none",
                  }}
                >
                  {row.uppercase ? "Studio intelligence" : "Fees, revisions, and GST in one record."}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Components ───────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-components-title">
        <DsHead
          id="components"
          tag="Primitives"
          title="Compose screens from kit exports — not one-off chrome."
          body="Surface, GlassRail, ActionDock, TaskbarFooter, HealthGlassOrb, and BrandMark ship from @hcw/ui-kit. Screens publish CTAs with useScreenActions; they never render inline Save buttons once adopted."
        />
        <div className="lp2-grid lp2-grid--2">
          <article className="lp2-tile lp2-reveal" style={reveal(0)}>
            <div className="lp2-tile__body">
              <h3 className="lp2-tile__title">HealthGlassOrb</h3>
              <p className="lp2-tile__detail">
                Shape encodes severity without colour alone — circle, triangle, square.
              </p>
              <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap" }}>
                {ORB_STATES.map(({ state, label }) => (
                  <Stack key={state} spacing={0.5} sx={{ alignItems: "center" }}>
                    <HealthGlassOrb state={state} size={26} title={label} variant="glass" />
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </div>
          </article>
          <article className="lp2-tile lp2-reveal" style={reveal(60)}>
            <div className="lp2-tile__body">
              <h3 className="lp2-tile__title">BrandMark</h3>
              <p className="lp2-tile__detail">Asset-free wordmark for portals without image files.</p>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <BrandMark size="sm" />
                <BrandMark size="md" />
                <BrandMark size="lg" label="AORMS Estimate" />
              </Stack>
            </div>
          </article>
        </div>

        <pre className="lp2-ds-code lp2-reveal" style={reveal(120)}>
          <code>{`import {
  MuiRoot, Surface, GlassRail, ActionDock, ActionDockProvider,
  useScreenActions, HealthGlassOrb, TaskbarFooter,
} from "@hcw/ui-kit";

useScreenActions([
  { id: "del",  zone: "left",   tone: "danger",  label: "Delete", onClick },
  { id: "new",  zone: "center", tone: "primary", label: "New",    onClick },
  { id: "save", zone: "right",  tone: "primary", label: "Save",   onClick },
], [deps]);`}</code>
        </pre>
      </section>

      {/* ── UX principles ──────────────────────────────────────────────────── */}
      <section className="lp2-section" aria-labelledby="ds-ux-title">
        <DsHead
          id="ux"
          tag="UX principles"
          title="Laws and heuristics — mapped to HCW decisions."
          body="HCW-UI-UX-PRINCIPLES.md is the canonical why companion to this kit. Every pattern below is enforced in code review, not a CI guard."
        />
        <Box className="lp2-ds-table-wrap lp2-reveal" style={reveal(40)}>
          <Table size="small" aria-label="UX laws mapped to HCW">
            <TableHead>
              <TableRow>
                <TableCell>Law</TableCell>
                <TableCell>Rule</TableCell>
                <TableCell>HCW pattern</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {UX_LAWS.map((row) => (
                <TableRow key={row.law}>
                  <TableCell component="th" scope="row">
                    {row.law}
                  </TableCell>
                  <TableCell>{row.rule}</TableCell>
                  <TableCell>{row.hcw}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </section>

      {/* ── Adopt ────────────────────────────────────────────────────────── */}
      <section className="lp2-section lp2-ds-adopt" aria-labelledby="ds-adopt-title">
        <DsHead
          id="adopt"
          tag="Adopt"
          title="Mount the kit once. Ship calm interfaces forever."
          body="Workspace, client portal, consultant portal, and marketing all share this system. Change a token here — every surface moves. Read the full spec in the repo docs or open the live product."
        />
        <div className="lp2-ds-adopt__cta lp2-reveal" style={reveal(60)}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant="contained" color="primary" href="/login" size="large">
              Open workspace
            </Button>
            <Button variant="outlined" href="/" size="large">
              AORMS home
            </Button>
            <Button
              variant="text"
              href="https://github.com/HolagundiWorks/esti/blob/main/docs/esti/HCW-UI-KIT.md"
              target="_blank"
              rel="noopener noreferrer"
              size="large"
            >
              HCW-UI-KIT.md
            </Button>
          </Stack>
          <p className="lp2-ds-adopt__docs">
            Also: HCW-UI-UX-PRINCIPLES.md · AORMS-BRANDING-KIT.md · packages/hcw-ui-kit/README.md
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
