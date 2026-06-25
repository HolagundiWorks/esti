import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import {
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from "@carbon/react";
import {
  Building,
  ChartLine,
  Finance,
  Task,
  UserAdmin,
  UserMultiple,
  View,
} from "@carbon/icons-react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

type Level = {
  id: string;
  badge: string;
  badgeColor: string;
  role: string;
  subtitle: string;
  capabilities: string[];
  plus: string;
  icon: ElementType;
};

const LEVELS: Level[] = [
  {
    id: "l1",
    badge: "L1",
    badgeColor: "#6929c4",
    role: "Principal / Owner",
    subtitle: "Full firm governance — every module, every number, every setting.",
    capabilities: [
      "Firm settings & branding",
      "User accounts & roles",
      "Salary & payroll",
      "Audit log",
      "System administration",
    ],
    plus: "Everything below",
    icon: UserAdmin,
  },
  {
    id: "l2",
    badge: "L2",
    badgeColor: "#1192e8",
    role: "Partner / Finance Lead",
    subtitle: "Financial operations, HR, and client billing — no firm settings.",
    capabilities: [
      "GST invoicing",
      "Fee proposals",
      "Reconciliation & POs",
      "HR leave & payroll ops",
      "GST / TDS reports",
    ],
    plus: "Everything below",
    icon: Finance,
  },
  {
    id: "l3",
    badge: "L3",
    badgeColor: "#005d5d",
    role: "Senior Architect",
    subtitle: "Full project delivery — drawings, specs, tenders, and approvals.",
    capabilities: [
      "Projects & drawings",
      "Tenders & bid review",
      "Authority records",
      "Knowledge Bank",
      "ASPRF performance",
    ],
    plus: "Everything below",
    icon: Building,
  },
  {
    id: "l4",
    badge: "L4",
    badgeColor: "#9f1853",
    role: "Associate / Site Supervisor",
    subtitle: "Day-to-day execution — clients, tasks, documents, and portal triage.",
    capabilities: [
      "Client records",
      "Tasks & site ops",
      "Documents & letters",
      "Client portal triage",
      "Consultant requests",
    ],
    plus: "Everything below",
    icon: UserMultiple,
  },
  {
    id: "l5",
    badge: "L5",
    badgeColor: "#b28600",
    role: "Junior / Intern",
    subtitle: "Personal task board and calendar. No financial or client data.",
    capabilities: [
      "Personal tasks",
      "Calendar",
      "Activity feed",
    ],
    plus: "",
    icon: Task,
  },
];

type Portal = {
  icon: ElementType;
  role: string;
  badge: string;
  description: string;
  access: string[];
};

const PORTALS: Portal[] = [
  {
    icon: View,
    role: "Client",
    badge: "Portal",
    description: "A scoped read-only window into the project they commissioned.",
    access: ["Progress updates", "Drawing approval", "Revision sign-off", "Fee status"],
  },
  {
    icon: ChartLine,
    role: "Consultant",
    badge: "Collaborator",
    description: "Scoped access to their engagement — RFIs, action items, and scope.",
    access: ["Engagement scope", "Site RFI responses", "Action item inbox", "Drawings issued"],
  },
  {
    icon: Finance,
    role: "Contractor",
    badge: "Bid Portal",
    description: "Magic-link tender access — submit bids, nothing more.",
    access: ["Tender documents", "Bill of quantities", "Bid submission"],
  },
];

export function MarketingAccessBand() {
  return (
    <LandingBand id="access" variant="muted" ariaLabelledby="access-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="access-title"
            eyebrow="Role-based access"
            title="Everyone on your team sees exactly what they need — nothing more."
            lead="Five internal levels from Principal to Intern, plus scoped portals for clients, consultants, and contractors. No greying out, no awkward workarounds — modules that shouldn't be visible simply aren't there."
          />

          {/* Internal hierarchy — structured list table */}
          <Stack gap={4}>
            <p className="esti-landing-eyebrow">Internal staff</p>
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Level</StructuredListCell>
                  <StructuredListCell head>Role</StructuredListCell>
                  <StructuredListCell head>Key access</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {LEVELS.map((level) => {
                  const Icon = level.icon;
                  return (
                    <StructuredListRow key={level.id}>
                      <StructuredListCell>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-03)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 36,
                              height: 36,
                              borderRadius: 4,
                              background: level.badgeColor,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: 0.5,
                              flexShrink: 0,
                            }}
                          >
                            {level.badge}
                          </span>
                          <Icon size={18} style={{ color: level.badgeColor }} aria-hidden />
                        </div>
                      </StructuredListCell>
                      <StructuredListCell>
                        <p style={{ fontWeight: 600, margin: 0, fontSize: "var(--cds-body-short-02-font-size)" }}>
                          {level.role}
                        </p>
                        <p className="esti-label esti-label--secondary" style={{ margin: 0, marginTop: 2 }}>
                          {level.subtitle}
                        </p>
                      </StructuredListCell>
                      <StructuredListCell>
                        <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
                          {level.capabilities.map((cap) => (
                            <Tag key={cap} type="gray" size="sm">
                              {cap}
                            </Tag>
                          ))}
                          {level.plus && (
                            <Tag type="outline" size="sm">
                              + {level.plus}
                            </Tag>
                          )}
                        </Stack>
                      </StructuredListCell>
                    </StructuredListRow>
                  );
                })}
              </StructuredListBody>
            </StructuredListWrapper>
          </Stack>

          {/* External portals */}
          <Stack gap={5}>
            <p className="esti-landing-eyebrow">External portals</p>
            <Grid fullWidth className="esti-landing-tile-grid">
              {PORTALS.map((portal) => {
                const Icon = portal.icon;
                return (
                  <Column key={portal.role} sm={4} md={8} lg={5}>
                    <Tile className="esti-fill">
                      <Stack gap={4}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--cds-spacing-03)",
                          }}
                        >
                          <Icon size={20} aria-hidden />
                          <Tag type="blue" size="sm">
                            {portal.badge}
                          </Tag>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {portal.role}
                          </span>
                        </div>
                        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
                          {portal.description}
                        </p>
                        <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
                          {portal.access.map((a) => (
                            <Tag key={a} type="gray" size="sm">
                              {a}
                            </Tag>
                          ))}
                        </Stack>
                      </Stack>
                    </Tile>
                  </Column>
                );
              })}
            </Grid>
          </Stack>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
