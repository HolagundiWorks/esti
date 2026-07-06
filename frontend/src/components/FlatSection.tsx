import { Box, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * FlatSection — the canonical **flat** content block (AORMS Branding Kit §3).
 *
 * The app is card-less: content sits directly on the Fog-Gray canvas, grouped by
 * an uppercase eyebrow title and separated by hairline rules — never wrapped in an
 * elevated/bordered card. Use this in place of `<Paper sx={{ p }}>` / `<Card>`
 * content wrappers.
 *
 *   <FlatSection title="Approvals" action={<Button/>}>…</FlatSection>
 *
 * For a plain hairline divider between sections use `<Hairline />`.
 */
export function FlatSection({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  /** Right-aligned control on the title row (e.g. a create button). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      {(title || action) && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", mb: description ? 0.25 : 1 }}
        >
          {title && (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ flex: 1, letterSpacing: 1 }}
            >
              {title}
            </Typography>
          )}
          {!title && <Box sx={{ flex: 1 }} />}
          {action}
        </Stack>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/** A hairline separator between flat sections (full width by default). */
export function Hairline({ inset }: { inset?: boolean }) {
  return (
    <Divider
      sx={inset ? { width: "80%", mx: "auto", my: 1.5 } : { my: 1.5 }}
    />
  );
}
