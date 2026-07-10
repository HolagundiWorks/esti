import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { ProjectCommunicationsLog } from "../ProjectCommunicationsLog.js";
import { ProjectMinutes } from "../ProjectMinutes.js";
import { ProjectSiteVisits } from "../ProjectSiteVisits.js";

/** Site Progress | Communications | Minutes. */
export function ProjectDeliveryPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <Box>
      <Tabs
        value={sub}
        onChange={(_e, v: number) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Delivery and site coordination"
        sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Site Progress" />
        <Tab label="Communications" />
        <Tab label="Minutes" />
      </Tabs>
      {sub === 0 && <ProjectSiteVisits projectId={projectId} />}
      {sub === 1 && <ProjectCommunicationsLog projectId={projectId} />}
      {sub === 2 && <ProjectMinutes projectId={projectId} />}
    </Box>
  );
}
