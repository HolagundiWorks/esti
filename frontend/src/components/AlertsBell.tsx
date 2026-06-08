import { HeaderGlobalAction } from "@carbon/react";
import { Notification, NotificationOff } from "@carbon/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

const SEV_COLOR: Record<string, string> = { high: "#da1e28", medium: "#8a3ffc" };
const KEY = "esti-dismissed-alerts";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** Header bell: alert count + a dropdown panel with per-item and clear-all dismiss. */
export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);
  const alertsQ = trpc.notifications.list.useQuery(undefined, { refetchInterval: 60000 });

  const persist = (next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setDismissed(next);
  };
  const all = alertsQ.data ?? [];
  const alerts = all.filter((a) => !dismissed.includes(a.id));
  // Forget dismissals for alerts that no longer exist (keep the set small).
  const dismiss = (id: string) => persist([...new Set([...dismissed, id])]);
  const clearAll = () => persist([...new Set([...dismissed, ...alerts.map((a) => a.id)])]);

  return (
    <>
      <HeaderGlobalAction aria-label="Alerts" isActive={open} onClick={() => setOpen((o) => !o)}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Notification size={20} />
          {alerts.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -8,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: "#da1e28",
                color: "#fff",
                fontSize: 10,
                lineHeight: "16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {alerts.length}
            </span>
          )}
        </span>
      </HeaderGlobalAction>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 48,
            right: 0,
            width: 380,
            maxHeight: "70vh",
            overflow: "auto",
            background: "var(--cds-layer, #fff)",
            color: "var(--cds-text-primary, #161616)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            zIndex: 9000,
            border: "1px solid var(--cds-border-subtle, #e0e0e0)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: "1px solid var(--cds-border-subtle, #e0e0e0)",
            }}
          >
            <strong>Alerts ({alerts.length})</strong>
            {alerts.length > 0 && (
              <button
                onClick={clearAll}
                style={{ background: "none", border: "none", color: "#0f62fe", cursor: "pointer", fontSize: 13 }}
              >
                Clear all
              </button>
            )}
          </div>

          {alerts.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--cds-text-secondary, #6f6f6f)" }}>
              <NotificationOff size={24} />
              <p style={{ marginTop: 8 }}>Nothing needs attention.</p>
            </div>
          )}

          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                borderBottom: "1px solid var(--cds-border-subtle, #e0e0e0)",
              }}
            >
              <span style={{ width: 4, alignSelf: "stretch", background: SEV_COLOR[a.severity] ?? "#8d8d8d" }} />
              <div style={{ flex: 1 }}>
                <Link to={`/projects/${a.projectId}`} onClick={() => setOpen(false)} style={{ fontWeight: 600 }}>
                  {a.title}
                </Link>
                <div style={{ fontSize: 12, color: "var(--cds-text-secondary, #6f6f6f)" }}>
                  {a.detail} · {a.projectRef}
                </div>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: "#6f6f6f", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
