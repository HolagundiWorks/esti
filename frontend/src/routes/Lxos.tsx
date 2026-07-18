import { useState } from "react";
import { Box, Chip, Grid, Stack, Tab, Tabs } from "@mui/material";
import { RailLayout } from "../components/RailLayout.js";
import { LessonsBank } from "../components/ProjectLessons.js";
import { AcademyPanel } from "../components/AcademyPanel.js";

/**
 * LXOS — Learning Exchange Operating System (AORMS knowledge & professional exchange
 * layer). Internal Exchange surfaces the live Lessons Learned bank; Certification &
 * Growth surfaces the LXOS Academy (docs/holagundi/SOP.md as theory, real workspace
 * usage as practical — see AcademyPanel). The remaining layers are greenfield (see
 * docs/esti/NAVIGATION.md § LXOS).
 *
 * Material UI (Carbon → MUI migration).
 */
function PlannedGrid({ items }: { items: { title: string; description: string }[] }) {
  return (
    <Grid container spacing={1}>
      {items.map((m) => (
        <Grid key={m.title} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Box sx={{ p: 2, height: "100%", borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <h4>{m.title}</h4>
              <p className="esti-label esti-label--secondary">{m.description}</p>
              <Box>
                <Chip label="Planned" size="small" variant="outlined" />
              </Box>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

const LAYERS = ["Internal Exchange", "Community Exchange", "Professional Identity", "Certification & Growth"];

export function Lxos() {
  const [tab, setTab] = useState(0);
  return (
    <RailLayout
      title="LXOS"
      description="Learning Exchange Operating System — AORMS knowledge & professional exchange layer. Work and learning coexist; knowledge becomes infrastructure."
      tabs={
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_e, v) => setTab(v)}
          aria-label="LXOS layers"
        >
          {LAYERS.map((l) => (
            <Tab key={l} label={l} />
          ))}
        </Tabs>
      }
    >
      {tab === 0 && (
        <Stack spacing={3}>
          <LessonsBank />
          <PlannedGrid
            items={[
              { title: "Documentation Exchange", description: "Standard / detail / working drawings + documentation standards." },
              { title: "Internal Blogs", description: "Technical notes, material learnings, compliance and research." },
              { title: "Whiteboard Studio", description: "Team discussions, sketch sessions, design and technical reviews." },
              { title: "Knowledge Notes", description: "Standards, site-issue, vendor and internal reference notes." },
            ]}
          />
        </Stack>
      )}
      {tab === 1 && (
        <PlannedGrid
          items={[
            { title: "Case Studies", description: "Cross-firm project case studies and documentation showcase." },
            { title: "Architecture Blogs", description: "Public architecture and technical writing." },
            { title: "Discussions", description: "Technical, standards and open professional discussions." },
            { title: "Templates & Research", description: "Templates exchange, vendor reviews, research papers." },
          ]}
        />
      )}
      {tab === 2 && (
        <PlannedGrid
          items={[
            { title: "AORMS ID & Role", description: "Professional identity and role across the platform." },
            { title: "Contributions", description: "Knowledge contributions, articles and shared templates." },
            { title: "Reputation", description: "Community reputation score and contribution history." },
          ]}
        />
      )}
      {tab === 3 && <AcademyPanel />}
    </RailLayout>
  );
}
