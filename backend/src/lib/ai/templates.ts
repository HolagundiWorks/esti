import type { AiDraftKind } from "@esti/contracts";

export type AiContextBundle = {
  systemPrompt: string;
  userPrompt: string;
  sources: AiSourceRef[];
  promptSummary: string;
};

type ProjectCtx = {
  ref: string;
  title: string;
  clientName?: string | null;
  stage?: string | null;
};

type DecisionCtx = {
  ref: string;
  title: string;
  state: string;
  category: string | null;
  source: string | null;
  description: string | null;
};

type BillingCtx = {
  billingReady: { label: string; projectRef: string; pct: number }[];
  overdue: { ref: string; projectRef: string; days: number }[];
};

export function buildTemplateDraft(
  kind: AiDraftKind,
  ctx: {
    project?: ProjectCtx;
    decisions?: DecisionCtx[];
    billing?: BillingCtx;
    userPrompt?: string;
    firmName?: string;
  },
): string {
  const firm = ctx.firmName ?? "the firm";
  const proj = ctx.project;
  const header = proj ? `Project ${proj.ref} — ${proj.title}` : "Office-wide context";
  const extra = ctx.userPrompt?.trim() ? `\n\nAdditional instructions:\n${ctx.userPrompt.trim()}` : "";

  switch (kind) {
    case "PROPOSAL":
      return `# Fee proposal narrative (draft)\n\n${header}\n\n${firm} proposes architectural services for ${proj?.clientName ?? "the client"} covering concept through GFC documentation, statutory submissions, and site coordination during construction.\n\n## Scope highlights\n- Architectural design and working drawings\n- BBMP / authority liaison and compliance documentation\n- Periodic site visits and consultant coordination\n\n## Professional fees\nFees shall follow the agreed phase-wise APBF schedule linked to deliverables and issue dates.\n\n*Draft — review and edit before issue.*${extra}`;

    case "SCOPE":
      return `# Scope of services (draft)\n\n${header}\n\n## Included\n1. Site assessment and design brief confirmation\n2. Schematic and detailed architectural drawings\n3. BOQ support and specification sheets\n4. Submission drawings and authority responses\n\n## Excluded\n- Structural / MEP detailed design (by respective consultants)\n- Soil investigation and survey (client scope unless noted)\n\n*Draft — human issue required.*${extra}`;

    case "AGREEMENT":
      return `# Agreement clause draft\n\n${header}\n\n**Services.** The Architect shall provide professional services as described in the scope letter dated [●], in accordance with Council of Architecture conditions of engagement.\n\n**Fees.** Fees are payable phase-wise upon issue of deliverables. Late payment beyond 30 days shall attract interest at 1.5% per month on outstanding amounts.\n\n**Intellectual property.** Drawings remain the Architect's copyright; the Client receives a licence for the specific project site only.\n\n*Draft clause set — legal review required before execution.*${extra}`;

    case "SPEC":
      return `# Specification note (draft)\n\n${header}\n\n## Masonry\n230 mm brick masonry in cement mortar (1:6) for external walls; 115 mm partition walls in CM (1:4).\n\n## RCC\nM25 grade concrete for slabs, beams, columns; cover as per IS 456.\n\n## Finishes\nInternal plaster 12 mm CM (1:4); vitrified flooring to wet areas as per material schedule.\n\n*Draft — align with issued spec catalogue.*${extra}`;

    case "SITE_REPORT":
      return `# Site inspection report (draft)\n\n${header}\n\n**Date:** [●]\n**Weather:** Clear\n**Attendees:** Architect site team, contractor supervisor\n\n## Observations\n- Slab reinforcement layout checked against GFC — generally aligned\n- Formwork props adequate on grid A1–A3\n- Pending: waterproofing detail at terrace parapet\n\n## Actions\n1. Submit RFI for stair landing level discrepancy\n2. Hold next pour until column starter verification\n\n*Draft — attach photos before issue.*${extra}`;

    case "MOM":
      return `# Meeting minutes (draft)\n\n${header}\n\n**Date:** [●]  **Venue:** Site office / video\n**Present:** Client, architect team, contractor\n\n## Agenda\n1. Progress vs programme\n2. Drawing revisions pending\n3. Upcoming billing milestone\n\n## Discussion\n- Client confirmed layout change to kitchen — to be captured as CRIF decision\n- Contractor requested 5-day extension for slab cycle\n\n## Action items\n| # | Action | Owner | Due |\n|---|--------|-------|-----|\n| 1 | Issue revised kitchen layout | Architect | [●] |\n| 2 | Updated pour schedule | Contractor | [●] |\n\n*Draft — edit and issue from MOM module.*${extra}`;

    case "RFI_RESPONSE":
      return `# RFI response (draft)\n\n${header}\n\n**Subject:** [RFI reference]\n\nThank you for your query. Based on the latest GFC drawing set:\n\n- Refer detail D/S-04 for junction treatment\n- Maintain 150 mm clearance as noted on grid B2\n\nPlease confirm receipt. Further clarifications may be logged via the consultant portal.\n\n*Draft — verify drawing refs before sending.*${extra}`;

    case "SUMMARY":
      return `# Project summary (draft)\n\n${header}\n\n${proj?.clientName ? `Client: ${proj.clientName}\n` : ""}Stage: ${proj?.stage ?? "In progress"}\n\nThe project is progressing through design development with active coordination on structural and services interfaces. Key risks are tracked via the CRIF decision register.\n\n*Draft summary for internal / client communication.*${extra}`;

    case "BILLING_ASSISTANT": {
      const b = ctx.billing;
      const ready =
        b?.billingReady.length ?
          b.billingReady
            .map((p) => `- ${p.projectRef}: phase "${p.label}" (${p.pct}% milestone) — ready to invoice`)
            .join("\n")
        : "- No phases currently flagged billing-ready";
      const od =
        b?.overdue.length ?
          b.overdue.map((i) => `- ${i.ref} (${i.projectRef}) — ${i.days} days overdue`).join("\n")
        : "- No invoices overdue beyond 30 days";
      return `# Billing assistant (draft)\n\n## Phases ready for billing\n${ready}\n\n## Overdue collections\n${od}\n\n## Suggested next steps\n1. Issue tax invoices for ready phases with updated BOQ / fee letter reference\n2. Send payment reminders on overdue items with ledger statement\n3. Confirm TDS/GST treatment before month-end filing\n\n*Advisory draft only — no invoice created automatically.*${extra}`;
    }

    case "CRIF_SUMMARY": {
      const decs = ctx.decisions ?? [];
      const lines =
        decs.length ?
          decs
            .slice(0, 12)
            .map((d) => `- ${d.ref} [${d.category ?? "—"}] ${d.title} — ${d.state}`)
            .join("\n")
        : "- No CRIF decisions recorded yet";
      return `# CRIF revision summary (draft)\n\n${header}\n\n## Decision register\n${lines}\n\n## Overview\n${decs.filter((d) => d.category === "MAJOR" || d.category === "CRITICAL").length} major/critical items require client visibility. Internal-error revisions should be reviewed for ASPRF quality impact.\n\n*Draft — sourced from decision ledger.*${extra}`;
    }

    case "CRIF_IMPACT":
      return `# CRIF impact statement (draft)\n\n${header}\n\n## Change description\n[Describe the proposed revision]\n\n## Design impact\n- Drawing disciplines affected: architectural, structural interfaces\n- Statutory: check setback / FAR if footprint changes\n\n## Schedule impact\nEstimated +[●] weeks to GFC issue pending client approval.\n\n## Fee impact\nAdditional services may apply per COA conditions — prepare supplemental fee note if scope expands.\n\n*Draft impact statement for client review.*${extra}`;

    case "CRIF_RISK": {
      const majors = (ctx.decisions ?? []).filter(
        (d) => d.category === "MAJOR" || d.category === "CRITICAL",
      );
      const flags =
        majors.length ?
          majors.map((d) => `- **${d.ref}** (${d.category}): ${d.title} — state ${d.state}`).join("\n")
        : "- No major/critical open items detected";
      return `# CRIF risk flags (draft)\n\n${header}\n\n## High-attention items\n${flags}\n\n## Patterns\n- Client-driven changes: ${(ctx.decisions ?? []).filter((d) => d.source === "CLIENT_DRIVEN").length}\n- Internal errors: ${(ctx.decisions ?? []).filter((d) => d.source === "INTERNAL_ERROR").length}\n\nRecommend cooling-off review before accepting concurrent major revisions.\n\n*Draft risk scan — not automatic approval.*${extra}`;
    }

    default:
      return `Draft for ${kind}\n\n${header}${extra}`;
  }
}

export function billingContextLines(billing: BillingCtx): string {
  const parts: string[] = [];
  if (billing.billingReady.length) {
    parts.push(
      "Billing-ready phases:",
      ...billing.billingReady.map(
        (p) => `${p.projectRef} / ${p.label} @ ${p.pct}%`,
      ),
    );
  }
  if (billing.overdue.length) {
    parts.push(
      "Overdue invoices:",
      ...billing.overdue.map((i) => `${i.ref} ${i.projectRef} ${i.days}d`),
    );
  }
  return parts.join("\n");
}

export { type ProjectCtx, type DecisionCtx, type BillingCtx };
