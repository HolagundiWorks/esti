export type DemoKind = "team";

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
  team: {
    kind: "team",
    title: "Team practice",
    subtitle: "A busy Bengaluru mid-size office — 14 projects, a full team, client portals, and site work running in parallel.",
    email: "principal@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Open team demo",
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
      eyebrow: "Team mode",
      metric: "14",
      metricLabel: "projects across four disciplines",
    },
  },
};

export function demoLoginPayload(kind: DemoKind) {
  const acct = DEMO_ACCOUNTS[kind];
  return { email: acct.email, password: acct.password };
}
