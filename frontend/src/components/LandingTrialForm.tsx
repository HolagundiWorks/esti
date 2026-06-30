/**
 * Public trial workspace request form — short version: who you are + how to
 * reach you. Freelancer vs firm (+ team size) and discipline; everything else is
 * derived. Carbon controls only.
 */
import {
  Button,
  Column,
  Form,
  Grid,
  InlineNotification,
  Link,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextInput,
} from "@carbon/react";
import { useState, type FormEvent } from "react";
import type { TrialTeamSize } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

const TEAM_OPTIONS: { value: TrialTeamSize; label: string }[] = [
  { value: "2_5", label: "2–5 people" },
  { value: "6_15", label: "6–15 people" },
  { value: "16_50", label: "16–50 people" },
  { value: "50_PLUS", label: "50+ people" },
];

const DISCIPLINE_OPTIONS = [
  { value: "ARCHITECTURE", label: "Architecture" },
  { value: "INTERIOR", label: "Interior design" },
  { value: "OTHER", label: "Other" },
] as const;

/** Pre-fill context: which edition the user clicked from the pricing cards. */
export type LandingTrialPlanContext = "LITE" | "CORE" | "ENTERPRISE";

const PLAN_CONTEXT_LABEL: Record<LandingTrialPlanContext, string> = {
  LITE: "AORMS-Lite — free account",
  CORE: "AORMS-Core — contact for pricing",
  ENTERPRISE: "AORMS-Enterprise — contact for pricing (on-premises)",
};

type Kind = "FREELANCER" | "FIRM";
type Discipline = (typeof DISCIPLINE_OPTIONS)[number]["value"];

export function LandingTrialForm({ planContext }: { planContext?: LandingTrialPlanContext } = {}) {
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [kind, setKind] = useState<Kind | "">("");
  const [firmName, setFirmName] = useState("");
  const [teamSize, setTeamSize] = useState<TrialTeamSize | "">("");
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [error, setError] = useState<string | null>(null);

  const submit = trpc.marketing.submitTrialRequest.useMutation({
    onSuccess: () => setError(null),
    onError: (e) => setError(e.message),
  });

  const isFirm = kind === "FIRM";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!kind || !discipline) {
      setError("Please tell us whether you're a freelancer or a firm, and your focus.");
      return;
    }
    if (isFirm && (!firmName.trim() || !teamSize)) {
      setError("Please add your firm name and how many people.");
      return;
    }
    submit.mutate({
      fullName: fullName.trim(),
      workEmail: workEmail.trim(),
      mobile: mobile.trim(),
      companyName: isFirm ? firmName.trim() : fullName.trim(),
      role: isFirm ? "PRINCIPAL" : "SOLO_ARCHITECT",
      practiceType: discipline,
      teamSize: isFirm ? teamSize || "SOLO" : "SOLO",
      trialPreference: "BETA_AND_DEMO",
      improvementNotes: planContext ? `[${PLAN_CONTEXT_LABEL[planContext]}]` : undefined,
    });
  };

  if (submit.isSuccess) {
    return (
      <Stack gap={5}>
        <h3 className="esti-landing-section-title">Request received</h3>
        <p>
          Thanks — we'll email <strong>{workEmail}</strong> about access or a walkthrough, usually
          within one business day.
        </p>
        <p>
          Meanwhile, try the demo on this page or write to{" "}
          <Link href="mailto:hi@aorms.in">hi@aorms.in</Link>.
        </p>
      </Stack>
    );
  }

  return (
    <Form onSubmit={onSubmit}>
      <Stack gap={6}>
        {planContext && (
          <Tag
            size="md"
            type={planContext === "LITE" ? "green" : planContext === "CORE" ? "blue" : "purple"}
          >
            {PLAN_CONTEXT_LABEL[planContext]}
          </Tag>
        )}
        <Grid fullWidth className="esti-landing-grid">
          <Column lg={8} md={4} sm={4}>
            <TextInput
              id="trial-name"
              labelText="Your name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Column>
          <Column lg={8} md={4} sm={4}>
            <TextInput
              id="trial-email"
              labelText="Email"
              type="email"
              required
              autoComplete="email"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
            />
          </Column>
          <Column lg={8} md={4} sm={4}>
            <TextInput
              id="trial-mobile"
              labelText="Mobile / WhatsApp"
              type="tel"
              required
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </Column>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="trial-kind"
              labelText="Are you a freelancer or a firm?"
              required
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              <SelectItem value="" text="Select…" />
              <SelectItem value="FREELANCER" text="Freelancer / solo" />
              <SelectItem value="FIRM" text="A firm / studio" />
            </Select>
          </Column>
          {isFirm && (
            <>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="trial-firm"
                  labelText="Firm name"
                  required
                  autoComplete="organization"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <Select
                  id="trial-team"
                  labelText="How many people?"
                  required
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value as TrialTeamSize)}
                >
                  <SelectItem value="" text="Select…" />
                  {TEAM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} text={o.label} />
                  ))}
                </Select>
              </Column>
            </>
          )}
          <Column lg={8} md={4} sm={4}>
            <Select
              id="trial-discipline"
              labelText="Your focus"
              required
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
            >
              <SelectItem value="" text="Select…" />
              {DISCIPLINE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} text={o.label} />
              ))}
            </Select>
          </Column>
        </Grid>

        {error && <InlineNotification kind="error" title="Error" subtitle={error} />}

        <Button type="submit" kind="primary" size="lg" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Send request"}
        </Button>
      </Stack>
    </Form>
  );
}
