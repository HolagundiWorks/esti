import type { TrialRequestInput } from "@esti/contracts";
import { env } from "../../env.js";
import { sendMail } from "./transport.js";

const ROLE_LABELS: Record<TrialRequestInput["role"], string> = {
  PRINCIPAL: "Principal architect",
  PARTNER: "Partner / director",
  PROJECT_LEAD: "Project lead",
  SOLO_ARCHITECT: "Solo architect",
  STUDIO_OWNER: "Studio owner",
  OPERATIONS: "Operations / office manager",
  ACCOUNTS: "Accounts / finance",
  OTHER: "Other",
};

const PRACTICE_LABELS: Record<NonNullable<TrialRequestInput["practiceType"]>, string> = {
  RESIDENTIAL: "Residential architecture",
  COMMERCIAL: "Commercial architecture",
  INTERIOR: "Interior design",
  LANDSCAPE: "Landscape",
  PMC: "PMC / project management",
  MULTI_DISCIPLINE: "Multi-disciplinary studio",
  OTHER: "Other",
};

const TEAM_LABELS: Record<NonNullable<TrialRequestInput["teamSize"]>, string> = {
  SOLO: "Solo (just me)",
  "2_5": "2–5 people",
  "6_15": "6–15 people",
  "16_50": "16–50 people",
  "50_PLUS": "50+",
};

const LOCATION_LABELS: Record<NonNullable<TrialRequestInput["locations"]>, string> = {
  SINGLE: "Single city",
  "2_5": "2–5 cities",
  "5_PLUS": "5+ locations / states",
};

const MODULE_LABELS: Record<TrialRequestInput["interestedModules"][number], string> = {
  REVISION_CRIF: "Client revision control (CRIF)",
  FEES_GST: "COA fees, GST invoicing & collections",
  DRAWINGS: "Drawing issue register & transmittals",
  BOQ_ESTIMATION: "BOQ & estimation (Rate Book)",
  TASKS_ASPRF: "Tasks, workload & ASPRF",
  PORTALS: "Client & consultant portals",
  TENDERS: "Tender & contractor coordination",
  ESTICAD: "ESTICAD desktop companion",
  SELF_HOSTED: "Self-hosted on our VPS",
};

const TOOL_LABELS: Record<TrialRequestInput["currentTools"][number], string> = {
  SPREADSHEETS: "Excel / Google Sheets",
  TALLY: "Tally (accounts only)",
  OTHER_PM: "Other PM / practice software",
  MANUAL: "Mostly email & manual files",
  CUSTOM: "Custom spreadsheets & templates",
};

const PAIN_LABELS: Record<TrialRequestInput["painPoints"][number], string> = {
  REVISION_SCOPE: "Unpaid revision scope creep",
  FEE_LEAKAGE: "Fee leakage on design changes",
  DRAWING_CHAOS: "Drawing issue / version chaos",
  GST_COLLECTIONS: "GST, TDS or collections tracking",
  TEAM_COORDINATION: "Team coordination & handoffs",
  SCATTERED_TOOLS: "Too many disconnected tools",
  MANUAL_BOQ: "Manual BOQ / quantity takeoff",
};

const PREFERENCE_LABELS: Record<TrialRequestInput["trialPreference"], string> = {
  BETA_ACCESS: "Beta testing workspace access",
  LIVE_DEMO: "Live product walkthrough",
  BETA_AND_DEMO: "Beta access + guided walkthrough",
};

const TIMELINE_LABELS: Record<NonNullable<TrialRequestInput["timeline"]>, string> = {
  IMMEDIATE: "Immediately",
  "30_DAYS": "Within 30 days",
  "3_MONTHS": "Within 3 months",
  EXPLORING: "Just exploring",
};

function bulletList(items: string[]): string {
  return items.length ? items.map((i) => `• ${i}`).join("\n") : "—";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyBetaRequestSubmitted(
  input: TrialRequestInput,
  meta: { id: string; createdAt: Date },
): Promise<{ sent: boolean; reason?: string }> {
  const modules = input.interestedModules.map((m) => MODULE_LABELS[m]);
  const tools = input.currentTools.map((t) => TOOL_LABELS[t]);
  const pains = input.painPoints.map((p) => PAIN_LABELS[p]);

  const lines = [
    "New AORMS beta testing request",
    "",
    `Request ID: ${meta.id}`,
    `Submitted: ${meta.createdAt.toISOString()}`,
    "",
    "Contact",
    `Name: ${input.fullName}`,
    `Email: ${input.workEmail}`,
    `Mobile: ${input.mobile}`,
    `Firm: ${input.companyName}`,
    `Role: ${ROLE_LABELS[input.role]}`,
    "",
    "Practice profile",
    `Type: ${input.practiceType ? PRACTICE_LABELS[input.practiceType] : "—"}`,
    `Team size: ${input.teamSize ? TEAM_LABELS[input.teamSize] : "—"}`,
    `Locations: ${input.locations ? LOCATION_LABELS[input.locations] : "—"}`,
    "",
    "Interested in",
    bulletList(modules),
    "",
    "Current tools",
    bulletList(tools),
    "",
    "Pain points",
    bulletList(pains),
    "",
    "Notes",
    input.improvementNotes?.trim() || "—",
    "",
    "Beta preference",
    `Request: ${PREFERENCE_LABELS[input.trialPreference]}`,
    `Timeline: ${input.timeline ? TIMELINE_LABELS[input.timeline] : "—"}`,
  ];

  const text = lines.join("\n");
  const html = `<pre style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.5">${escapeHtml(text)}</pre>`;

  const result = await sendMail({
    to: env.BETA_REQUEST_NOTIFY_TO,
    replyTo: input.workEmail,
    subject: `[AORMS Beta] ${input.companyName} — ${input.fullName}`,
    text,
    html,
  });

  if (!result.sent) {
    console.warn(`[mail] beta request ${meta.id} saved but email not sent: ${result.reason ?? "unknown"}`);
  }

  return result;
}
