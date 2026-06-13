import {
  Button,
  Column,
  Grid,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  InlineLoading,
  Layer,
  ProgressBar,
  Stack,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  ArrowRight,
  Asleep,
  Building,
  Calculation,
  Calculator,
  Categories,
  ChartCustom,
  ChartLineData,
  Checkmark,
  Document,
  DocumentTasks,
  Idea,
  Light,
  Money,
  Time,
  Trophy,
  UserMultiple,
  UserProfile,
  Analytics,
  Image as ImageIcon,
} from "@carbon/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

type ThemeName = "white" | "g100";

// ─── Dashboard live mockup ────────────────────────────────────────────────────

function MockProgress({ label, value, band, bandType }: {
  label: string;
  value: number;
  band: string;
  bandType: "purple" | "blue" | "teal" | "gray";
}) {
  return (
    <Stack gap={2}>
      <Stack orientation="horizontal" gap={3}>
        <span className="esti-grow">{label}</span>
        <Tag type={bandType} size="sm">{band}</Tag>
        <strong>{value}</strong>
      </Stack>
      <ProgressBar value={value} max={100} label="" hideLabel size="small" />
    </Stack>
  );
}

function DashboardMockup() {
  return (
    <div className="esti-mockup-frame">
      <Grid narrow className="esti-dash">

        {/* KPI chips */}
        <Column lg={4} md={2} sm={2}>
          <Tile>
            <Stack gap={2}>
              <p className="esti-label esti-label--secondary">Fee pipeline</p>
              <h3>₹24.6L</h3>
              <Tag type="blue" size="sm">6 proposals active</Tag>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={2} sm={2}>
          <Tile>
            <Stack gap={2}>
              <p className="esti-label esti-label--secondary">Active projects</p>
              <h3>12</h3>
              <Tag type="green" size="sm">2 closing this month</Tag>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={2} sm={2}>
          <Tile>
            <Stack gap={2}>
              <p className="esti-label esti-label--secondary">Outstanding</p>
              <h3>₹4.2L</h3>
              <Tag type="red" size="sm">2 invoices overdue</Tag>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={2} sm={2}>
          <Tile>
            <Stack gap={2}>
              <p className="esti-label esti-label--secondary">Revision risk</p>
              <h3>LOW</h3>
              <Tag type="green" size="sm">Scope drift 12%</Tag>
            </Stack>
          </Tile>
        </Column>

        {/* Action Centre */}
        <Column lg={8} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={4}>
              <h4>Action Centre</h4>
              <Stack gap={3}>
                {[
                  { t: "red",     l: "Urgent",   m: "Invoice #INV-2025-033 — issue before 31 Mar" },
                  { t: "magenta", l: "Review",   m: "RIE site assessment: FAR exceedance flagged" },
                  { t: "blue",    l: "Decision", m: "2 CRIF decisions need your acknowledgement" },
                  { t: "green",   l: "Done",     m: "Phase 2 Schematic Design — client approved" },
                ] as const).map((a) => (
                  <Stack key={a.m} orientation="horizontal" gap={3}>
                    <Tag type={a.t} size="sm">{a.l}</Tag>
                    <p>{a.m}</p>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Tile>
        </Column>

        {/* ASPRF */}
        <Column lg={8} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={4}>
              <h4>Team performance — ASPRF</h4>
              <Stack gap={4}>
                <MockProgress label="Ar. Vishwabhiram R." value={92} band="Gold"     bandType="purple" />
                <MockProgress label="Ar. Priya Sharma"    value={78} band="Silver"   bandType="blue"   />
                <MockProgress label="Ar. Ravi Kumar"      value={65} band="Bronze"   bandType="teal"   />
              </Stack>
            </Stack>
          </Tile>
        </Column>

      </Grid>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const CORE_FEATURES: { icon: typeof Money; title: string; body: string }[] = [
  {
    icon: Building,
    title: "Project office",
    body: "Every project with phases, status, contract value, permits and approvals in one register.",
  },
  {
    icon: Money,
    title: "GST/TDS invoicing",
    body: "Tax invoices and bills of supply with correct CGST/SGST/IGST, TDS u/s 194J and gap-free FY numbering.",
  },
  {
    icon: Calculation,
    title: "COA fee proposals",
    body: "Scale-of-charges benchmarking with below-minimum guardrails, stage-wise billing and PDF export.",
  },
  {
    icon: Document,
    title: "Drawings & DXF takeoff",
    body: "Upload DXF, auto layer/entity takeoff, on-screen calibrated measurement and revision control.",
  },
  {
    icon: DocumentTasks,
    title: "Office documents",
    body: "Proposals, spec sheets, mood boards, transmittals and site inspections as branded PDFs.",
  },
  {
    icon: ChartLineData,
    title: "Filing abstracts",
    body: "GSTR-1/3B and TDS abstracts by month, ready for your CA and 26AS reconciliation.",
  },
  {
    icon: Categories,
    title: "DSR / BOQ / BBS",
    body: "Delhi Schedule of Rates reference, item-wise BOQ cost estimates and bar bending schedules.",
  },
  {
    icon: UserMultiple,
    title: "Team & HR",
    body: "Staff register, project assignments, leaves, payslips and role-based seniority access.",
  },
  {
    icon: ImageIcon,
    title: "Consultants & portals",
    body: "External consultant directory, engagement scopes, read-only collaborator portal and a separate client portal with project visibility.",
  },
  {
    icon: Document,
    title: "Firm catalog management",
    body: "Company-owned, company-operated material library, specification standards and structural templates. Your firm controls every entry — not a shared SaaS database.",
  },
  {
    icon: Money,
    title: "Bank reconciliation",
    body: "Import bank statements, 26AS and GSTR data and match entries automatically. Outstanding and collected balances stay in sync with your invoice register.",
  },
  {
    icon: ChartLineData,
    title: "Activity & audit trail",
    body: "Immutable append-only activity stream for every project event, plus an owner-only paginated audit log covering every privileged state transition.",
  },
];

const NEW_FEATURES: {
  icon: typeof Money;
  tag: string;
  title: string;
  body: string;
  bullets: string[];
}[] = [
  {
    icon: Analytics,   // confirmed in Performance.tsx
    tag: "Phase 5",
    title: "ASPRF Performance Engine",
    body: "Rolling 30-day composite performance score for every architect in your studio.",
    bullets: [
      "6 weighted KPIs — Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%, Wellbeing 5%",
      "Bronze / Silver / Gold / Platinum bands with Carbon-compatible tags",
      "Reward point events with full audit trail",
      "Daily stand-ups and timesheet attribution feed the score automatically",
    ],
  },
  {
    icon: ChartCustom,
    tag: "Phase 4C",
    title: "Revision Intelligence",
    body: "CRIF state machine tracks every design decision from open through implementation.",
    bullets: [
      "Revision source tagging: Client-driven, Internal error, Scope change, Technical query",
      "Scope drift % calculated live from the decision ledger",
      "Cooling-off indicator for critical revisions within 7 days",
      "Revision budget per project phase with inline edit",
    ],
  },
  {
    icon: Categories,
    tag: "Phase 4A",
    title: "RIE Compliance Engine",
    body: "Site feasibility against local bylaws — from a quick FAR check to a full compliance PDF.",
    bullets: [
      "FAR, ground coverage, height, setbacks and basement depth — all validated",
      "Pre-design quick check and post-design detailed mode with actual setback inputs",
      "Sustainability engine: rainwater harvesting and tree planting triggers",
      "One-click PDF compliance report generated by the Python worker",
    ],
  },
  {
    icon: Time,
    tag: "Phase 5",
    title: "Timesheets & Stand-ups",
    body: "Per-person, per-day time attribution with project and task granularity.",
    bullets: [
      "Billable / non-billable flag per entry with summary totals",
      "Daily stand-up notes per team member — visible to the whole studio",
      "Feeds directly into ASPRF Reliability and Learning KPIs",
      "Work module: Tasks + Workload calendar + Stand-ups in one URL-tab view",
    ],
  },
  {
    icon: Idea,
    tag: "Phase 2E",
    title: "SteelFlow AI — Steel Arranger",
    body: "Drag-and-drop bar placement on an IS:456 cross-section, with automated BBS export.",
    bullets: [
      "T6–T32 bar palette, drag onto BEAM / COLUMN / SLAB / FOOTING section canvas",
      "Shape codes B/C/D/E per IS:2502 with conditional dimension fields",
      "Stirrup design with inner perimeter + hook allowance calculation",
      "Excel BBS export with unit weights from D²/162 kg/m formula",
    ],
  },
  {
    icon: Calculator,
    tag: "Phase 2D",
    title: "Personal Workspace",
    body: "A fixed side panel for each team member — focus, calculate and track leave without leaving the app.",
    bullets: [
      "Pomodoro focus timer that runs behind every route — floating 20% overlay shows countdown",
      "Calculator with expression history, persisted across tab switches",
      "Open personal tasks at a glance with priority and overdue tags",
      "Leave balance, theme toggle and welcome note in one panel",
    ],
  },
];

// ─── USPs ─────────────────────────────────────────────────────────────────────

const USPS: { icon: typeof Money; title: string; body: string }[] = [
  {
    icon: Building,   // confirmed
    title: "India-first by design",
    body: "GST (CGST/SGST/IGST), TDS u/s 194J, COA scale of charges, paise-level money arithmetic, FY April–March numbering, RERA stage milestones — built-in, not bolted on.",
  },
  {
    icon: UserProfile,
    title: "Your server, your data",
    body: "ESTI is self-hosted. Your drawings, invoices and client data never leave your own VPS. No vendor lock-in, no SaaS privacy risk — open a PR to extend it.",
  },
  {
    icon: ChartLineData,
    title: "One system, not five tools",
    body: "Projects → Fees → Invoices → Drawings → Compliance → HR → Performance — integrated end-to-end. The action centre knows when an invoice is overdue, a bylaw is violated, or a decision needs acknowledgement.",
  },
  {
    icon: Trophy,
    title: "Built for how architects actually work",
    body: "The Pomodoro timer, daily stand-up, workload calendar and ASPRF score were designed with the Indian studio in mind — small team, multiple roles, tight deadlines, complex compliance.",
  },
  {
    icon: Document,
    title: "Your firm's private knowledge base",
    body: "The catalog is company-owned and company-operated — your firm adds, edits and retires every material, standard and structural template. Nothing is shared with other ESTI instances.",
  },
];

// ─── Pricing ─────────────────────────────────────────────────────────────────

function PricingCard({
  name,
  highlight,
  price,
  suffix,
  note,
  bullets,
  cta,
  onClick,
  pending,
}: {
  name: string;
  highlight?: boolean;
  price: string;
  suffix?: string;
  note: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
  pending?: boolean;
}) {
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack gap={2}>
          <Stack orientation="horizontal" gap={3}>
            <h3 className="esti-grow">{name}</h3>
            {highlight && <Tag type="blue" size="sm">Popular</Tag>}
          </Stack>
          <Stack orientation="horizontal" gap={2}>
            <h2>{price}</h2>
            {suffix && <p className="esti-label esti-label--secondary">{suffix}</p>}
          </Stack>
          <p className="esti-label">{note}</p>
        </Stack>

        <Stack gap={3} className="esti-grow">
          {bullets.map((b) => (
            <Stack key={b} orientation="horizontal" gap={3}>
              <Checkmark size={16} />
              <p>{b}</p>
            </Stack>
          ))}
        </Stack>

        <Button
          kind={highlight ? "primary" : "tertiary"}
          renderIcon={ArrowRight}
          onClick={onClick}
          disabled={pending}
        >
          {pending ? "Please wait…" : cta}
        </Button>
      </Stack>
    </Tile>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Landing({
  theme,
  onToggleTheme,
}: {
  theme: ThemeName;
  onToggleTheme: () => void;
}) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [annual, setAnnual] = useState(true);

  const demo = trpc.auth.login.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const runDemo = () =>
    demo.mutate({ email: "principal@demo.aorms.in", password: "demo1234" });

  const contactSales = () => {
    window.location.href =
      "mailto:hi@aorms.in?subject=Sales%20enquiry%20%E2%80%94%20ESTI%20AORMS" +
      "&body=Hi%20ESTI%20team%2C%0A%0AI%27d%20like%20to%20learn%20more%20about%20ESTI%20AORMS.%0A%0AFirm%20name%3A%20%0ACity%3A%20%0ATeam%20size%3A%20%0AMessage%3A%20";
  };

  const notifyMobile = () => {
    window.location.href =
      "mailto:hi@aorms.in?subject=Notify%20me%20%E2%80%94%20ESTI%20Mobile%20App";
  };

  const solo = annual ? "₹499" : "₹599";
  const team = annual ? "₹999" : "₹1,299";

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI" href="#top">AORMS</HeaderName>
        <HeaderNavigation aria-label="ESTI AORMS">
          <HeaderMenuItem href="#features">Features</HeaderMenuItem>
          <HeaderMenuItem href="#new-2026">New in 2026</HeaderMenuItem>
          <HeaderMenuItem href="#mobile">Mobile app</HeaderMenuItem>
          <HeaderMenuItem href="#pricing">Pricing</HeaderMenuItem>
          <HeaderMenuItem href="mailto:hi@aorms.in?subject=Sales%20enquiry%20%E2%80%94%20ESTI%20AORMS">Contact sales</HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === "white" ? "Dark theme" : "Light theme"}
            onClick={onToggleTheme}
          >
            {theme === "white" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Sign in"
            onClick={() => navigate("/login")}
            tooltipAlignment="end"
          >
            <ArrowRight size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main id="top" className="esti-landing-main">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="esti-landing-hero">
          <Grid>
            <Column sm={4} md={6} lg={10}>
              <Stack gap={5}>
                <div className="esti-new-tag">
                  <Tag type="blue" size="sm">Built for Indian architecture practices</Tag>
                  <Tag type="green" size="sm">New: ASPRF · SteelFlow · RIE compliance</Tag>
                </div>

                <h1>Your office runs itself.<br />You run the design.</h1>

                <p>
                  ESTI is a complete architectural office resource management system —
                  projects, fees, GST/TDS invoicing, drawings, bylaw compliance,
                  team performance and HR — integrated in one self-hosted platform
                  built for Indian practices.
                </p>

                <div className="esti-stats-row">
                  {[
                    { n: "57",      l: "tRPC modules"       },
                    { n: "12+",     l: "document types"     },
                    { n: "COA",     l: "fee scale compliant"},
                    { n: "GST",     l: "& TDS u/s 194J"    },
                    { n: "IS:456",  l: "steel compliance"   },
                  ].map((s) => (
                    <Stack key={s.l} gap={1}>
                      <h3>{s.n}</h3>
                      <p className="esti-label esti-label--secondary">{s.l}</p>
                    </Stack>
                  ))}
                </div>

                <div className="esti-cta-row">
                  <Button size="lg" renderIcon={ArrowRight} onClick={contactSales}>
                    Contact sales
                  </Button>
                  <Button size="lg" kind="tertiary" onClick={runDemo} disabled={demo.isPending}>
                    {demo.isPending ? "Opening demo…" : "Log in to live demo"}
                  </Button>
                </div>

                {demo.isPending && (
                  <InlineLoading description="Signing in to the demo workspace…" />
                )}
                {demo.error && (
                  <Tag type="red" size="sm">
                    Could not open demo: {demo.error.message}
                  </Tag>
                )}

                <p className="esti-label esti-label--secondary">
                  Self-hosted on your VPS · your data never leaves your server · open a PR to extend it
                </p>
              </Stack>
            </Column>
          </Grid>
        </section>

        {/* ── Dashboard snapshot ─────────────────────────────────────────────── */}
        <Layer>
          <section className="esti-landing-section">
            <Grid>
              <Column sm={4} md={8} lg={16}>
                <Stack gap={6}>
                  <Stack gap={2}>
                    <Tag type="teal" size="sm">Live preview</Tag>
                    <h2>Everything your studio needs — in one screen</h2>
                    <p>
                      The ESTI dashboard surfaces the metrics that matter: fee pipeline,
                      overdue invoices, team ASPRF scores, action items and revision risk —
                      all without opening a single spreadsheet.
                    </p>
                  </Stack>
                  <DashboardMockup />
                </Stack>
              </Column>
            </Grid>
          </section>
        </Layer>

        {/* ── How it works ───────────────────────────────────────────────────── */}
        <section className="esti-landing-section">
          <Grid className="esti-dash">
            <Column sm={4} md={8} lg={16}>
              <Stack gap={2}>
                <h2>Set up in an afternoon</h2>
                <p>No data migration consultant required — ESTI is designed to be self-configured by your studio.</p>
              </Stack>
            </Column>
            {([
              { n: "01", title: "Configure your firm", body: "Add your firm profile, GST details, team members and seniority roles. Seed data populates a demo studio if you want a head start." },
              { n: "02", title: "Add projects & clients", body: "Create your client register, open projects with phases and fee proposals. Import existing invoices or start fresh from the current FY." },
              { n: "03", title: "ESTI runs the admin", body: "Invoicing, compliance checks, performance scores, filing abstracts and the action centre update automatically as your team works." },
            ] as const).map((s) => (
              <Column key={s.n} sm={4} md={4} lg={5}>
                <Tile className="esti-fill">
                  <Stack gap={3}>
                    <Tag type="blue" size="sm">Step {s.n}</Tag>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </Stack>
                </Tile>
              </Column>
            ))}
          </Grid>
        </section>

        {/* ── Core features ──────────────────────────────────────────────────── */}
        <section id="features" className="esti-landing-section">
          <Grid className="esti-dash">
            <Column sm={4} md={8} lg={16}>
              <Stack gap={2}>
                <h2>From enquiry to completion certificate</h2>
                <p>Every module an Indian architecture office needs — integrated so data flows across them.</p>
              </Stack>
            </Column>

            {CORE_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Column key={f.title} sm={4} md={4} lg={5}>
                  <Tile className="esti-fill">
                    <Stack gap={3}>
                      <Icon size={32} />
                      <Stack gap={2}>
                        <h4>{f.title}</h4>
                        <p>{f.body}</p>
                      </Stack>
                    </Stack>
                  </Tile>
                </Column>
              );
            })}
          </Grid>
        </section>

        {/* ── New features spotlight ─────────────────────────────────────────── */}
        <Layer>
          <section id="new-2026" className="esti-landing-section">
            <Grid className="esti-dash">
              <Column sm={4} md={8} lg={16}>
                <Stack gap={2}>
                  <Tag type="purple" size="sm">New in 2026</Tag>
                  <h2>Six powerful new modules — shipped this year</h2>
                  <p>
                    Phase 4–5 delivered ASPRF performance scoring, RIE compliance,
                    SteelFlow AI, Revision Intelligence, timesheets and a personal
                    workspace — all live in your instance.
                  </p>
                </Stack>
              </Column>

              {NEW_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <Column key={f.title} sm={4} md={4} lg={8}>
                    <Tile className="esti-fill">
                      <Stack gap={4}>
                        <Stack orientation="horizontal" gap={4}>
                          <Icon size={32} />
                          <Stack gap={1} className="esti-grow">
                            <Tag type="purple" size="sm">{f.tag}</Tag>
                            <h3>{f.title}</h3>
                          </Stack>
                        </Stack>
                        <p>{f.body}</p>
                        <Stack gap={2}>
                          {f.bullets.map((b) => (
                            <Stack key={b} orientation="horizontal" gap={3}>
                              <Checkmark size={16} />
                              <p className="esti-label">{b}</p>
                            </Stack>
                          ))}
                        </Stack>
                      </Stack>
                    </Tile>
                  </Column>
                );
              })}
            </Grid>
          </section>
        </Layer>

        {/* ── USPs ───────────────────────────────────────────────────────────── */}
        <section className="esti-landing-section">
          <Grid className="esti-dash">
            <Column sm={4} md={8} lg={16}>
              <Stack gap={2}>
                <h2>Why ESTI is different</h2>
                <p>Not another generic project tool adapted for architects — built from scratch for the Indian studio.</p>
              </Stack>
            </Column>
            {USPS.map((u) => {
              const Icon = u.icon;
              return (
                <Column key={u.title} sm={4} md={4} lg={8}>
                  <Tile className="esti-fill">
                    <Stack gap={4}>
                      <Stack orientation="horizontal" gap={4}>
                        <Icon size={32} />
                        <h3 className="esti-grow">{u.title}</h3>
                      </Stack>
                      <p>{u.body}</p>
                    </Stack>
                  </Tile>
                </Column>
              );
            })}
          </Grid>
        </section>

        {/* ── Mobile app coming soon ────────────────────────────────────────── */}
        <Layer>
          <section id="mobile" className="esti-landing-section">
            <Grid className="esti-dash">
              <Column sm={4} md={8} lg={16}>
                <Stack gap={3}>
                  <Stack orientation="horizontal" gap={3}>
                    <Tag type="cyan" size="sm">Coming soon</Tag>
                    <Tag type="gray" size="sm">iOS</Tag>
                    <Tag type="gray" size="sm">Android</Tag>
                  </Stack>
                  <h2>ESTI Mobile — your office in your pocket</h2>
                  <p>
                    A native companion app for architects on site. Capture site observations,
                    log timesheets, review decisions and check outstanding invoices from your phone —
                    synced in real time with your ESTI instance.
                  </p>
                </Stack>
              </Column>

              {([
                { title: "Site diary & inspections",  body: "Photograph, annotate and submit site inspection reports directly from the field. Linked to the project and timestamped automatically." },
                { title: "Timesheet entry",           body: "Log hours against a project and task in seconds. Billable flag, notes and daily stand-up all in one tap." },
                { title: "Invoice & fee snapshot",    body: "See outstanding receivables, approve draft invoices and check fee proposal status without opening a browser." },
                { title: "CRIF decisions on the go",  body: "Review and acknowledge pending decisions, add notes and transition CRIF state from your phone during client meetings." },
                { title: "Push notifications",        body: "Actionable alerts for overdue invoices, RIE violations, pending decisions and ASPRF band changes — direct to your lock screen." },
                { title: "Offline-first sync",        body: "Site observations captured without signal and synced the moment connectivity returns. No lost data on poor-network sites." },
              ] as const).map((f) => (
                <Column key={f.title} sm={4} md={4} lg={5}>
                  <Tile className="esti-fill">
                    <Stack gap={3}>
                      <h4>{f.title}</h4>
                      <p>{f.body}</p>
                    </Stack>
                  </Tile>
                </Column>
              ))}

              <Column sm={4} md={8} lg={16}>
                <Stack gap={4}>
                  <p>Be the first to know when ESTI Mobile launches.</p>
                  <div className="esti-cta-row">
                    <Button kind="tertiary" renderIcon={ArrowRight} onClick={notifyMobile}>
                      Notify me at launch
                    </Button>
                    <Button kind="ghost" onClick={contactSales}>
                      Enquire about early access
                    </Button>
                  </div>
                </Stack>
              </Column>
            </Grid>
          </section>
        </Layer>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <Layer>
          <section id="pricing" className="esti-landing-section">
            <Grid className="esti-dash">
              <Column sm={4} md={8} lg={16}>
                <Stack gap={4}>
                  <Stack gap={2}>
                    <h2>Simple pricing for studios of every size</h2>
                    <p>Start with a 14-day free trial — no card required.</p>
                  </Stack>
                  <div className="esti-pricing-toggle">
                    <p>Monthly</p>
                    <Toggle
                      id="billing-toggle"
                      size="sm"
                      labelText=""
                      hideLabel
                      labelA="Monthly"
                      labelB="Annual"
                      toggled={annual}
                      onToggle={(v) => setAnnual(v)}
                    />
                    <Stack orientation="horizontal" gap={3}>
                      <p>Annual</p>
                      <Tag type="green" size="sm">Save ~17%</Tag>
                    </Stack>
                  </div>
                </Stack>
              </Column>

              <Column sm={4} md={4} lg={5}>
                <PricingCard
                  name="Solo"
                  price={solo}
                  suffix="/ month"
                  note={
                    annual
                      ? "Billed annually (₹5,988/year). ₹599/mo monthly."
                      : "Billed monthly. ₹499/mo if billed annually."
                  }
                  bullets={[
                    "1 architect / user",
                    "All project, fee & GST/TDS modules",
                    "Drawings, DXF takeoff & documents",
                    "ASPRF + SteelFlow + RIE compliance",
                  ]}
                  cta="Contact sales"
                  onClick={contactSales}
                />
              </Column>

              <Column sm={4} md={4} lg={6}>
                <PricingCard
                  name="Studio"
                  highlight
                  price={team}
                  suffix="/ month"
                  note={
                    annual
                      ? "Billed annually (₹11,988/year). ₹1,299/mo monthly."
                      : "Billed monthly. ₹999/mo if billed annually."
                  }
                  bullets={[
                    "Up to 5 users with seniority roles",
                    "Team HR — leaves and payslips",
                    "ASPRF performance & reward points",
                    "Priority support + onboarding call",
                  ]}
                  cta="Contact sales"
                  onClick={contactSales}
                />
              </Column>

              <Column sm={4} md={4} lg={5}>
                <PricingCard
                  name="Enterprise"
                  price="Custom"
                  note="For larger practices, multiple offices or custom deployment needs."
                  bullets={[
                    "Unlimited users",
                    "Custom integrations & branding",
                    "Dedicated support & SLA",
                    "On-premise or managed hosting",
                  ]}
                  cta="Contact sales"
                  onClick={contactSales}
                />
              </Column>

              <Column sm={4} md={8} lg={16}>
                <Stack gap={3}>
                  <p className="esti-label esti-label--secondary">
                    Prices in INR, exclusive of GST. Want to see the product before committing?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); runDemo(); }}>Open the live demo</a>.
                  </p>
                  <p className="esti-label esti-label--secondary">
                    All plans include full source access — self-host on your own VPS with no per-seat tracking.
                  </p>
                </Stack>
              </Column>
            </Grid>
          </section>
        </Layer>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <section className="esti-landing-section">
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <Stack gap={5}>
                <Stack gap={2}>
                  <h2>Get back to the drawing board</h2>
                  <p>
                    Open a fully populated demo studio — 12 live projects, team data,
                    invoices, RIE assessments, ASPRF scores — and see how little admin
                    ESTI leaves you to do.
                  </p>
                </Stack>
                <div className="esti-cta-row">
                  <Button size="lg" renderIcon={ArrowRight} onClick={contactSales}>
                    Contact sales
                  </Button>
                  <Button size="lg" kind="tertiary" onClick={runDemo} disabled={demo.isPending}>
                    {demo.isPending ? "Opening demo…" : "Log in to live demo"}
                  </Button>
                  <Button size="lg" kind="ghost" onClick={() => navigate("/login")}>
                    Sign in
                  </Button>
                </div>
                {demo.isPending && (
                  <InlineLoading description="Signing in to the demo workspace…" />
                )}
              </Stack>
            </Column>
          </Grid>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="esti-footer">
        <Grid>
          <Column sm={4} md={4} lg={6}>
            <Stack gap={3}>
              <h4>ESTI — AORMS</h4>
              <p>
                Architectural Office Resource Management System for Indian practices.
                Developed by Holagundi Consulting Works.
              </p>
              <Stack orientation="horizontal" gap={5}>
                <a href="mailto:hi@aorms.in">hi@aorms.in</a>
                <a href="https://aorms.in">aorms.in</a>
              </Stack>
            </Stack>
          </Column>

          <Column sm={4} md={4} lg={5}>
            <Stack gap={3}>
              <h4>Modules</h4>
              <Stack gap={2}>
                {["Project office & phases", "GST/TDS invoicing", "COA fee proposals",
                  "Drawings & DXF takeoff", "DSR / BOQ / BBS", "RIE compliance engine",
                  "ASPRF performance", "SteelFlow AI", "Team HR & payroll"].map((m) => (
                  <p key={m} className="esti-label esti-label--secondary">{m}</p>
                ))}
              </Stack>
            </Stack>
          </Column>

          <Column sm={4} md={4} lg={5}>
            <Stack gap={3}>
              <h4>New in 2026</h4>
              <Stack gap={2}>
                {["ASPRF 6-KPI performance engine", "Rolling 30-day scores & bands",
                  "SteelFlow IS:456 drag-and-drop", "RIE FAR & setback engine",
                  "Revision Intelligence & scope drift", "Timesheets & daily stand-ups",
                  "Personal Workspace + Pomodoro"].map((m) => (
                  <p key={m} className="esti-label esti-label--secondary">{m}</p>
                ))}
              </Stack>
            </Stack>
          </Column>

          <Column sm={4} md={8} lg={16}>
            <p className="esti-label esti-label--secondary">
              © {new Date().getFullYear()} Holagundi Consulting Works · aorms.in · All rights reserved
            </p>
          </Column>
        </Grid>
      </footer>
    </>
  );
}
