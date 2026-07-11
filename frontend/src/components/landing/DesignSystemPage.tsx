import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import {
  ActionDock,
  ActionDockProvider,
  Avatar,
  BrandMark,
  colors,
  createAormsTheme,
  FONT_FAMILY,
  HealthGlassOrb,
  RADIUS,
  BUTTON_RADIUS,
  DOCK_PILL_RADIUS,
  DIALOG_RADIUS,
  SCHEMES,
  StatusDot,
  Surface,
  liquidGlassSpecimenSx,
  sectionDockChipSx,
  useScreenActions,
  type DockAction,
  type HealthZoneState,
  type SchemeName,
} from "@hcw/ui-kit";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { AORMS_PORTALS, AORMS_STUDIO } from "../../lib/product-nomenclature.js";
const DS_NAV = [
  { href: "/design-system#top", label: "Overview" },
  { href: "/design-system#thesis", label: "Thesis" },
  { href: "/design-system#assignment", label: "Layer map" },
  { href: "/design-system#spatial", label: "Spatial model" },
  { href: "/design-system#tokens", label: "Tokens" },
  { href: "/design-system#type", label: "Typography" },
  { href: "/design-system#components", label: "Components" },
  { href: "/design-system#schemes", label: "Schemes" },
  { href: "/design-system#ux", label: "UX" },
  { href: "/design-system#adopt", label: "Adopt" },
] as const;

export const DESIGN_SYSTEM_NAV = DS_NAV;

const LAYER_ROWS = [
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

const FLAT_ELEMENTS = [
  "Data tables & DataGrid rows",
  "Body copy, headings, labels, breadcrumbs",
  "KPI numbers at rest",
  "Stage canvas & Fog Gray page background",
  "Tab bar chrome (transparent + top alert line)",
  "Marketing sub-sections (hairline dividers only)",
  "Chips & badges at rest",
] as const;

const SOFT_ELEMENTS = [
  "Dialogs & drawers (NEU_POP)",
  "Summary / highlight panels inside the stage",
  "ActionDock container (ACTION_DOCK_TRAY — NEU_RAISED capsule)",
  "Form panels inside dialogs",
  "Recessed text inputs & entry wells",
  "Float widgets — calculator, Pomodoro",
  "Menus & popovers (FLAT_POP — elevated, not glass)",
] as const;

const GLASS_ELEMENTS = [
  "Workspace glass rail (20% viewport)",
  "Taskbar footer strip",
  "Button hover & focus lift",
  "Priority error / warning alerts",
  "ActionDock hover chrome",
  "Marketing rail (clearGlass)",
  "Marketing section headings (headingGlass)",
  "Login rail frost · HealthGlassOrb (glass)",
] as const;

function reveal(delay = 0): CSSProperties {
  return { "--lp-reveal-delay": `${delay}ms` } as CSSProperties;
}

function LayerLabel({ layer }: { layer: "flat" | "soft" | "glass" }) {
  const label =
    layer === "flat" ? "L1 · Flat" : layer === "soft" ? "L2 · Soft" : "L3 · Glass";
  return <span className={`lp2-ds-layer-label lp2-ds-layer-label--${layer}`}>{label}</span>;
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
    <header className="lp2-ds-head lp2-reveal" id={id} style={reveal(0)}>
      <p className="lp2-ds-head__tag">{tag}</p>
      <h2 className="lp2-ds-head__title">{title}</h2>
      <p className="lp2-ds-head__body">{body}</p>
    </header>
  );
}

function DsRow({
  title,
  detail,
  label,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  label?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`lp2-ds-row ${className}`.trim()}>
      <div className="lp2-ds-row__text">
        <div className="lp2-ds-row__title-line">
          <h3 className="lp2-ds-row__title">{title}</h3>
          {label}
        </div>
        {detail ? <p className="lp2-ds-row__detail">{detail}</p> : null}
      </div>
      {children ? <div className="lp2-ds-row__demo">{children}</div> : null}
    </div>
  );
}

const HERO_DOCK_ACTIONS: DockAction[] = [
  { id: "del", zone: "left", tone: "danger", label: "Delete", onClick: () => {} },
  { id: "new", zone: "center", tone: "primary", label: "New", onClick: () => {} },
  { id: "save", zone: "right", tone: "primary", label: "Save", onClick: () => {} },
];

function HeroDockActions() {
  useScreenActions(HERO_DOCK_ACTIONS, []);
  return null;
}

