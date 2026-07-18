import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { ProjectApprovals } from "../ProjectApprovals.js";
import { ProjectDrawings } from "../ProjectDrawings.js";
import { ProjectTransmittals } from "../ProjectTransmittals.js";

type DrawingsSubTab = "drawings" | "transmittals" | "approvals";

function subTabIndex(tab: DrawingsSubTab): number {
  if (tab === "transmittals") return 1;
  if (tab === "approvals") return 2;
  return 0;
}

/**
 * Progressive disclosure for the former concatenated Drawings + Transmittals +
 * Approvals stack (Hick / Serial Position). One tab at a time.
 */
export function DrawingsApprovalsPanel({
  projectId,
  initialSubTab = "drawings",
  focusApprovalId,
}: {
  projectId: string;
  initialSubTab?: DrawingsSubTab;
  focusApprovalId?: string | null;
}) {
  const [sub, setSub] = useState(() => subTabIndex(initialSubTab));

  useEffect(() => {
    setSub(subTabIndex(initialSubTab));
  }, [initialSubTab, projectId]);
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
      {sub === 2 && (
        <ProjectApprovals projectId={projectId} focusApprovalId={focusApprovalId} />
      )}
    </Box>
  );
}
