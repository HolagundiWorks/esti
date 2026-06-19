/**
 * Carbon for AI — shared ESTI explainability labels.
 * @see https://carbondesignsystem.com/guidelines/carbon-for-ai/
 */
import { AILabel, Stack } from "@carbon/react";

export type EstiAiScope = "agent" | "draft";

const EXPLAIN: Record<
  EstiAiScope,
  { textLabel: string; summary: string; details: string[] }
> = {
  agent: {
    textLabel: "ESTI agent",
    summary: "Read-only answers from permission-filtered AORMS data.",
    details: [
      "Uses live project and office records you can access — no uploads in agent mode.",
      "Suggestions only; verify before client, site, or compliance decisions.",
      "No automatic emails, invoices, or document issuance.",
    ],
  },
  draft: {
    textLabel: "AI draft",
    summary: "Generated text from your project and office context.",
    details: [
      "Edit the draft before use; mark reviewed when satisfied.",
      "Copy into the target document and issue manually.",
      "Source tags show which records informed the draft.",
    ],
  },
};

/** Primary AI transparency control — opens explainability on click. */
export function EstiAiExplainLabel({ scope }: { scope: EstiAiScope }) {
  const copy = EXPLAIN[scope];
  return (
    <AILabel aiText="AI" textLabel={copy.textLabel} align="top-end">
      <div>
        <Stack gap={3}>
          <p className="esti-ai-explain__summary">{copy.summary}</p>
          <ul className="esti-ai-explain__list">
            {copy.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Stack>
      </div>
    </AILabel>
  );
}