/** Real ActionDock from @hcw/ui-kit — embedded in the hero canvas (not viewport-fixed). */
function HeroActionDockSpecimen() {
  return (
    <div className="lp2-ds-hero-dock-wrap" aria-hidden>
      <p className="lp2-ds-hero-dock__tag">
        <LayerLabel layer="soft" />
        <span>ActionDock · left · centre · right</span>
        <span className="lp2-ds-hero-dock__tag-sep" aria-hidden>
          ·
        </span>
        <LayerLabel layer="glass" />
        <span>flat pill buttons · liquid glass on hover</span>
        <Box component="span" sx={liquidGlassSpecimenSx()} aria-hidden>
          Save
        </Box>
      </p>
      <ActionDockProvider>
        <HeroDockActions />
        <ActionDock />
      </ActionDockProvider>
      <p className="lp2-ds-hero-dock__hint">
        Bottom-centre on the stage — same component as the workspace ActionDock.
      </p>
    </div>
  );
}

/** Mini rail panel — NEU_RAISED shell with recessed wells (classic soft UI). */
function HeroNeuRailSpecimen() {
  return (
    <Surface
      layer="soft"
      className="lp2-ds-hero-tile"
      sx={{
        p: 2.5,
        flex: 1,
        minHeight: "13.5rem",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        borderRadius: 0,
      }}
    >
      <p className="lp2-ds-hero-tile__tag">NEU_RAISED</p>
      <div className="lp2-ds-hero-tile__brand">
        <BrandMark label="A" size="sm" accent accentShape="a" />
        <span className="lp2-ds-hero-tile__brand-name">Studio</span>
      </div>
      <nav className="lp2-ds-hero-tile__nav" aria-hidden>
        {(
          [
            { label: "Overview", active: true },
            { label: "Projects", active: false },
            { label: "Tasks", active: false },
          ] as const
        ).map((item) => (
          <span
            key={item.label}
            className={`lp2-ds-hero-tile__link${item.active ? " lp2-ds-hero-tile__link--active" : ""}`}
          >
            {item.label}
          </span>
        ))}
      </nav>
      <div className="lp2-ds-hero-tile__input" aria-hidden>
        Search…
      </div>
    </Surface>
  );
}

