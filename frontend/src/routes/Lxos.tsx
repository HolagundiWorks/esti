import { Alert, Box, Chip, Stack } from "@mui/material";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { LessonsBank } from "../components/ProjectLessons.js";
import { AcademyPanel } from "../components/AcademyPanel.js";

/**
 * LXOS — Learning Exchange Operating System. Only live surfaces are shown as
 * primary content; unfinished layers stay behind a single "Coming soon" notice
 * (Parkinson / Goal Gradient — avoid placeholder tab exploration). Lessons
 * Learned and the Academy (docs/holagundi/SOP.md as theory, real workspace
 * usage as practical — see AcademyPanel) are both live; Community Exchange
 * and Professional Identity remain planned.
 */
export function Lxos() {
  return (
    <RailLayout
      title="LXOS"
      description="Learning Exchange Operating System — firm lessons, knowledge exchange, and the SOP Academy. Additional layers ship as they are built."
    >
      <PageBreadcrumb items={[{ label: "LXOS" }]} />
      <Stack spacing={3}>
        <LessonsBank />
        <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
          <h4 style={{ margin: 0, marginBottom: 8 }}>Academy — SOP theory + practical</h4>
          <AcademyPanel />
        </Box>
        <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
            <h4 style={{ margin: 0 }}>More LXOS layers</h4>
            <Chip label="Coming soon" size="small" variant="outlined" />
          </Stack>
          <Alert severity="info" variant="outlined">
            Community Exchange and Professional Identity are planned. Use Lessons
            Learned and the Academy above for firm-private knowledge and training today.
          </Alert>
        </Box>
      </Stack>
    </RailLayout>
  );
}
