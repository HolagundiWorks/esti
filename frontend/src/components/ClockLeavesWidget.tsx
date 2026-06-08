import { Tile } from "@carbon/react";
import { Time } from "@carbon/icons-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";

/** Live clock + today's date + this user's remaining leave balance. */
export function ClockLeavesWidget() {
  const meQ = trpc.dashboard.me.useQuery();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const leave = meQ.data?.leave ?? null;

  return (
    <Tile style={{ height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--cds-text-secondary)" }}>
        <Time size={16} />
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>Today</span>
      </div>
      <div style={{ fontSize: "2.25rem", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {time}
      </div>
      <div style={{ color: "var(--cds-text-secondary)", marginBottom: 12 }}>{date}</div>
      {leave ? (
        <div style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Leave balance (this year)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {String(leave.remaining).padStart(2, "0")}
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--cds-text-secondary)" }}>
              {" "}
              / {String(leave.allowance).padStart(2, "0")} remaining
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{leave.used} day(s) taken</div>
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: 12, fontSize: 12, color: "var(--cds-text-secondary)" }}>
          No leave record linked to your login.
        </div>
      )}
    </Tile>
  );
}
