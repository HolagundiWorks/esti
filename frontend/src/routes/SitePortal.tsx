import { Stack, Tile } from "@carbon/react";
import { useParams } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/**
 * Site Supervisor Portal — mobile-first Carbon shell.
 * Accessible to SITE_SUPERVISOR role (dedicated field staff) or
 * any office staff member granted the site_portal capability (site incharge).
 *
 * Full inspection submit/approve workflow implemented in Slice C.
 */
export function SitePortal() {
  const { projectId } = useParams<{ projectId?: string }>();
  const meQ = trpc.auth.me.useQuery();
  const user = meQ.data;

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem" }}>
      <Stack gap={6}>
        <Stack gap={2}>
          <h2>Site Portal</h2>
          <p className="esti-label--secondary">
            {user?.fullName ?? "Site Supervisor"} · Field view
          </p>
        </Stack>
        <Tile>
          <Stack gap={3}>
            <h4>Site Inspections</h4>
            <p>
              {projectId
                ? `Project ${projectId} — inspection workflow coming in next slice.`
                : "Select a project to view and submit inspections."}
            </p>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
