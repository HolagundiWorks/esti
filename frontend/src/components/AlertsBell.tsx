import {
  Button,
  HeaderGlobalAction,
  Modal,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { Notification, NotificationOff } from "@carbon/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

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
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const persist = (next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setDismissed(next);
  };
  const all = alertsQ.data ?? [];
  const alerts = all.filter((a) => !dismissed.includes(a.id));
  // Forget dismissals for alerts that no longer exist (keep the set small).
  const dismiss = (id: string) => persist([...new Set([...dismissed, id])]);
  const clearAll = () =>
    persist([...new Set([...dismissed, ...alerts.map((a) => a.id)])]);

  return (
    <>
      <HeaderGlobalAction
        aria-label="Alerts"
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Notification size={20} />
      </HeaderGlobalAction>
      <Modal
        open={open}
        modalHeading={`Alerts (${alerts.length})`}
        passiveModal
        size="sm"
        onRequestClose={() => setOpen(false)}
      >
        <Stack gap={5}>
          {alerts.length > 0 && (
            <Button kind="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          )}
          {alerts.length === 0 && (
            <Tile>
              <Stack gap={3}>
                <NotificationOff size={24} />
                <h3>Nothing needs attention</h3>
              </Stack>
            </Tile>
          )}
          {alerts.map((a) => (
            <Tile key={a.id}>
              <Stack gap={3}>
                <Tag
                  type={
                    a.severity === "high"
                      ? "red"
                      : a.severity === "medium"
                        ? "purple"
                        : "gray"
                  }
                >
                  {a.severity}
                </Tag>
                <Link
                  to={`/projects/${a.projectId}`}
                  onClick={() => setOpen(false)}
                >
                  {a.title}
                </Link>
                <p>
                  {a.detail} · {a.projectRef}
                </p>
                <Button kind="ghost" size="sm" onClick={() => dismiss(a.id)}>
                  Dismiss
                </Button>
              </Stack>
            </Tile>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
