import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { ProjectCpi } from "../ProjectCpi.js";
import { ProjectInfo } from "../ProjectInfo.js";
import { ProjectPipeline } from "../ProjectPipeline.js";
import { ProjectProgram } from "../ProjectProgram.js";
import { ProjectPreconPanel } from "./ProjectPreconPanel.js";

/** Progressive disclosure for Setup: Info · Pipeline · Program · R&O · CPI. */
export function ProjectBriefPanel({
  projectId,
  showCpi,
}: {
  projectId: string;
  showCpi: boolean;
}) {
  const [sub, setSub] = useState(0);
  const tabs = [
    { label: "Project Info", panel: <ProjectInfo projectId={projectId} /> },
    { label: "Pipeline", panel: <ProjectPipeline projectId={projectId} /> },
    { label: "Program", panel: <ProjectProgram projectId={projectId} /> },
    { label: "R&O", panel: <ProjectPreconPanel projectId={projectId} /> },
    ...(showCpi
      ? [{ label: "CPI", panel: <ProjectCpi projectId={projectId} /> }]
      : []),
  ];
  const safe = Math.min(sub, tabs.length - 1);

  return (
    <Box>
      <Tabs
        value={safe}
        onChange={(_e, v: number) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Project brief sections"
        sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        {tabs.map((t) => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>
      {tabs[safe]?.panel}
    </Box>
  );
}
