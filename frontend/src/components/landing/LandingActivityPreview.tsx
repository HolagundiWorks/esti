/**
 * Recent activity tile — same structure as Dashboard.tsx activity feed.
 */
import { ArrowRight } from "@carbon/icons-react";
import { Stack, Tag, Tile } from "@carbon/react";
import { ACTIVITY_DOMAIN_TAG, activityDomain } from "@esti/contracts";
import { edge, formatEventType } from "../dashboard/dashboardUi.js";
import { LANDING_ACTIVITY_ROWS } from "./landing-dashboard-demo.js";

export function LandingActivityPreview() {
  return (
    <Tile className="esti-fill esti-lp-activity-preview" style={edge("neutral")}>
      <Stack gap={5}>
        <div className="esti-row">
          <h4 className="esti-grow">Recent activity</h4>
          <ArrowRight size={16} aria-hidden />
        </div>
        <Stack gap={4}>
          {LANDING_ACTIVITY_ROWS.map((item) => (
            <Stack key={item.id} gap={2}>
              <Stack orientation="horizontal" gap={3}>
                <Tag size="sm" type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]}>
                  {formatEventType(item.eventType)}
                </Tag>
                <p>
                  {new Date(item.createdAt).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </Stack>
              <p>{item.summary}</p>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Tile>
  );
}
