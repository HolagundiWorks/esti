import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const DEMO_BAR_H = 64;

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

const LEVEL_BG: Record<string, string> = {
  L1: "#6929c4",
  L2: "#1192e8",
  L3: "#005d5d",
  L4: "#9f1853",
  L5: "#b28600",
  CL: "#198038",
  CO: "#520408",
};

export function DemoSwitcherBar({ currentUserId }: { currentUserId: string }) {
  const utils = trpc.useUtils();
  const demoUsersQ = trpc.auth.demoUsers.useQuery();
  const switchMut = trpc.auth.demoSwitch.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      window.location.href = "/";
    },
  });
  const [switching, setSwitching] = useState<string | null>(null);

  const users = demoUsersQ.data ?? [];
  if (users.length === 0) return null;

  async function handleSwitch(email: string) {
    if (switching) return;
    setSwitching(email);
    try {
      await switchMut.mutateAsync({ email });
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        height: DEMO_BAR_H,
        background: "#1c1c1c",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingInline: 16,
        boxSizing: "border-box",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      <span
        style={{
          color: "#888",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          whiteSpace: "nowrap",
          marginRight: 4,
          flexShrink: 0,
        }}
      >
        Demo
      </span>

      {users.map((u) => {
        const isActive = u.id === currentUserId;
        const isLoading = switching === u.email;
        const level = ROLE_LEVEL[u.role] ?? "??";
        const levelBg = LEVEL_BG[level] ?? "#444";
        const name = u.fullName.split("(")[0]?.trim() ?? u.fullName;
        const roleLabel = ROLE_LABEL[u.role] ?? u.role;

        return (
          <button
            key={u.id}
            disabled={isActive || !!switching}
            onClick={() => handleSwitch(u.email)}
            title={`${u.fullName} · ${roleLabel}\n${u.email}`}
            style={{
              display: "flex",
              alignItems: "stretch",
              height: 44,
              border: isActive
                ? "1.5px solid rgba(255,255,255,0.55)"
                : "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              overflow: "hidden",
              background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              cursor: isActive ? "default" : isLoading ? "wait" : "pointer",
              opacity: isLoading ? 0.55 : 1,
              transition: "border-color 0.12s, background 0.12s",
              flexShrink: 0,
              fontFamily: "'IBM Plex Sans', sans-serif",
              padding: 0,
            }}
          >
            {/* Level badge */}
            <div
              style={{
                width: 36,
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

            {/* Name + role */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingInline: 10,
                gap: 1,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}
              >
                {name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#aaa",
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}
              >
                {roleLabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
