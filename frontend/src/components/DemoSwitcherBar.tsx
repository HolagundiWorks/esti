import { useState } from "react";
import { ChevronLeft, ChevronRight, Logout } from "@carbon/icons-react";
import { trpc } from "../lib/trpc.js";

const CARBON_HEADER_H = 48;
const COLLAPSED_W = 44;
const EXPANDED_W = 264;

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
  ASSOCIATE:  "Associate / Site",
  VIEWER:     "Junior / Intern",
  CLIENT:     "Client",
  CONSULTANT: "Consultant",
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

export function DemoSwitcherBar({
  currentUserId,
}: {
  currentUserId?: string;
  /** @deprecated no longer used — landing page bar removed */
  mode?: "aorms" | "landing";
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const demoUsersQ = trpc.auth.demoUsers.useQuery();
  const switchMut = trpc.auth.demoSwitch.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      window.location.href = "/";
    },
  });
  const logoutMut = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const users = [...(demoUsersQ.data ?? [])].sort(
    (a, b) => (LEVEL_ORDER[a.role] ?? 99) - (LEVEL_ORDER[b.role] ?? 99),
  );

  if (users.length === 0) return null;

  async function handleSwitch(email: string) {
    if (switching || logoutMut.isPending) return;
    setSwitching(email);
    try {
      await switchMut.mutateAsync({ email });
    } catch {
      setSwitching(null);
    }
  }

  const busy = !!switching || logoutMut.isPending;

  return (
    <div
      aria-label="Demo user switcher"
      style={{
        position: "fixed",
        right: 0,
        top: CARBON_HEADER_H,
        bottom: 0,
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: "width 0.18s ease",
        background: "#161616",
        borderLeft: "1px solid #2a2a2a",
        zIndex: 9500,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Collapse demo panel" : "Expand demo panel"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "space-between" : "center",
          width: "100%",
          height: 40,
          padding: expanded ? "0 12px" : "0",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid #2a2a2a",
          color: "#888",
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {expanded && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#666" }}>
            Demo
          </span>
        )}
        {expanded ? <ChevronRight size={14} aria-hidden /> : <ChevronLeft size={14} aria-hidden />}
      </button>

      {/* User list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          paddingBlock: 8,
          gap: expanded ? 2 : 6,
        }}
      >
        {users.map((u) => {
          const isActive = !!currentUserId && u.id === currentUserId;
          const isLoading = switching === u.email;
          const level = ROLE_LEVEL[u.role] ?? "?";
          const levelBg = LEVEL_BG[level] ?? "#444";
          const name = u.fullName.split("(")[0]?.trim() ?? u.fullName;
          const roleLabel = ROLE_LABEL[u.role] ?? u.role;

          if (!expanded) {
            /* Collapsed: level badge only */
            return (
              <button
                key={u.id}
                onClick={() => { setExpanded(true); }}
                title={`${name} · ${roleLabel}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  margin: "0 auto",
                  borderRadius: 4,
                  background: levelBg,
                  border: isActive ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  padding: 0,
                }}
              >
                {isLoading ? "…" : level}
              </button>
            );
          }

          /* Expanded: full user card */
          return (
            <button
              key={u.id}
              disabled={isActive || busy}
              onClick={() => handleSwitch(u.email)}
              title={`Switch to ${name}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 12px",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                borderLeft: isActive ? `3px solid ${levelBg}` : "3px solid transparent",
                cursor: isActive ? "default" : isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.55 : 1,
                textAlign: "left",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 3,
                  background: levelBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                  letterSpacing: 0.3,
                }}
              >
                {isLoading ? "…" : level}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
                  {name}
                </div>
                <div style={{ fontSize: 10, color: "#888", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                  {roleLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer: logout */}
      <div style={{ borderTop: "1px solid #2a2a2a", flexShrink: 0 }}>
        {expanded ? (
          <button
            onClick={() => logoutMut.mutate()}
            disabled={busy}
            title="Exit demo and return to landing page"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              color: logoutMut.isPending ? "#666" : "#e8614c",
              cursor: busy ? "wait" : "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
            }}
          >
            <Logout size={14} aria-hidden />
            {logoutMut.isPending ? "Signing out…" : "Exit demo"}
          </button>
        ) : (
          <button
            onClick={() => logoutMut.mutate()}
            disabled={busy}
            title="Exit demo"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 36,
              background: "transparent",
              border: "none",
              color: "#e8614c",
              cursor: busy ? "wait" : "pointer",
              padding: 0,
            }}
          >
            <Logout size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
