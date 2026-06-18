/**
 * Public trial workspace request form — architect-specific fields (not generic ERP).
 */
import { useState, type FormEvent, type ReactNode } from "react";
import {
  TrialCurrentTool,
  TrialModuleInterest,
  TrialPainPoint,
  TrialPracticeType,
  TrialPreference,
  TrialRequestRole,
  TrialTeamSize,
  TrialTimeline,
  TrialLocations,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

const ROLE_OPTIONS: { value: TrialRequestRole; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal architect" },
  { value: "PARTNER", label: "Partner / director" },
  { value: "PROJECT_LEAD", label: "Project lead" },
  { value: "SOLO_ARCHITECT", label: "Solo architect" },
  { value: "STUDIO_OWNER", label: "Studio owner" },
  { value: "OPERATIONS", label: "Operations / office manager" },
  { value: "ACCOUNTS", label: "Accounts / finance" },
  { value: "OTHER", label: "Other" },
];

const PRACTICE_OPTIONS: { value: TrialPracticeType; label: string }[] = [
  { value: "RESIDENTIAL", label: "Residential architecture" },
  { value: "COMMERCIAL", label: "Commercial architecture" },
  { value: "INTERIOR", label: "Interior design" },
  { value: "LANDSCAPE", label: "Landscape" },
  { value: "PMC", label: "PMC / project management" },
  { value: "MULTI_DISCIPLINE", label: "Multi-disciplinary studio" },
  { value: "OTHER", label: "Other" },
];

const TEAM_OPTIONS: { value: TrialTeamSize; label: string }[] = [
  { value: "SOLO", label: "Solo (just me)" },
  { value: "2_5", label: "2–5 people" },
  { value: "6_15", label: "6–15 people" },
  { value: "16_50", label: "16–50 people" },
  { value: "50_PLUS", label: "50+" },
];

const LOCATION_OPTIONS: { value: TrialLocations; label: string }[] = [
  { value: "SINGLE", label: "Single city" },
  { value: "2_5", label: "2–5 cities" },
  { value: "5_PLUS", label: "5+ locations / states" },
];

const MODULE_OPTIONS: { value: TrialModuleInterest; label: string }[] = [
  { value: "REVISION_CRIF", label: "Client revision control (CRIF)" },
  { value: "FEES_GST", label: "COA fees, GST invoicing & collections" },
  { value: "DRAWINGS", label: "Drawing issue register & transmittals" },
  { value: "BYLAWS_RIE", label: "RIE / bylaw compliance" },
  { value: "BOQ_ESTIMATION", label: "BOQ & estimation (Master DSR)" },
  { value: "TASKS_ASPRF", label: "Tasks, workload & ASPRF" },
  { value: "PORTALS", label: "Client & consultant portals" },
  { value: "TENDERS", label: "Tender & contractor coordination" },
  { value: "ESTICAD", label: "ESTICAD desktop companion" },
  { value: "SELF_HOSTED", label: "Self-hosted on our VPS" },
];

const TOOL_OPTIONS: { value: TrialCurrentTool; label: string }[] = [
  { value: "SPREADSHEETS", label: "Excel / Google Sheets" },
  { value: "TALLY", label: "Tally (accounts only)" },
  { value: "OTHER_PM", label: "Other PM / practice software" },
  { value: "MANUAL", label: "Mostly email & manual files" },
  { value: "CUSTOM", label: "Custom spreadsheets & templates" },
];

const PAIN_OPTIONS: { value: TrialPainPoint; label: string }[] = [
  { value: "REVISION_SCOPE", label: "Unpaid revision scope creep" },
  { value: "FEE_LEAKAGE", label: "Fee leakage on design changes" },
  { value: "DRAWING_CHAOS", label: "Drawing issue / version chaos" },
  { value: "BYLAW_COMPLIANCE", label: "Bylaw / sanction compliance" },
  { value: "GST_COLLECTIONS", label: "GST, TDS or collections tracking" },
  { value: "TEAM_COORDINATION", label: "Team coordination & handoffs" },
  { value: "SCATTERED_TOOLS", label: "Too many disconnected tools" },
  { value: "MANUAL_BOQ", label: "Manual BOQ / quantity takeoff" },
];

const PREFERENCE_OPTIONS: { value: TrialPreference; label: string }[] = [
  { value: "BETA_ACCESS", label: "Beta testing workspace access" },
  { value: "LIVE_DEMO", label: "Live product walkthrough" },
  { value: "BETA_AND_DEMO", label: "Beta access + guided walkthrough" },
];

const TIMELINE_OPTIONS: { value: TrialTimeline; label: string }[] = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "30_DAYS", label: "Within 30 days" },
  { value: "3_MONTHS", label: "Within 3 months" },
  { value: "EXPLORING", label: "Just exploring" },
];

