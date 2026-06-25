/**
 * Public trial workspace request form — Carbon controls.
 */
import {
  Button,
  Checkbox,
  Column,
  Form,
  FormGroup,
  Grid,
  InlineNotification,
  Link,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { useState, type FormEvent } from "react";
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
  { value: "REVISION_CRIF", label: "Client revision control" },
  { value: "FEES_GST", label: "COA fees, GST invoicing & collections" },
  { value: "DRAWINGS", label: "Drawing issue register & transmittals" },
  { value: "BOQ_ESTIMATION", label: "Estimates & BOQ" },
  { value: "TASKS_ASPRF", label: "Tasks, workload & team performance" },
  { value: "PORTALS", label: "Client & consultant portals" },
  { value: "TENDERS", label: "Tender & contractor coordination" },
  { value: "ESTICAD", label: "ESTICAD drawing software" },
  { value: "SELF_HOSTED", label: "Run on our own servers" },
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
  { value: "GST_COLLECTIONS", label: "GST, TDS or collections tracking" },
  { value: "TEAM_COORDINATION", label: "Team coordination & handoffs" },
  { value: "SCATTERED_TOOLS", label: "Too many disconnected tools" },
  { value: "MANUAL_BOQ", label: "Manual BOQ / quantity takeoff" },
];

const PREFERENCE_OPTIONS: { value: TrialPreference; label: string }[] = [
  { value: "BETA_ACCESS", label: "Early access to try the software" },
  { value: "LIVE_DEMO", label: "A guided walkthrough" },
  { value: "BETA_AND_DEMO", label: "Both — access and a walkthrough" },
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
    <FormGroup legendText={legend}>
      <Grid fullWidth className="esti-landing-grid">
        {options.map((o) => (
          <Column key={o.value} lg={8} md={4} sm={4}>
            <Checkbox
              id={`trial-${o.value}`}
              labelText={o.label}
              checked={selected.has(o.value)}
              onChange={(_, { checked }) => {
                const next = new Set(selected);
                if (checked) next.add(o.value);
                else next.delete(o.value);
                onChange(next);
              }}
            />
          </Column>
        ))}
      </Grid>
    </FormGroup>
  );
}

/** Pre-fill context: which edition the user clicked from the pricing cards. */
export type LandingTrialPlanContext = "LITE" | "CORE" | "ENTERPRISE";

const PLAN_CONTEXT_LABEL: Record<LandingTrialPlanContext, string> = {
  LITE: "AORMS-Lite — free account",
  CORE: "AORMS-Core — contact for pricing",
  ENTERPRISE: "AORMS-Enterprise — contact for pricing (on-premises)",
};

export function LandingTrialForm({ planContext }: { planContext?: LandingTrialPlanContext } = {}) {
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
      setError("Select at least one capability you are interested in.");
      return;
    }
    const tag = planContext ? `[${PLAN_CONTEXT_LABEL[planContext]}]` : "";
    const notes = [tag, form.improvementNotes].filter(Boolean).join("\n").trim();
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
      improvementNotes: notes || undefined,
      trialPreference: form.trialPreference,
      timeline: form.timeline || undefined,
    });
  };

  if (submit.isSuccess) {
    return (
      <Stack gap={5}>
        <h3 className="esti-landing-section-title">Request received</h3>
        <p>
          Thank you — we will review your details and email <strong>{form.workEmail}</strong> about
          early access or a walkthrough, usually within one business day.
        </p>
        <p>
          We onboard studios personally — it is not an instant signup. Meanwhile, try the demo on
          this page or write to <Link href="mailto:hi@aorms.in">hi@aorms.in</Link>.
        </p>
      </Stack>
    );
  }

  return (
    <Form onSubmit={onSubmit}>
      <Stack gap={6}>
        {planContext && (
          <Tag size="md" type={planContext === "LITE" ? "green" : planContext === "CORE" ? "blue" : "purple"}>
            {PLAN_CONTEXT_LABEL[planContext]}
          </Tag>
        )}
        <Stack gap={5}>
          <h3 className="esti-landing-section-title">Contact details</h3>
          <Grid fullWidth className="esti-landing-grid">
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="trial-name"
                labelText="Full name"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="trial-email"
                labelText="Work email"
                type="email"
                required
                autoComplete="email"
                value={form.workEmail}
                onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="trial-mobile"
                labelText="Mobile / WhatsApp"
                type="tel"
                required
                autoComplete="tel"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="trial-firm"
                labelText="Firm / studio name"
                required
                autoComplete="organization"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <Select
                id="trial-role"
                labelText="Your role"
                required
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as TrialRequestRole }))
                }
              >
                <SelectItem value="" text="Select…" />
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
          </Grid>
        </Stack>

        <Stack gap={5}>
          <h3 className="esti-landing-section-title">Practice profile</h3>
          <Grid fullWidth className="esti-landing-grid">
            <Column lg={5} md={8} sm={4}>
              <Select
                id="trial-practice"
                labelText="Practice type"
                value={form.practiceType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, practiceType: e.target.value as TrialPracticeType }))
                }
              >
                <SelectItem value="" text="Select…" />
                {PRACTICE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
            <Column lg={5} md={8} sm={4}>
              <Select
                id="trial-team"
                labelText="Team size"
                value={form.teamSize}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teamSize: e.target.value as TrialTeamSize }))
                }
              >
                <SelectItem value="" text="Select…" />
                {TEAM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
            <Column lg={6} md={8} sm={4}>
              <Select
                id="trial-locations"
                labelText="Locations"
                value={form.locations}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locations: e.target.value as TrialLocations }))
                }
              >
                <SelectItem value="" text="Select…" />
                {LOCATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
          </Grid>
        </Stack>

        <Stack gap={5}>
          <CheckGroup
            legend="What would help your practice most? (select all that apply)"
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
        </Stack>

        <Stack gap={5}>
          <CheckGroup
            legend="What problems are you trying to solve?"
            options={PAIN_OPTIONS}
            selected={form.painPoints}
            onChange={(next) => setForm((f) => ({ ...f, painPoints: next }))}
          />
          <TextArea
            id="trial-notes"
            labelText="Anything specific you want to improve?"
            rows={4}
            value={form.improvementNotes}
            onChange={(e) => setForm((f) => ({ ...f, improvementNotes: e.target.value }))}
          />
        </Stack>

        <Stack gap={5}>
          <h3 className="esti-landing-section-title">What you are looking for</h3>
          <Grid fullWidth className="esti-landing-grid">
            <Column lg={8} md={4} sm={4}>
              <Select
                id="trial-pref"
                labelText="What would you like?"
                required
                value={form.trialPreference}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trialPreference: e.target.value as TrialPreference }))
                }
              >
                <SelectItem value="" text="Select…" />
                {PREFERENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Select
                id="trial-timeline"
                labelText="Expected timeline"
                value={form.timeline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeline: e.target.value as TrialTimeline }))
                }
              >
                <SelectItem value="" text="Select…" />
                {TIMELINE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </Column>
          </Grid>
        </Stack>

        {error && <InlineNotification kind="error" title="Error" subtitle={error} />}

        <Button type="submit" kind="primary" size="lg" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Send request"}
        </Button>
      </Stack>
    </Form>
  );
}
