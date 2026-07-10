import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { ProjectApprovals } from "../ProjectApprovals.js";
import { ProjectDrawings } from "../ProjectDrawings.js";
import { ProjectTransmittals } from "../ProjectTransmittals.js";

/**
 * Progressive disclosure for the former concatenated Drawings + Transmittals +
 * Approvals stack (Hick / Serial Position). One tab at a time.
 */
export function DrawingsApprovalsPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <Box>
      <Tabs
        value={sub}
        onChange={(_e, v: number) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Drawings, transmittals, and approvals"
        sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Drawings" />
        <Tab label="Transmittals" />
        <Tab label="Approvals" />
      </Tabs>
      {sub === 0 && <ProjectDrawings projectId={projectId} />}
      {sub === 1 && <ProjectTransmittals projectId={projectId} />}
      {sub === 2 && <ProjectApprovals projectId={projectId} />}
    </Box>
  );
}
