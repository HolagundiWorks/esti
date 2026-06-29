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
    title: "A working architectural practice",
    subtitle: "A busy Indian practice with live projects, client approvals, fee follow-up, team load, portals, and site visits already in motion.",
    email: "principal@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Open team demo",
    featured: true,
    highlights: [
      "Live residential, commercial, and interiors projects",
      "Client revisions recorded with scope, fee impact, and approval trail",
      "GST invoices, receivables, contractor movement, and team assignments",
      "Client portal on an active project with issued drawings",
    ],
    tour: [
      { label: "Projects → Decisions", hint: "Open Sharma Villa — see revisions logged with scope impact and client approval" },
      { label: "Fees & Invoices", hint: "Go to Fees — see a proposal, GST invoice, and receivable trail" },
      { label: "Site progress", hint: "Open a project — site visits, RFIs, and inspection records" },
    ],
    caseStudy: {
      eyebrow: "Working office",
      metric: "14",
      metricLabel: "projects with real office movement",
    },
  },
};

export function demoLoginPayload(kind: DemoKind) {
  const acct = DEMO_ACCOUNTS[kind];
  return { email: acct.email, password: acct.password };
}
