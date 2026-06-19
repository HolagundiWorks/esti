import { Document, RulerAlt } from "@carbon/icons-react";
import { Button, ProgressIndicator, ProgressStep, Stack } from "@carbon/react";
import { ESTICAD_DOWNLOAD_URL } from "../lib/esticadLink.js";
import { LandingSectionHead } from "./LandingSectionHead.js";

const STEPS: {
  title: string;
  description: string;
  downloadHref?: string;
}[] = [
  {
    title: "Set up the practice in AORMS",
    description:
      "Projects, fee stages, drawing issues, invoices and client changes — one calm file instead of folders and spreadsheets.",
  },
  {
    title: "Draw and measure in ESTICAD",
    description:
      "Free software on your Windows PC. A built-in revision time log means one drawing file — save each issue, restore an earlier layout without copies piling up on your drive.",
    downloadHref: ESTICAD_DOWNLOAD_URL,
  },
  {
    title: "Issue drawings, bill and comply",
    description:
      "Watermarked issue PDFs, linked estimates, sanction checks and portals for clients and consultants — without losing the thread.",
  },
];

export function LandingWorkflow() {
  return (
    <Stack gap={7}>
        <LandingSectionHead
          titleId="workflow-heading"
          icon={Document}
          eyebrow="How studios use it"
          title="From briefing to final bill — one thread"
          lead="AORMS is where the practice lives. ESTICAD is optional drawing software that feeds it. Your judgement stays central — the system just keeps everything traceable."
        />

        <ProgressIndicator vertical currentIndex={-1}>
          {STEPS.map((step) => (
            <ProgressStep key={step.title} label={step.title} description={step.description} />
          ))}
        </ProgressIndicator>

        <Button
          kind="tertiary"
          renderIcon={RulerAlt}
          href={ESTICAD_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download ESTICAD
        </Button>
    </Stack>
  );
}
