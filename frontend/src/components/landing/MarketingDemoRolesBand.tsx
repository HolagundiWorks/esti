import { Column, Grid, InlineLoading, Stack } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

const ROLE_LEVEL: Record<string, string> = {
  OWNER:      "L1",
  PARTNER:    "L2",
  SENIOR:     "L3",
  ASSOCIATE:  "L4",
  VIEWER:     "L5",
  CLIENT:     "CL",
  CONSULTANT: "CO",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER:      "Principal / Owner",
  PARTNER:    "Partner / Finance Lead",
  SENIOR:     "Senior Architect",
  ASSOCIATE:  "Associate / Site Supervisor",
  VIEWER:     "Junior / Intern",
  CLIENT:     "Client Portal",
  CONSULTANT: "Consultant Portal",
};

const ROLE_DESC: Record<string, string> = {
  OWNER:      "All modules — finances, team, firm settings, and audit log.",
  PARTNER:    "GST invoicing, fee proposals, HR, and reporting.",
  SENIOR:     "Full project delivery, drawings, tenders, and compliance.",
  ASSOCIATE:  "Clients, tasks, site work, and portal triage.",
  VIEWER:     "Personal task board, calendar, and activity feed only.",
  CLIENT:     "Scoped view of one project — drawings, approvals, and fee status.",
  CONSULTANT: "Engagement scope, RFI inbox, and issued drawing set.",
};

const LEVEL_ORDER: Record<string, number> = {
  OWNER: 1, PARTNER: 2, SENIOR: 3, ASSOCIATE: 4, VIEWER: 5, CLIENT: 6, CONSULTANT: 7,
};

const LEVEL_BG: Record<string, string> = {
  L1: "#6929c4",
  L2: "#1192e8",
  L3: "#005d5d",
  L4: "#9f1853",
  L5: "#b28600",
  CL: "#198038",
  CO: "#520408",
};

export function MarketingDemoRolesBand() {
  const [switching, setSwitching] = useState<string | null>(null);

  const demoUsersQ = trpc.auth.demoUsers.useQuery();
  const switchMut = trpc.auth.demoSwitch.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: () => setSwitching(null),
  });

  const users = [...(demoUsersQ.data ?? [])].sort(
    (a, b) => (LEVEL_ORDER[a.role] ?? 99) - (LEVEL_ORDER[b.role] ?? 99),
  );

  async function handleSwitch(email: string) {
    if (switching) return;
    setSwitching(email);
    switchMut.mutate({ email });
  }

  return (
    <LandingBand id="demo-roles" ariaLabelledby="demo-roles-title">
      <LandingEditorial>
        <Stack gap={8}>
          <MarketingSectionHead
            id="demo-roles-title"
            eyebrow="Try a specific role"
            title="Step into any seat in the studio."
            lead="See exactly what each team member sees — from the principal's full dashboard to the junior's task board and the client's scoped portal."
          />

          {demoUsersQ.isLoading ? (
            <InlineLoading description="Loading demo accounts…" />
          ) : (
            <Grid fullWidth className="esti-landing-tile-grid">
              {users.map((u) => {
                const level = ROLE_LEVEL[u.role] ?? "?";
                const levelBg = LEVEL_BG[level] ?? "#444";
                const name = u.fullName.split("(")[0]?.trim() ?? u.fullName;
                const roleLabel = ROLE_LABEL[u.role] ?? u.role;
                const desc = ROLE_DESC[u.role] ?? "";
                const isLoading = switching === u.email;
                const busy = !!switching;

                return (
                  <Column key={u.id} sm={4} md={4} lg={8}>
                      <button
                        onClick={() => handleSwitch(u.email)}
                        disabled={busy}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                          width: "100%",
                          height: "100%",
                          padding: "var(--cds-spacing-06)",
                          background: "var(--cds-layer-01)",
                          border: "none",
                          textAlign: "left",
                          cursor: busy ? (isLoading ? "wait" : "not-allowed") : "pointer",
                          opacity: busy && !isLoading ? 0.55 : 1,
                          transition: "background 0.1s",
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          boxSizing: "border-box",
                        }}
                      >
                        {/* Level badge */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 4,
                            background: levelBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                            letterSpacing: 0.3,
                          }}
                        >
                          {isLoading ? "…" : level}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            fontSize: "var(--cds-body-short-02-font-size)",
                            fontWeight: 600,
                            color: "var(--cds-text-primary)",
                            lineHeight: 1.35,
                          }}>
                            {name}
                          </p>
                          <p style={{
                            margin: "2px 0 6px",
                            fontSize: 11,
                            fontWeight: 500,
                            color: levelBg,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}>
                            {roleLabel}
                          </p>
                          <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
                            {isLoading ? "Opening…" : desc}
                          </p>
                        </div>

                        {/* Arrow */}
                        {!busy && (
                          <span style={{ color: "var(--cds-text-secondary)", fontSize: 18, marginTop: 2, flexShrink: 0 }}>
                            →
                          </span>
                        )}
                      </button>
                    </Column>
                  );
                })}
            </Grid>
          )}
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