type FormState = {
  fullName: string;
  workEmail: string;
  mobile: string;
  companyName: string;
  role: TrialRequestRole | "";
  practiceType: TrialPracticeType | "";
  teamSize: TrialTeamSize | "";
  locations: TrialLocations | "";
  interestedModules: Set<TrialModuleInterest>;
  currentTools: Set<TrialCurrentTool>;
  painPoints: Set<TrialPainPoint>;
  improvementNotes: string;
  trialPreference: TrialPreference | "";
  timeline: TrialTimeline | "";
};

const INITIAL: FormState = {
  fullName: "",
  workEmail: "",
  mobile: "",
  companyName: "",
  role: "",
  practiceType: "",
  teamSize: "",
  locations: "",
  interestedModules: new Set(),
  currentTools: new Set(),
  painPoints: new Set(),
  improvementNotes: "",
  trialPreference: "",
  timeline: "",
};

function toggleSet<T extends string>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="esti-lp-field__label" htmlFor={htmlFor}>
      {children}
      {required && <span className="esti-lp-field__req"> Required</span>}
    </label>
  );
}

function CheckGroup<T extends string>({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
}) {
  return (
    <fieldset className="esti-lp-checkgroup">
      <legend className="esti-lp-field__label">{legend}</legend>
      <div className="esti-lp-checkgroup__grid">
        {options.map((o) => (
          <label key={o.value} className="esti-lp-check">
            <input
              type="checkbox"
              checked={selected.has(o.value)}
              onChange={() => onChange(toggleSet(selected, o.value))}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LandingTrialForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const submit = trpc.marketing.submitTrialRequest.useMutation({
    onSuccess: () => setError(null),
    onError: (e) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.role || !form.trialPreference) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.interestedModules.size === 0) {
      setError("Select at least one AORMS capability you are interested in.");
      return;
    }
    submit.mutate({
      fullName: form.fullName,
      workEmail: form.workEmail,
      mobile: form.mobile,
      companyName: form.companyName,
      role: form.role,
      practiceType: form.practiceType || undefined,
      teamSize: form.teamSize || undefined,
      locations: form.locations || undefined,
      interestedModules: [...form.interestedModules],
      currentTools: [...form.currentTools],
      painPoints: [...form.painPoints],
      improvementNotes: form.improvementNotes || undefined,
      trialPreference: form.trialPreference,
      timeline: form.timeline || undefined,
    });
  };

  if (submit.isSuccess) {
    return (
      <div className="esti-lp-trial__thanks">
        <h3>Request received</h3>
        <p>
          Thank you — our team will review your practice profile and email{" "}
          <strong>{form.workEmail}</strong> about <strong>beta testing access</strong> or a walkthrough,
          usually within one business day.
        </p>
        <p className="esti-lp-meta">
          This is not automatic trial provisioning — we onboard beta studios manually. Meanwhile, explore
          the live demo on this page or write to{" "}
          <a href="mailto:hi@aorms.in">hi@aorms.in</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="esti-lp-trial" onSubmit={onSubmit} noValidate>
      <div className="esti-lp-trial__section">
        <h3 className="esti-lp-trial__heading">Contact details</h3>
        <div className="esti-lp-trial__grid esti-lp-trial__grid--2">
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-name" required>
              Full name
            </FieldLabel>
            <input
              id="trial-name"
              className="esti-lp-input"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-email" required>
              Work email
            </FieldLabel>
            <input
              id="trial-email"
              type="email"
              className="esti-lp-input"
              required
              autoComplete="email"
              value={form.workEmail}
              onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
            />
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-mobile" required>
              Mobile / WhatsApp
            </FieldLabel>
            <input
              id="trial-mobile"
              type="tel"
              className="esti-lp-input"
              required
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-firm" required>
              Firm / studio name
            </FieldLabel>
            <input
              id="trial-firm"
              className="esti-lp-input"
              required
              autoComplete="organization"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div className="esti-lp-field esti-lp-field--full">
            <FieldLabel htmlFor="trial-role" required>
              Your role
            </FieldLabel>
            <select
              id="trial-role"
              className="esti-lp-input"
              required
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as TrialRequestRole }))}
            >
              <option value="">Select…</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="esti-lp-trial__section">
        <h3 className="esti-lp-trial__heading">Practice profile</h3>
        <div className="esti-lp-trial__grid esti-lp-trial__grid--3">
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-practice">Practice type</FieldLabel>
            <select
              id="trial-practice"
              className="esti-lp-input"
              value={form.practiceType}
              onChange={(e) =>
                setForm((f) => ({ ...f, practiceType: e.target.value as TrialPracticeType }))
              }
            >
              <option value="">Select…</option>
              {PRACTICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-team">Team size</FieldLabel>
            <select
              id="trial-team"
              className="esti-lp-input"
              value={form.teamSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, teamSize: e.target.value as TrialTeamSize }))
              }
            >
              <option value="">Select…</option>
              {TEAM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-locations">Locations</FieldLabel>
            <select
              id="trial-locations"
              className="esti-lp-input"
              value={form.locations}
              onChange={(e) =>
                setForm((f) => ({ ...f, locations: e.target.value as TrialLocations }))
              }
            >
              <option value="">Select…</option>
              {LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="esti-lp-trial__section">
        <CheckGroup
          legend="Which AORMS capabilities interest you? (select all that apply)"
          options={MODULE_OPTIONS}
          selected={form.interestedModules}
          onChange={(next) => setForm((f) => ({ ...f, interestedModules: next }))}
        />
        <CheckGroup
          legend="What tools do you use today?"
          options={TOOL_OPTIONS}
          selected={form.currentTools}
          onChange={(next) => setForm((f) => ({ ...f, currentTools: next }))}
        />
      </div>

      <div className="esti-lp-trial__section">
        <CheckGroup
          legend="What problems are you trying to solve?"
          options={PAIN_OPTIONS}
          selected={form.painPoints}
          onChange={(next) => setForm((f) => ({ ...f, painPoints: next }))}
        />
        <div className="esti-lp-field">
          <FieldLabel htmlFor="trial-notes">Anything specific you want to improve?</FieldLabel>
          <textarea
            id="trial-notes"
            className="esti-lp-input esti-lp-input--area"
            rows={4}
            value={form.improvementNotes}
            onChange={(e) => setForm((f) => ({ ...f, improvementNotes: e.target.value }))}
          />
        </div>
      </div>

      <div className="esti-lp-trial__section">
        <h3 className="esti-lp-trial__heading">Beta preference</h3>
        <div className="esti-lp-trial__grid esti-lp-trial__grid--2">
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-pref" required>
              What would you like?
            </FieldLabel>
            <select
              id="trial-pref"
              className="esti-lp-input"
              required
              value={form.trialPreference}
              onChange={(e) =>
                setForm((f) => ({ ...f, trialPreference: e.target.value as TrialPreference }))
              }
            >
              <option value="">Select…</option>
              {PREFERENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="esti-lp-field">
            <FieldLabel htmlFor="trial-timeline">Expected timeline</FieldLabel>
            <select
              id="trial-timeline"
              className="esti-lp-input"
              value={form.timeline}
              onChange={(e) =>
                setForm((f) => ({ ...f, timeline: e.target.value as TrialTimeline }))
              }
            >
              <option value="">Select…</option>
              {TIMELINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="esti-lp-note esti-lp-note--error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="esti-lp-btn esti-lp-btn--primary esti-lp-btn--lg"
        disabled={submit.isPending}
      >
        {submit.isPending ? "Submitting…" : "Request beta testing access"}
      </button>
    </form>
  );
}
