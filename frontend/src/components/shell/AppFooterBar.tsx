import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import SelfImprovement from "@mui/icons-material/SelfImprovement";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ASK_ESTI_EVENT } from "../AiAgentCommand.js";
import { AlertsBell } from "../AlertsBell.js";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { HeaderPomodoro } from "../HeaderPomodoro.js";
import { UserIdCard } from "../UserIdCard.js";
import { WellnessPanel } from "../wellness/WellnessPanel.js";
import { useWellnessReminders } from "../wellness/useWellnessReminders.js";
import { OfficeHealthGlyph } from "./OfficeHealthGlyph.js";
import { useOfficeHealth } from "./useOfficeHealth.js";

/**
 * Taskbar footer — glassmorphic bar (HCW-UI-Kit spatial model). Launcher
 * icons are round neumorphic chips on the frosted surface:
 *
 *   LEFT   — calculator · office health.
 *   CENTER — Studio Intelligence · tasks · **Ask ESTI** · wellbeing · pomodoro (fixed viewport centre).
 *   RIGHT  — clock · due-dates · alerts · ID · sign out.
 *
 * The top border carries the office-health signal (green/amber/red), taken over
 * from the retired floating dock.
 */
function TrayClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return (
    <Box className="esti-header-clock esti-app-footer__clock">
      <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
        {time}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.15 }}>
        {date}
      </Typography>
    </Box>
  );
}

export function AppFooterBar({
  planClass,
  onSignOut,
}: {
  planClass?: string;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [showCalc, setShowCalc] = useState(false);
  const [showWellness, setShowWellness] = useState(false);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);
  const wellnessTriggerRef = useRef<HTMLButtonElement>(null);

  // Wellness reminders (hydration + firm breaks) run globally from the taskbar.
  useWellnessReminders();

  const { state, pendingTasks, overdueInvoices } = useOfficeHealth();
  const healthToken =
    state === "critical"
      ? "var(--cds-support-error)"
      : state === "watch"
      ? "var(--cds-support-warning)"
      : "var(--cds-support-success)";

  // Alt+C toggles the calculator (kept from the previous dock).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setShowCalc((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Box
      component="footer"
      className={`esti-app-footer ${planClass ?? ""}`}
      sx={{ borderTop: 2, borderTopColor: healthToken }}
    >
      {/* LEFT — calculator · office health */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1 }}>
        <Tooltip title="Calculator (Alt+C)">
          <IconButton
            ref={calcTriggerRef}
            size="small"
            color={showCalc ? "primary" : "default"}
            onClick={() => setShowCalc((o) => !o)}
            aria-label="Calculator"
          >
            <CalculateOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Office health: ${state}`}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", cursor: "pointer", pl: 0.5 }}
            onClick={() => navigate("/")}
          >
            <OfficeHealthGlyph state={state} variant="glass" title={state} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }} noWrap>{state}</Typography>
          </Stack>
        </Tooltip>
      </Box>

      {/* CENTER — Studio Intelligence · tasks · Ask ESTI · wellbeing · pomodoro */}
      <Stack
        direction="row"
        spacing={0.5}
        className="esti-app-footer__launcher-anchor"
        sx={{ alignItems: "center" }}
      >
        <Tooltip title="Studio Intelligence">
          <IconButton size="small" onClick={() => navigate("/")} aria-label="Studio Intelligence" color="primary">
            <AutoAwesome />
          </IconButton>
        </Tooltip>
        <Tooltip title="Tasks">
          <IconButton size="small" onClick={() => navigate("/tasks")} aria-label="Tasks">
            <TaskAltOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ask ESTI (Alt+A)">
          <IconButton
            className="esti-app-footer__esti"
            size="small"
            onClick={() => window.dispatchEvent(new CustomEvent(ASK_ESTI_EVENT))}
            aria-label="Ask ESTI AI"
          >
            <span className="esti-brand esti-brand--esti esti-ai-bar__mark" role="img" aria-label="ESTI" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Wellness — breathe">
          <IconButton
            ref={wellnessTriggerRef}
            size="small"
            color={showWellness ? "primary" : "default"}
            onClick={() => setShowWellness((o) => !o)}
            aria-label="Wellness"
          >
            <SelfImprovement />
          </IconButton>
        </Tooltip>
        <HeaderPomodoro />
      </Stack>

      {/* RIGHT — system tray */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
        <TrayClock />
        {(pendingTasks > 0 || overdueInvoices > 0) && (
          <Tooltip title="Pending tasks · overdue invoices">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/tasks")}
            >
              {pendingTasks > 0 ? `${pendingTasks} due` : null}
              {pendingTasks > 0 && overdueInvoices > 0 ? " · " : null}
              {overdueInvoices > 0 ? `${overdueInvoices} inv` : null}
            </Typography>
          </Tooltip>
        )}
        <AlertsBell />
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onSignOut} aria-label="Sign out">
            <PowerSettingsNew />
          </IconButton>
        </Tooltip>
      </Stack>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
      <WellnessPanel
        open={showWellness}
        onClose={() => setShowWellness(false)}
        triggerRef={wellnessTriggerRef}
      />
    </Box>
  );
}
