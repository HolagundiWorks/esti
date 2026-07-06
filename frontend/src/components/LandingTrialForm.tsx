/**
 * Public trial workspace request form — short version: who you are + how to
 * reach you. Freelancer vs firm (+ team size) and discipline; everything else is
 * derived. Carbon controls only.
 */
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Grid,
  Link,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
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
export type LandingTrialPlanContext = "LITE" | "PRO";

const PLAN_CONTEXT_LABEL: Record<LandingTrialPlanContext, string> = {
  LITE: "AORMS-Lite — free account",
  PRO: "AORMS-Pro — contact for pricing",
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
      <Stack spacing={2}>
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
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={3}>
        {planContext && (
          <Box>
            <Chip
              size="small"
              label={PLAN_CONTEXT_LABEL[planContext]}
              sx={{
                backgroundColor: `var(--cds-tag-background-${planContext === "LITE" ? "green" : "blue"})`,
                color: `var(--cds-tag-color-${planContext === "LITE" ? "green" : "blue"})`,
              }}
            />
          </Box>
        )}
        <Grid container spacing={2} className="esti-landing-grid">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="trial-name"
              label="Your name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="trial-email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="trial-mobile"
              label="Mobile / WhatsApp"
              type="tel"
              required
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              id="trial-kind"
              label="Are you a freelancer or a firm?"
              required
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              <MenuItem value="">Select…</MenuItem>
              <MenuItem value="FREELANCER">Freelancer / solo</MenuItem>
              <MenuItem value="FIRM">A firm / studio</MenuItem>
            </TextField>
          </Grid>
          {isFirm && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  id="trial-firm"
                  label="Firm name"
                  required
                  autoComplete="organization"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  id="trial-team"
                  label="How many people?"
                  required
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value as TrialTeamSize)}
                >
                  <MenuItem value="">Select…</MenuItem>
                  {TEAM_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </>
          )}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              id="trial-discipline"
              label="Your focus"
              required
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
            >
              <MenuItem value="">Select…</MenuItem>
              {DISCIPLINE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Send request"}
        </Button>
      </Stack>
    </Box>
  );
}
