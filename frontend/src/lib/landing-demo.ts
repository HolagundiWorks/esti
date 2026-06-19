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
    subtitle: "One architect with the full toolkit — team features stay tucked away until you hire.",
    email: "solo@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Enter solo demo",
    highlights: [
      "Three live projects with fees and GST invoices",
      "Drawing register linked to ESTICAD",
      "COA fee proposal and sanction check on one project",
    ],
    tour: [
      { label: "Drawings", hint: "Open any project → Drawings → Open in ESTICAD" },
      { label: "Estimates", hint: "See quantities from the drawing feed into the BOQ" },
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
    subtitle: "Fourteen projects, a full team, client portal and project-management work — like a busy mid-size office.",
    email: "principal@demo.aorms.in",
    password: DEMO_PASSWORD,
    cta: "Enter studio demo",
    featured: true,
    highlights: [
      "Residential, commercial, interiors and PMC projects",
      "Revision register with comments on each decision",
      "Team workload and quality at a glance",
      "Client portal on a live residential project",
    ],
    tour: [
      { label: "Drawings", hint: "Try Sharma Villa or Verde Block → Drawings" },
      { label: "Estimates", hint: "Sharma Villa → Estimates" },
      { label: "Site & PMC", hint: "PMC section → schedules, RFIs and snags" },
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
