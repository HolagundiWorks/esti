/**
 * Action Center tiles — same components and layout as DashboardActionCenter.tsx.
 */
import {
  Column,
  Grid,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
} from "@carbon/react";
import { edge } from "../dashboard/dashboardUi.js";
import {
  LANDING_OVERDUE_INVOICES,
  LANDING_PENDING_APPROVALS,
} from "./landing-dashboard-demo.js";

export function LandingActionCenterPreview() {
  return (
    <Grid fullWidth condensed className="esti-dash">
      <Column lg={8} md={4} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(LANDING_PENDING_APPROVALS.length > 0 ? "watch" : "ok")}
        >
          <Stack gap={4}>
            <h4>Approvals pending</h4>
            <StructuredListWrapper isCondensed>
              <StructuredListBody>
                {LANDING_PENDING_APPROVALS.map((ap) => (
                  <StructuredListRow key={ap.id}>
                    <StructuredListCell>
                      <p>{ap.ref}</p>
                      <p>{ap.detail}</p>
                    </StructuredListCell>
                    <StructuredListCell noWrap>
                      <Tag type="magenta" size="sm">
                        {ap.days}d waiting
                      </Tag>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </Stack>
        </Tile>
      </Column>
      <Column lg={8} md={4} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(LANDING_OVERDUE_INVOICES.length > 0 ? "alert" : "ok")}
        >
          <Stack gap={4}>
            <h4>Overdue collections</h4>
            <StructuredListWrapper isCondensed>
              <StructuredListBody>
                {LANDING_OVERDUE_INVOICES.map((inv) => (
                  <StructuredListRow key={inv.id}>
                    <StructuredListCell>
                      <p>{inv.ref}</p>
                      <p>{inv.amount}</p>
                    </StructuredListCell>
                    <StructuredListCell noWrap>
                      <Tag type="red" size="sm">
                        {inv.daysOverdue}d overdue
                      </Tag>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </Stack>
        </Tile>
      </Column>
    </Grid>
  );
}
