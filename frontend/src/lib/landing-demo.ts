export type DemoKind = "solo" | "studio";

export type DemoAccount = {
  kind: DemoKind;
  title: string;
  subtitle: string;
  email: string;
  password: string;
  cta: string;
  featured?: boolean;
  highlights: string[];
  tour?: { label: string; hint: string }[];
  caseStudy: {
    eyebrow: string;
    metric: string;
    metricLabel: string;
  };
};

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: Record<DemoKind, DemoAccount> = {
  solo: {
    kind: "solo",
    title: "Solo practitioner",
    subtitle: "Everything a solo architect needs — team features appear only when you hire.",
    email: "solo@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Open solo practice",
    highlights: [
      "Three projects with fee proposals, GST invoices, and payment tracking",
      "Drawing register with revision history and issued sets",
      "COA fee proposal with service stages and payment schedule",
    ],
    tour: [
      { label: "Projects → Drawings", hint: "Open any project and see the drawing register with issued sets and revision history" },
      { label: "Fees", hint: "Check the fee proposal structured to COA stages and the linked GST invoice" },
    ],
    caseStudy: {
      eyebrow: "Solo practice",
      metric: "3",
      metricLabel: "live projects on one desk",
    },
  },
  studio: {
    kind: "studio",
    title: "Design studio",
    subtitle: "A busy Bengaluru mid-size office — 14 projects, a full team, client portals, and site work running in parallel.",
    email: "principal@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Open studio demo",
    featured: true,
    highlights: [
      "14 live projects: residential, commercial, interiors, and PMC work",
      "Every client revision documented — scope, fee impact, and who approved it",
      "Real GST invoices, receivables tracking, and team assignments",
      "Client portal on a live residential project with issued drawings",
    ],
    tour: [
      { label: "Projects → Decisions", hint: "Open Sharma Villa — see every revision logged with scope impact and the client's approval" },
      { label: "Fees & Invoices", hint: "Go to Fees — a COA fee proposal and a GST tax invoice already issued" },
      { label: "Site coordination", hint: "Explore PMC — site schedule, RFIs, snag list, and inspector records" },
    ],
    caseStudy: {
      eyebrow: "Mid-size studio",
      metric: "14",
      metricLabel: "projects across four disciplines",
    },
  },
};

export function demoLoginPayload(kind: DemoKind) {
  const acct = DEMO_ACCOUNTS[kind];
  return { email: acct.email, password: acct.password };
}
