/**
 * ESTI explainability labels (formerly Carbon for AI). MUI implementation:
 * a small clickable "AI" chip that opens an explainability popover.
 */
import { Box, Chip, Popover, Stack, Typography } from "@mui/material";
import { useState } from "react";

export type EstiAiScope = "agent" | "draft" | "landing";

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
  landing: {
    textLabel: "ESTI guide",
    summary: "Product answers about AORMS — no access to your firm data on this page.",
    details: [
      "Powered by on-server Ollama when available.",
      "Read-only guidance about modules, workflows, and demos.",
      "For firm-specific questions, sign in or request beta access.",
    ],
  },
};

/** Primary AI transparency control — opens explainability on click. */
export function EstiAiExplainLabel({ scope }: { scope: EstiAiScope }) {
  const copy = EXPLAIN[scope];
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Chip
        size="small"
        variant="outlined"
        label={`AI · ${copy.textLabel}`}
        onClick={(e) => setAnchor(e.currentTarget)}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Stack spacing={1}>
            <Typography variant="body2" className="esti-ai-explain__summary">{copy.summary}</Typography>
            <ul className="esti-ai-explain__list">
              {copy.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
