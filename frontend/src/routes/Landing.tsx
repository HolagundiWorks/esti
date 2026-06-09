import {
  Button,
  Column,
  Grid,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  InlineLoading,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  ArrowRight,
  Asleep,
  Categories,
  ChartLineData,
  Light,
  Document,
  DocumentTasks,
  Money,
  Calculation,
  Building,
  Image as ImageIcon,
  UserMultiple,
  Checkmark,
} from "@carbon/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

type ThemeName = "white" | "g100";

const FEATURES: { icon: typeof Money; title: string; body: string }[] = [
  { icon: Building, title: "Project office", body: "Every project with COA Conditions-of-Engagement phases, status and contract value in one register." },
  { icon: Money, title: "GST/TDS invoicing", body: "Tax invoices and bills of supply with correct CGST/SGST/IGST, TDS u/s 194J and gap-free FY numbering." },
  { icon: Calculation, title: "COA fee proposals", body: "Scale-of-charges benchmarking with below-minimum compliance guardrails and stage-wise billing." },
  { icon: Document, title: "Drawings & DXF takeoff", body: "Upload DXF, auto layer/entity takeoff, on-screen calibrated measurement and revision control." },
  { icon: DocumentTasks, title: "Documents", body: "Proposals, specification sheets, mood boards, drawing transmittals and site inspection reports — as branded PDFs." },
  { icon: ChartLineData, title: "Filing abstracts", body: "GST (GSTR-1/3B) and TDS abstracts by month, ready for your accountant and 26AS reconciliation." },
  { icon: Categories, title: "Costing & POs", body: "Master DSR rates, BOQ estimation, BBS steel calculator and quantity × rate purchase orders." },
  { icon: UserMultiple, title: "Team & HR", body: "Staff register, site in-charge, leaves and payslips — switch the optional HR module on or off." },
  { icon: ImageIcon, title: "Custom dashboards", body: "Drag-and-drop widgets, a clock + leave widget, and seniority-based access for your whole studio." },
];

