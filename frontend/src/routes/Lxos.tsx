import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { PageHeader } from "../components/PageHeader.js";

/**
 * LXOS — Learning Exchange Operating System (AORMS knowledge & professional exchange
 * layer). Navigational placeholder for the V3 pillar; the layers below are greenfield
 * (see docs/esti/NAVIGATION.md § LXOS). Lessons Learned wires in once built.
 */
const LAYERS: { title: string; description: string }[] = [
  {
    title: "Internal Exchange",
    description:
      "Firm-private: Project Learnings (site, design decisions, revisions, lessons), Documentation Exchange, Internal Blogs, Whiteboard Studio, Knowledge Notes.",
  },
  {
    title: "Community Exchange",
    description:
      "Across firms: case studies, documentation showcase, architecture blogs, technical & standards discussions, vendor reviews, templates, research papers.",
  },
  {
    title: "Professional Identity",
    description:
      "AORMS ID, professional role, knowledge contributions, community reputation, articles, shared templates, contribution history.",
  },
  {
    title: "Certification & Growth",
    description:
      "AORMS certification tracks (Architect / HR / Finance / Operations), skill assessments, levels (Foundation → Master), learning history.",
  },
];

export function Lxos() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="LXOS"
        description="Learning Exchange Operating System — AORMS knowledge & professional exchange layer. Work and learning coexist; knowledge becomes infrastructure."
      />

      <Tag type="purple">Coming soon — exchange layers in planning</Tag>

      <Grid narrow>
        {LAYERS.map((m) => (
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
