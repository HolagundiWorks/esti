import type { OperatorSnapshot } from "./operator-context.js";

/** Template fallback when Ollama is off — answers from live snapshot, not generic prose. */
export function buildAgentMockAnswer(snapshot: OperatorSnapshot, question: string): string {
  const q = question.toLowerCase();
  const parts: string[] = [];
  const p = snapshot.project;
  const o = snapshot.office;

  if (/bill|invoice|fee|collect|overdue|payment/.test(q) && o) {
    if (o.billingReady.length) {
      parts.push(
        "**Ready to invoice:**",
        ...o.billingReady.map(
          (b) =>
            `- ${b.projectRef} — ${b.label} (${b.billingPct}% milestone). Open project → Invoices tab.`,
        ),
      );
    } else {
      parts.push("No phases are flagged billing-ready in Action Center right now.");
    }
    if (o.overdueInvoices.length) {
      parts.push(
        "",
        "**Overdue collections:**",
        ...o.overdueInvoices.map((i) => `- ${i.ref} (${i.projectRef}) — ${i.daysOverdue} days overdue.`),
      );
    }
    parts.push("", "Dashboard → Action Center, or **Office → Invoices** for full lists.");
  } else if (/task|todo|due|workload/.test(q)) {
    if (o?.myOpenTasks.length) {
      parts.push(
        "**Your open tasks:**",
        ...o.myOpenTasks.map(
          (t) =>
            `- ${t.title}${t.projectRef ? ` (${t.projectRef})` : ""}${t.dueDate ? ` — due ${t.dueDate}` : ""}`,
        ),
      );
    } else {
      parts.push("You have no open tasks assigned, or check **Work → Tasks** for the full studio board.");
    }
    if (p) parts.push("", `On **${p.ref}**: ${p.openTasks} open task(s).`);
  } else if (/crif|decision|revision|change/.test(q)) {
    if (p?.openDecisions.length) {
      parts.push(
        `**Open CRIF on ${p.ref}:**`,
        ...p.openDecisions.map(
          (d) => `- ${d.title} — ${d.state}${d.category ? ` (${d.category})` : ""}`,
        ),
      );
    } else if (p) {
      parts.push(`No open CRIF decisions on ${p.ref}. Check Project → Overview.`);
    }
    if (o) parts.push("", `Office revision risk band: **${o.revisionRiskBand}**.`);
  } else if (/tender|bid|contractor/.test(q) && o) {
    if (o.openTenders.length) {
      parts.push(
        "**Open tenders:**",
        ...o.openTenders.map(
          (t) => `- ${t.projectRef}: ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`,
        ),
      );
    } else parts.push("No open tender packages. See **Office → Tenders**.");
    if (o.openConstruction.length) {
      parts.push(
        "",
        "**Site coordination inbox:**",
        ...o.openConstruction.slice(0, 4).map((c) => `- ${c.projectRef} ${c.kind}: ${c.subject}`),
      );
    }
  } else if (/project|status|overview/.test(q)) {
    if (p) {
      parts.push(
        `**${p.ref} — ${p.title}**`,
        p.clientName ? `Client: ${p.clientName}` : "",
        p.stage ? `Stage: ${p.stage}` : "",
        `${p.openTasks} open tasks; ${p.openDecisions.length} open CRIF item(s).`,
        "",
        "Open the project Overview tab for timeline, notes, and health tiles.",
      );
    } else if (o?.activeProjects.length) {
      parts.push(
        "**Active projects:**",
        ...o.activeProjects.slice(0, 8).map((pr) => `- ${pr.ref} — ${pr.title}${pr.stage ? ` [${pr.stage}]` : ""}`),
      );
    }
  } else if (/^(hello|hi|hey)\b|good (morning|afternoon|evening)/.test(q)) {
    parts.push(
      "Hello! I'm **ESTI**, your AORMS assistant.",
      "",
      "Ask about billing, tasks, projects, CRIF decisions, tenders, or site coordination — I'll use live data from your dashboard.",
    );
  } else if (/search|find|where/.test(q)) {
    parts.push(
      "Use **Search** (`/search`) with type filters for projects, drawings, clients, specs, and lessons.",
      "Dashboard **Action Center** surfaces billing, approvals, tenders, and site items needing attention.",
    );
  }

  if (parts.length === 0) {
    parts.push(
      p
        ? `You're on project **${p.ref}**. I can help with CRIF, tasks, drawings/BOQ, and invoices (if your role allows).`
        : "Ask about billing, tasks, projects, CRIF, tenders, or site coordination — I'll use live Action Center data.",
    );
    if (o?.activeProjects.length) {
      parts.push(
        "",
        "Active commissions:",
        ...o.activeProjects.slice(0, 5).map((pr) => `- ${pr.ref} — ${pr.title}`),
      );
    }
  }

  parts.push(
    "",
    `*Based on your question: "${question.trim()}"*`,
    "",
    "**Sources:** live AORMS snapshot (Action Center, projects, tasks).",
  );
  return parts.filter(Boolean).join("\n");
}
