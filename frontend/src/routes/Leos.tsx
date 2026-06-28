import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { PageHeader } from "../components/PageHeader.js";

/**
 * LEOS — Learning Environment Operating System. Navigational placeholder for the
 * V2 nav pillar; the modules below are not built yet. See docs/esti/NAVIGATION.md
 * § LEOS and ROADMAP Phase 32. Certificates are not stored here (sync externally).
 */
const PLANNED: { title: string; description: string }[] = [
  { title: "Learning Sessions", description: "Weekly, Saturday, vendor and team knowledge sessions." },
  { title: "Presentations", description: "Team presentations, case studies, research and internal reviews." },
  { title: "Research & Knowledge", description: "Research papers, building case studies, code, standards and material discussions." },
  { title: "Whiteboard Studio", description: "Collaborative design and construction-detail discussions, markups and sketches." },
  { title: "Personal Learning", description: "Notes, flashcards, saved references and bookmarks." },
  { title: "Assessments", description: "Practical exercises, competency tests and workflow simulations." },
  { title: "Learning Progress", description: "Learning hours, session attendance, assessment history and progress." },
];

export function Leos() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="LEOS"
        description="Learning Environment Operating System — continuous professional development inside the practice. Not a traditional LMS; certificates sync externally."
      />

      <Tag type="purple">Coming soon — modules in planning</Tag>

      <Grid narrow>
        {PLANNED.map((m) => (
          <Column key={m.title} lg={4} md={4} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={3}>
                <h4>{m.title}</h4>
                <p className="esti-label esti-label--secondary">{m.description}</p>
                <Tag type="gray" size="sm">Planned</Tag>
              </Stack>
            </Tile>
          </Column>
        ))}
      </Grid>
    </Stack>
  );
}
