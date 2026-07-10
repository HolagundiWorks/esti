import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { ProjectDocuments, ProjectSpecSheets } from "../ProjectDocuments.js";

/** Documents | Specifications — one workspace tab, two surfaces. */
export function DocumentsSpecsPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <Box>
      <Tabs
        value={sub}
        onChange={(_e, v: number) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Documents and specifications"
        sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Documents" />
        <Tab label="Specifications" />
      </Tabs>
      {sub === 0 && <ProjectDocuments projectId={projectId} includeSpecs={false} />}
      {sub === 1 && <ProjectSpecSheets projectId={projectId} />}
    </Box>
  );
}