export function DesignSystemPage() {
  const [tabDemo, setTabDemo] = useState(0);
  const [scheme, setScheme] = useState<SchemeName>("light");

  return (
    <div className="lp2-ds">
      <section className="lp2-ds-hero" id="top" aria-labelledby="ds-h1">
        <div className="lp2-ds-hero__canvas">
          <p className="lp2-ds-hero__canvas-tag">
            <LayerLabel layer="flat" />
            <span>Rail · Stage · Dock</span>
          </p>

          <div className="lp2-ds-hero__layout">
            <aside className="lp2-ds-hero__rail" aria-hidden>
              <p className="lp2-ds-hero__rail-tag">
                <LayerLabel layer="soft" />
                <span>Rail · NEU_RAISED</span>
              </p>
              <div className="lp2-reveal" style={reveal(40)}>
                <HeroNeuRailSpecimen />
              </div>
            </aside>

            <div className="lp2-ds-hero__stage">
              <p className="lp2-ds-hero__stage-tag">
                <LayerLabel layer="flat" />
                <span>Stage · flat canvas</span>
              </p>
              <div className="lp2-ds-hero__inner lp2-reveal" style={reveal(0)}>
                <p className="lp2-ds-hero__eyebrow">
                  <span className="lp2-ds-hero__pkg">@hcw/ui-kit</span>
                  <span aria-hidden> · </span>
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
                  <BrandMark label="HCW" size="lg" accent={false} />
                  <span className="lp2-ds-hero__marks-sep" aria-hidden>
                    ×
                  </span>
                  <BrandMark label="AORMS" size="lg" accent={false} />
                </div>
                <p className="lp2-ds-hero__meta">
                  Layered surfaces · Square panels · Urbanist · WCAG AA
                </p>
              </div>
            </div>
          </div>

          <HeroActionDockSpecimen />
        </div>
      </section>

      <div className="lp2-ds-stage">
        <section className="lp2-ds-section" aria-labelledby="ds-thesis-title">
          <DsHead
            id="thesis"
            tag="Thesis"
            title="Calm at rest. Glass only when it acts."
            body="Most of an architecture office screen is reading — invoices, drawings registers, team load. The kit keeps ~90% of pixels flat so attention concentrates where work happens: the dock, alerts, and hover states that invite a click."
          />
          <div className="lp2-ds-rows">
            {[
              {
                title: "Square = surface",
                body: "Panels, dialogs, inputs, rails use 0 radius — hairlines and spacing define edges. ActionDock is the capsule-pill exception (tray + buttons).",
              },
              {
                title: "Soft = object",
                body: "Neumorphic extrusion for dialogs and panels — something you handle.",
              },
              {
                title: "Glass = action",
                body: "Frosted lift for dock pill buttons on hover, priority alerts. Orange concentrates here.",
              },
            ].map((t) => (
              <DsRow key={t.title} title={t.title} detail={t.body} />
            ))}
          </div>
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-assignment-title">
          <DsHead
            id="assignment"
            tag="Layer map"
            title="What stays flat — and what earns soft or glass."
            body="This page is entirely flat — division lines only. Use the map below when building a screen. Point at any row and we can promote it to soft or glass."
          />
          <div className="lp2-ds-assignment">
            {(
              [
                { layer: "flat" as const, pct: "~90%", role: "Information at rest", items: FLAT_ELEMENTS },
                { layer: "soft" as const, pct: "~8%", role: "Objects you work within", items: SOFT_ELEMENTS },
                { layer: "glass" as const, pct: "~2%", role: "Actions & alerts that rise", items: GLASS_ELEMENTS },
              ] as const
            ).map((col) => (
              <div key={col.layer} className={`lp2-ds-assignment__col lp2-ds-assignment__col--${col.layer}`}>
                <div className="lp2-ds-assignment__head">
                  <LayerLabel layer={col.layer} />
                  <span className="lp2-ds-assignment__pct">{col.pct}</span>
                </div>
                <p className="lp2-ds-assignment__role">{col.role}</p>
                <ul className="lp2-ds-assignment__list">
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lp2-ds-rows">
            {LAYER_ROWS.map((row) => (
              <DsRow
                key={row.n}
                title={`${row.n} — ${row.name}`}
                label={<LayerLabel layer={row.layer} />}
                detail={`${row.tag} · ${row.pct} · ${row.role}. ${row.uses} ${row.feel}`}
              />
            ))}
          </div>
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-spatial-title">
          <DsHead
            id="spatial"
            tag="Spatial model"
            title="Rail · Stage · Footer · Dock — one geography everywhere."
            body="Users build muscle memory when chrome never moves. The rail holds instruments and identity; the stage holds work; the taskbar footer holds tools; the ActionDock holds page-level intent in three fixed zones."
          />
          <div className="lp2-ds-shell" role="img" aria-label="AORMS shell diagram">
            <div className="lp2-ds-shell__ribbon">Ribbon — Projects · Clients · Teams · Office</div>
            <div className="lp2-ds-shell__body">
              <div className="lp2-ds-shell__rail">
                <LayerLabel layer="glass" />
                <span className="lp2-ds-shell__label">Rail 20%</span>
                <span className="lp2-ds-shell__hint">Identity · telemetry · tabs · login</span>
              </div>
              <div className="lp2-ds-shell__stage">
                <LayerLabel layer="flat" />
                <span className="lp2-ds-shell__label">Stage 80%</span>
                <span className="lp2-ds-shell__hint">Tables · editors · KPI head · reading content</span>
                <div className="lp2-ds-shell__panel">
                  <LayerLabel layer="soft" />
                  Dialog / panel
                </div>
                <div className="lp2-ds-shell__dock" aria-hidden>
                  <LayerLabel layer="glass" />
                  <div className="lp2-ds-shell__dock-row">
                    <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--left">Delete</span>
                    <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--center">＋ New</span>
                    <span className="lp2-ds-shell__dock-z lp2-ds-shell__dock-z--right">Save</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp2-ds-shell__footer">
              <LayerLabel layer="glass" />
              Taskbar — Calc · Studio · Tasks · Search · tray
            </div>
          </div>

          <div className="lp2-ds-rows">
            {[
              { z: "LEFT", tone: "Destroy", ex: "Delete · Discard · Cancel", cls: "left" },
              { z: "CENTER", tone: "Create", ex: "New · Add · Generate", cls: "center" },
              { z: "RIGHT", tone: "Commit", ex: "Save · Update · Send", cls: "right" },
            ].map((d) => (
              <div key={d.z} className={`lp2-ds-row lp2-ds-row--dock lp2-ds-row--dock-${d.cls}`}>
                <p className="lp2-ds-row__title">{d.z}</p>
                <p className="lp2-ds-row__detail">
                  {d.tone} — {d.ex}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-tokens-title">
          <DsHead
            id="tokens"
            tag="Design tokens"
            title="One source of truth — every portal moves together."
            body="Colour, radius, type, and surface recipes live in packages/hcw-ui-kit/src/tokens.ts. The MUI theme is built entirely from these. No raw hex in product screens."
          />
          <div className="lp2-ds-rows lp2-ds-rows--palette">
            {PALETTE.map((sw) => (
              <div key={sw.token} className="lp2-ds-palette-row">
                <span
                  className="lp2-ds-palette-row__dot"
                  style={{ background: sw.hex }}
                  aria-hidden
                />
                <span className="lp2-ds-palette-row__name">{sw.label}</span>
                <span className="lp2-ds-palette-row__token">{sw.token}</span>
                <span className="lp2-ds-palette-row__hex">{sw.hex}</span>
                <span className="lp2-ds-palette-row__role">{sw.role}</span>
              </div>
            ))}
          </div>
          <div className="lp2-ds-rows">
            <DsRow
              title="Corner radius"
              detail={`${RADIUS}px surfaces · ${BUTTON_RADIUS}px MuiButton · ActionDock capsule (${DOCK_PILL_RADIUS}px) · ${DIALOG_RADIUS}px dialogs`}
            />
            <DsRow title="Accent rule" detail="Orange fills carry white text — links use slate" />
            <DsRow title="Glass recipe" detail="α ~0.36 · blur 28px · saturate 1.85" />
          </div>
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-type-title">
          <DsHead
            id="type"
            tag="Typography"
            title="Urbanist — one voice from hero to DataGrid."
            body="Self-hosted via @fontsource/urbanist. Weights 400–700 across marketing and product. Editorial marketing type may extend the scale in landing.scss; app screens use the kit theme."
          />
          <div className="lp2-ds-rows">
            <p className="lp2-ds-type__display" style={{ fontFamily: FONT_FAMILY }}>
              Architecture practice, clarified.
            </p>
            {[
              { tag: "Display", size: "clamp(2rem, 4vw, 3rem)", weight: 700 },
              { tag: "H2 section", size: "clamp(1.5rem, 2.8vw, 2.25rem)", weight: 700 },
              { tag: "Body", size: "1.0625rem", weight: 400 },
              { tag: "Overline", size: "0.68rem", weight: 700, uppercase: true },
            ].map((row) => (
              <div key={row.tag} className="lp2-ds-type-row">
                <span className="lp2-ds-type-row__tag">{row.tag}</span>
                <span
                  className="lp2-ds-type-row__sample"
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
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-components-title">
          <DsHead
            id="components"
            tag="Primitives"
            title="Compose screens from kit exports — not one-off chrome."
            body="Surface, GlassRail, ActionDock, TaskbarFooter, HealthGlassOrb, and BrandMark ship from @hcw/ui-kit. Screens publish CTAs with useScreenActions; they never render inline Save buttons once adopted."
          />
          <div className="lp2-ds-rows">
            <DsRow
              title="HealthGlassOrb"
              label={<LayerLabel layer="glass" />}
              detail="Shape encodes severity without colour alone — circle, triangle, square."
            >
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                {ORB_STATES.map(({ state, label }) => (
                  <Stack key={state} spacing={0.5} sx={{ alignItems: "center" }}>
                    <HealthGlassOrb state={state} size={26} title={label} variant="glass" />
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </DsRow>
            <DsRow
              title="BrandMark"
              label={<LayerLabel layer="flat" />}
              detail="Asset-free wordmark for portals without image files."
            >
              <Stack spacing={1.5}>
                <BrandMark size="sm" />
                <BrandMark size="md" />
                <BrandMark size="lg" label="AORMS Estimate" />
              </Stack>
            </DsRow>
            <DsRow
              title="StatusDot"
              label={<LayerLabel layer="flat" />}
              detail="The one status grammar — coloured dot + ink text, never a colour-filled chip."
            >
              <Stack direction="row" spacing={2.5} sx={{ flexWrap: "wrap" }}>
                <StatusDot color="green" label="Active" />
                <StatusDot color="magenta" label="In review" />
                <StatusDot color="blue" label="Processing" />
                <StatusDot color="red" label="Failed" />
                <StatusDot color="gray" label="Draft" />
              </Stack>
            </DsRow>
            <DsRow
              title="Avatar"
              label={<LayerLabel layer="flat" />}
              detail="Identity mark — photo or initials; the caller injects the colour (domain palettes stay app-side)."
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Avatar name="Asha Rao" color={colors.accent} size="sm" />
                <Avatar name="Vikram Iyer" color={colors.supportInfo} size="md" />
                <Avatar name="Meera Shah" color={colors.supportSuccess} size="lg" />
              </Stack>
            </DsRow>
            <DsRow
              title="Tabs"
              label={<LayerLabel layer="flat" />}
              detail="Rectangular controls with transparent background. Selected tab shows an inset top alert line — never a fill wash."
            >
              <Tabs
                value={tabDemo}
                onChange={(_e, v) => setTabDemo(v)}
                aria-label="Tab style demo"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Overview" />
                <Tab label="Financial" />
                <Tab label="Team" />
                <Tab label="Approvals" />
              </Tabs>
            </DsRow>
          </div>

          <pre className="lp2-ds-code">
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

        <section className="lp2-ds-section" aria-labelledby="ds-schemes-title">
          <DsHead
            id="schemes"
            tag="Schemes"
            title="One theme factory — light, dark, high contrast."
            body="createAormsTheme({ scheme }) resolves the palette AND the neu/glass material recipes per scheme. Light is the shipped brand; dark and high-contrast are preview-grade scaffolds awaiting visual sign-off — judge them here."
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={scheme}
            onChange={(_e, v: SchemeName | null) => v && setScheme(v)}
            aria-label="Colour scheme preview"
          >
            <ToggleButton value="light">Light</ToggleButton>
            <ToggleButton value="dark">Dark</ToggleButton>
            <ToggleButton value="highContrast">High contrast</ToggleButton>
          </ToggleButtonGroup>
          <ThemeProvider theme={createAormsTheme({ scheme })}>
            <Box
              sx={{
                mt: 2,
                p: { xs: 2, md: 3 },
                backgroundColor: SCHEMES[scheme].background,
                border: "1px solid",
                borderColor: SCHEMES[scheme].borderStrong,
              }}
            >
              <Stack spacing={2.5}>
                <Typography variant="overline" sx={{ color: SCHEMES[scheme].textSecondary }}>
                  Specimen · {scheme === "highContrast" ? "high contrast" : scheme}
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1.5 }}>
                  <Button variant="contained">Create project</Button>
                  <Button variant="text">Save changes</Button>
                  <Button variant="text" color="error">Delete</Button>
                  <StatusDot color="green" label="Active" />
                  <Avatar name="Asha Rao" color={SCHEMES[scheme].accent} size="md" />
                </Stack>
                <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1.5 }}>
                  <TextField label="Project name" size="small" sx={{ width: 240 }} />
                  {/* The control (Switch/Checkbox) is what this specimen demos, and
                      it themes correctly per scheme. The adjacent label text inherits
                      this LIGHT marketing page's ink colour (landing.scss + injectFirst
                      win over the scheme ThemeProvider) — so it reads faint in the dark
                      preview. That is the documented "page chrome stays light" caveat,
                      not a dark-theme defect: in a real app shell the label colour comes
                      from the theme. Left as-is intentionally. */}
                  <FormControlLabel control={<Switch defaultChecked />} label="HR module" />
                  <FormControlLabel control={<Checkbox defaultChecked />} label="Billable" />
                </Stack>
                <Alert severity="error" sx={{ maxWidth: 560 }}>
                  Couldn't save the fee stage — it is locked by an issued invoice.
                </Alert>
              </Stack>
            </Box>
          </ThemeProvider>
        </section>

        <section className="lp2-ds-section" aria-labelledby="ds-ux-title">
          <DsHead
            id="ux"
            tag="UX principles"
            title="Laws and heuristics — mapped to HCW decisions."
            body="HCW-UI-UX-PRINCIPLES.md is the canonical why companion to this kit. Every pattern below is enforced in code review, not a CI guard."
          />
          <Box className="lp2-ds-table-wrap">
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

        <section className="lp2-ds-section" aria-labelledby="ds-adopt-title">
          <DsHead
            id="adopt"
            tag="Adopt"
            title="Mount the kit once. Ship calm interfaces forever."
            body={`${AORMS_STUDIO.title}, ${AORMS_PORTALS.client.label.toLowerCase()}, ${AORMS_PORTALS.consultant.label.toLowerCase()}, ${AORMS_PORTALS.account.licensing.toLowerCase()}, and marketing all share this system. Change a token here — every surface moves.`}
          />
          <div className="lp2-ds-adopt">
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
      </div>
    </div>
  );
}