function PricingTile({
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
    <Tile
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTop: `3px solid ${highlight ? "var(--cds-button-primary)" : "var(--cds-border-subtle)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{name}</h3>
        {highlight && <Tag type="blue" size="sm">Popular</Tag>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: "2.25rem", fontWeight: 600, lineHeight: 1 }}>{price}</span>
        {suffix && <span style={{ color: "var(--cds-text-secondary)" }}>{suffix}</span>}
      </div>
      <p style={{ color: "var(--cds-text-secondary)", margin: "4px 0 16px", fontSize: "0.875rem" }}>{note}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "grid", gap: 8, flex: 1 }}>
        {bullets.map((b) => (
          <li key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.875rem" }}>
            <Checkmark size={16} style={{ color: "var(--cds-support-success)", flexShrink: 0, marginTop: 2 }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Button kind={highlight ? "primary" : "tertiary"} renderIcon={ArrowRight} onClick={onClick} disabled={pending}>
        {pending ? "Please wait…" : cta}
      </Button>
    </Tile>
  );
}

export function Landing({ theme, onToggleTheme }: { theme: ThemeName; onToggleTheme: () => void }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [annual, setAnnual] = useState(true);
  const demo = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });

  const runDemo = () => demo.mutate({ email: "owner@hcw.in", password: "ChangeMe123" });
  const trial = () => {
    window.location.href = "mailto:hi@aorms.in?subject=ESTI%20AORMS%20%E2%80%94%2014-day%20free%20trial";
  };

  const solo = annual ? "₹499" : "₹599";
  const team = annual ? "₹999" : "₹1,299";

  return (
    <div style={{ background: "var(--cds-background)", color: "var(--cds-text-primary)", minHeight: "100vh" }}>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI" href="#top">AORMS</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === "white" ? "Dark theme" : "Light theme"}
            onClick={onToggleTheme}
          >
            {theme === "white" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Sign in" onClick={() => navigate("/login")} tooltipAlignment="end">
            <ArrowRight size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main id="top" style={{ marginTop: 48 }}>
        {/* Hero */}
        <section style={{ padding: "0 1rem" }}>
          <Grid style={{ paddingTop: "4rem", paddingBottom: "3rem" }}>
            <Column sm={4} md={8} lg={10}>
              <Tag type="blue" size="sm" style={{ marginBottom: 16 }}>Built for Indian architects</Tag>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 600, lineHeight: 1.1, margin: 0 }}>
                Spend more time on design — not writing letters or figuring out taxes.
              </h1>
              <p style={{ fontSize: "1.125rem", color: "var(--cds-text-secondary)", maxWidth: 640, marginTop: 16 }}>
                An architect's place is at the drawing board, not buried in invoices, COA fee maths and
                GST returns. ESTI runs your office effortlessly — projects, fees, billing, drawings and
                documents in one place — so you can get back to designing.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
                <Button size="lg" renderIcon={ArrowRight} onClick={trial}>Start 14-day free trial</Button>
                <Button size="lg" kind="tertiary" onClick={runDemo} disabled={demo.isPending}>
                  {demo.isPending ? "Opening demo…" : "Log in to live demo"}
                </Button>
              </div>
              {demo.error && (
                <p style={{ color: "var(--cds-text-error)", marginTop: 12, fontSize: "0.875rem" }}>
                  Could not open the demo: {demo.error.message}
                </p>
              )}
              {demo.isPending && <InlineLoading description="Signing in to the demo workspace…" style={{ marginTop: 12 }} />}
              <p style={{ color: "var(--cds-text-secondary)", marginTop: 12, fontSize: "0.8125rem" }}>
                No credit card required · cancel anytime · your data stays in your own instance.
              </p>
            </Column>
          </Grid>
        </section>

        {/* Features */}
        <section style={{ background: "var(--cds-layer)", padding: "3rem 1rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <h2 style={{ marginBottom: 4 }}>The admin runs itself, so your studio runs on design</h2>
              <p style={{ color: "var(--cds-text-secondary)", marginBottom: 24 }}>
                Everything an Indian architecture office needs — from enquiry to completion certificate —
                handled for you.
              </p>
            </Column>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Column key={f.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
                  <Tile style={{ height: "100%" }}>
                    <Icon size={28} style={{ color: "var(--cds-icon-primary)" }} />
                    <h4 style={{ margin: "12px 0 6px" }}>{f.title}</h4>
                    <p style={{ color: "var(--cds-text-secondary)", fontSize: "0.875rem", margin: 0 }}>{f.body}</p>
                  </Tile>
                </Column>
              );
            })}
          </Grid>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: "3.5rem 1rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>Simple pricing for studios of every size</h2>
                <p style={{ color: "var(--cds-text-secondary)", marginTop: 8 }}>
                  Start with a 14-day free trial — no card required.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, margin: "16px 0 28px" }}>
                <span style={{ color: annual ? "var(--cds-text-secondary)" : "var(--cds-text-primary)" }}>Monthly</span>
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
                <span style={{ color: annual ? "var(--cds-text-primary)" : "var(--cds-text-secondary)" }}>
                  Annual <Tag type="green" size="sm">Save ~17%</Tag>
                </span>
              </div>
            </Column>

            <Column sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <PricingTile
                name="Free trial"
                price="₹0"
                suffix="/ 14 days"
                note="Full access to every module. No credit card."
                bullets={["All features unlocked", "1 architect", "Email support", "Upgrade anytime"]}
                cta="Start free trial"
                onClick={trial}
              />
            </Column>

            <Column sm={4} md={4} lg={6} style={{ marginBottom: "1rem" }}>
              <PricingTile
                name="Solo"
                highlight
                price={solo}
                suffix="/ month"
                note={annual ? "Billed annually (₹5,988/year). ₹599/mo if billed monthly." : "Billed monthly. ₹499/mo if billed annually."}
                bullets={[
                  "1 architect / user",
                  "All project, fee & GST/TDS modules",
                  "Drawings, takeoff & documents",
                  "Filing abstracts & dashboards",
                ]}
                cta="Log in to live demo"
                onClick={runDemo}
                pending={demo.isPending}
              />
            </Column>

            <Column sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <PricingTile
                name="Team of 5"
                price={team}
                suffix="/ month"
                note={annual ? "Billed annually (₹11,988/year). ₹1,299/mo if billed monthly." : "Billed monthly. ₹999/mo if billed annually."}
                bullets={[
                  "Up to 5 users",
                  "Seniority roles & permissions",
                  "Team & HR module (leaves, payslips)",
                  "Priority support",
                ]}
                cta="Start free trial"
                onClick={trial}
              />
            </Column>

            <Column sm={4} md={8} lg={16}>
              <p style={{ textAlign: "center", color: "var(--cds-text-secondary)", fontSize: "0.875rem", marginTop: 8 }}>
                Prices in INR, exclusive of GST. Need more than 5 users?{" "}
                <a href="mailto:hi@aorms.in" style={{ color: "var(--cds-link-primary)" }}>Talk to us</a>.
              </p>
            </Column>
          </Grid>
        </section>

        {/* CTA band */}
        <section style={{ background: "var(--cds-layer)", padding: "3rem 1rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ margin: 0 }}>Get back to the drawing board</h2>
                <p style={{ color: "var(--cds-text-secondary)", margin: "8px 0 20px" }}>
                  Open a fully populated demo studio and see how little admin ESTI leaves you.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  <Button size="lg" renderIcon={ArrowRight} onClick={runDemo} disabled={demo.isPending}>
                    {demo.isPending ? "Opening demo…" : "Log in to live demo"}
                  </Button>
                  <Button size="lg" kind="tertiary" onClick={() => navigate("/login")}>Sign in</Button>
                </div>
              </div>
            </Column>
          </Grid>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--cds-border-subtle)", padding: "2rem 1rem" }}>
        <Grid>
          <Column sm={4} md={4} lg={8}>
            <div style={{ fontWeight: 600 }}>ESTI — AORMS</div>
            <p style={{ color: "var(--cds-text-secondary)", fontSize: "0.875rem", maxWidth: 420, marginTop: 4 }}>
              Architectural Office Resource Management System. Developed by Holagundi Consulting Works.
            </p>
          </Column>
          <Column sm={4} md={4} lg={8}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "flex-start" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>Contact</div>
                <a href="mailto:hi@aorms.in" style={{ color: "var(--cds-link-primary)" }}>hi@aorms.in</a>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>Web</div>
                <a href="https://aorms.in" style={{ color: "var(--cds-link-primary)" }}>aorms.in</a>
              </div>
            </div>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <p style={{ color: "var(--cds-text-secondary)", fontSize: "0.8125rem", marginTop: 24 }}>
              © {new Date().getFullYear()} Holagundi Consulting Works · aorms.in · All rights reserved.
            </p>
          </Column>
        </Grid>
      </footer>
    </div>
  );
}
