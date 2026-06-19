import {
  ClickableTile,
  Column,
  InlineLoading,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
} from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import type { AppRouter } from "@esti/backend/router";
import { formatINRShort } from "@esti/contracts";
import type { inferRouterOutputs } from "@trpc/server";
import { Link } from "react-router-dom";
import { AiDraftPanel } from "../AiStudio.js";
import { edge, ZoneHead } from "./dashboardUi.js";

type DashboardHome = inferRouterOutputs<AppRouter>["dashboard"]["home"];
type ActionCenter = NonNullable<DashboardHome["actionCenter"]>;
type ProjectHealth = DashboardHome["projectHealth"][number];
type TeamMember = inferRouterOutputs<AppRouter>["dashboard"]["teamIntelligence"][number];

type Props = {
  navigate: (to: string) => void;
  homeLoading: boolean;
  hrEnabled: boolean;
  showBillingAssistant: boolean;
  acTotal: number;
  teamLoading: boolean;
  billingReady: ActionCenter["billingReadyPhases"];
  overdueInvoices: ActionCenter["overdueInvoices"];
  pendingApprovals: ActionCenter["pendingApprovals"];
  openTenders: ActionCenter["openTenders"];
  openConstruction: ActionCenter["openConstruction"];
  riskProjects: ProjectHealth[];
  overloadedMembers: TeamMember[];
  readyToBillSum: number;
};

export function DashboardActionCenter({
  navigate,
  homeLoading,
  hrEnabled,
  showBillingAssistant,
  acTotal,
  teamLoading,
  billingReady,
  overdueInvoices,
  pendingApprovals,
  openTenders,
  openConstruction,
  riskProjects,
  overloadedMembers,
  readyToBillSum,
}: Props) {
  return (
    <>
      <Column lg={16} md={8} sm={4}>
        <ZoneHead
          title="Action Center"
          sub="Billing, approvals, tenders, site coordination, and risk items that need a decision today."
          statusTag={
            !homeLoading && (!hrEnabled || !teamLoading)
              ? { text: acTotal > 0 ? `${acTotal} open` : "All clear", type: acTotal > 0 ? "red" : "green" }
              : undefined
          }
        />
        {showBillingAssistant && (
          <div style={{ marginTop: 12 }}>
            <AiDraftPanel defaultKind="BILLING_ASSISTANT" compact />
          </div>
        )}
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill" style={edge(overdueInvoices.length > 0 ? "alert" : "ok")}>
          <Stack gap={4}>
            <h4>Overdue collections</h4>
            {homeLoading ? (
              <InlineLoading description="Loading…" />
            ) : overdueInvoices.length === 0 ? (
              <p>None beyond 30 days.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {overdueInvoices.slice(0, 4).map((inv) => (
                    <StructuredListRow key={inv.id}>
                      <StructuredListCell>
                        <Link to={`/projects/${inv.projectId}?tab=invoices`}>
                          {inv.ref}
                        </Link>
                        <p>{formatINRShort(inv.netReceivablePaise)}</p>
                      </StructuredListCell>
                      <StructuredListCell noWrap>
                        <Tag type="red" size="sm">{inv.daysOverdue}d overdue</Tag>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill" style={edge(pendingApprovals.length > 0 ? "watch" : "ok")}>
          <Stack gap={4}>
            <h4>Approvals pending</h4>
            {homeLoading ? (
              <InlineLoading description="Loading…" />
            ) : pendingApprovals.length === 0 ? (
              <p>None awaiting client response.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {pendingApprovals.slice(0, 4).map((ap) => (
                    <StructuredListRow key={ap.id}>
                      <StructuredListCell>
                        <Link to={`/projects/${ap.projectId}?tab=approvals`}>
                          {ap.projectRef}
                        </Link>
                        <p>{ap.title}</p>
                      </StructuredListCell>
                      <StructuredListCell noWrap>
                        <Tag type="magenta" size="sm">{ap.daysWaiting}d waiting</Tag>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <ClickableTile
          className="esti-fill"
          style={edge(billingReady.length > 0 ? "ok" : "neutral")}
          onClick={() => navigate("/invoices")}
        >
          <Stack gap={4}>
            <div className="esti-row">
              <h4 className="esti-grow">Ready to bill</h4>
              <ArrowRight size={16} />
            </div>
            {homeLoading ? (
              <InlineLoading description="Loading…" />
            ) : (
              <Stack gap={3}>
                <h3>{billingReady.length}</h3>
                <p>
                  Phase{billingReady.length !== 1 ? "s" : ""} awaiting invoice ·{" "}
                  {formatINRShort(readyToBillSum)} estimated
                </p>
              </Stack>
            )}
          </Stack>
        </ClickableTile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(
            riskProjects.length > 0 || (hrEnabled && overloadedMembers.length > 0) ? "alert" : "ok",
          )}
        >
          <Stack gap={4}>
            <h4>{hrEnabled ? "Risk & capacity" : "Project risk"}</h4>
            <Stack gap={2}>
              <p className="esti-label">High-risk projects</p>
              {riskProjects.length === 0 ? (
                <p>None at risk.</p>
              ) : (
                riskProjects.slice(0, 2).map((p) => (
                  <p key={p.id}>
                    <Link to={`/projects/${p.id}`}>{p.ref}</Link> {p.title}
                  </p>
                ))
              )}
            </Stack>
            {hrEnabled && (
              <Stack gap={2}>
                <p className="esti-label">Capacity alerts</p>
                {overloadedMembers.length === 0 ? (
                  <p>No one overloaded.</p>
                ) : (
                  overloadedMembers.slice(0, 2).map((m) => (
                    <p key={m.assignee}>
                      {m.assignee} — {m.totalOpen} open, {m.overdueCount} overdue
                    </p>
                  ))
                )}
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={8} md={4} sm={4}>
        <ClickableTile
          className="esti-fill"
          style={edge(openTenders.length > 0 ? "watch" : "ok")}
          onClick={() => navigate("/office/tenders")}
        >
          <Stack gap={4}>
            <div className="esti-row">
              <h4 className="esti-grow">Open tenders</h4>
              <ArrowRight size={16} />
            </div>
            {homeLoading ? (
              <InlineLoading description="Loading…" />
            ) : openTenders.length === 0 ? (
              <p>No tenders awaiting bids.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {openTenders.slice(0, 4).map((t) => (
                    <StructuredListRow key={t.id}>
                      <StructuredListCell>
                        <Link to={`/office/tenders?tender=${t.id}`}>{t.title}</Link>
                        <p>
                          {t.projectRef} · {t.projectTitle}
                          {t.dueDate ? ` · due ${t.dueDate}` : ""}
                        </p>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </ClickableTile>
      </Column>

      <Column lg={8} md={4} sm={4}>
        <ClickableTile
          className="esti-fill"
          style={edge(openConstruction.length > 0 ? "watch" : "ok")}
          onClick={() => navigate("/office/construction")}
        >
          <Stack gap={4}>
            <div className="esti-row">
              <h4 className="esti-grow">Site coordination</h4>
              <ArrowRight size={16} />
            </div>
            {homeLoading ? (
              <InlineLoading description="Loading…" />
            ) : openConstruction.length === 0 ? (
              <p>No RFIs, submittals, or NCRs awaiting response.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {openConstruction.slice(0, 4).map((c) => (
                    <StructuredListRow key={c.id}>
                      <StructuredListCell>
                        <Link to="/office/construction">{c.subject}</Link>
                        <p>
                          {c.kind} · {c.contractorName} · {c.projectRef}
                        </p>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </ClickableTile>
      </Column>
    </>
  );
}
