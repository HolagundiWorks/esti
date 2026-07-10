import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
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
import { DemoAdminUnlock } from "../DemoAdminUnlock.js";
import { WellnessPanel } from "../wellness/WellnessPanel.js";
import { WellnessReminderBanner } from "../wellness/WellnessReminderBanner.js";
import { useWellnessReminders } from "../wellness/useWellnessReminders.js";
import type { WellnessSection } from "../wellness/wellnessExercises.js";
import { WELLNESS_OPEN_EVENT } from "../wellness/wellnessExercises.js";
import { OfficeHealthGlyph } from "./OfficeHealthGlyph.js";
import { useOfficeHealth } from "./useOfficeHealth.js";

/**
 * Taskbar footer — glassmorphic bar (HCW-UI-Kit spatial model). Launcher
 * icons are round neumorphic chips on the frosted surface:
 *
 *   LEFT   — calculator · office health · task due.
 *   CENTER — Studio Intelligence · tasks · Search · **Ask ESTI** · wellbeing · pomodoro.
 *   RIGHT  — clock · alerts · ID · sign out.
 *
 * The top border carries the office-health signal (green/amber/red).
 */

/** Persistent chrome hit target — WCAG 2.5.8 / Fitts. */
const chromeIconSx = { width: 44, height: 44 };

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
  const [wellnessSection, setWellnessSection] = useState<WellnessSection>("breathe");
  const calcTriggerRef = useRef<HTMLButtonElement>(null);
  const wellnessTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: WellnessSection }>).detail;
      if (detail?.section) setWellnessSection(detail.section);
      setShowWellness(true);
    };
    window.addEventListener(WELLNESS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WELLNESS_OPEN_EVENT, onOpen);
  }, []);

  // Wellness reminders (hydration + firm breaks) run globally from the taskbar.
  useWellnessReminders();

  const { state, pendingTasks } = useOfficeHealth();
  const healthToken =
    state === "critical"
      ? "var(--cds-support-error)"
      : state === "watch"
      ? "var(--cds-support-warning)"
      : "var(--cds-support-success)";

  // Alt+C calculator · Ctrl/Cmd+K global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setShowCalc((o) => !o);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

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
            color={showCalc ? "primary" : "default"}
            onClick={() => setShowCalc((o) => !o)}
            aria-label="Calculator"
            sx={chromeIconSx}
          >
            <CalculateOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Office health: ${state}`}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", cursor: "pointer", pl: 0.5, minHeight: 44 }}
            onClick={() => navigate("/")}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/");
              }
            }}
            aria-label={`Office health: ${state}. Go to Studio Intelligence`}
          >
            <OfficeHealthGlyph state={state} variant="glass" title={state} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }} noWrap>{state}</Typography>
          </Stack>
        </Tooltip>
        {pendingTasks > 0 && (
          <Tooltip title="Open tasks due">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "pointer", pl: 0.5, minHeight: 44, display: "inline-flex", alignItems: "center" }}
              onClick={() => navigate("/tasks")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/tasks");
                }
              }}
            >
              {pendingTasks} due
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* CENTER — Studio · Tasks · Search · Ask ESTI · Wellness · Pomodoro */}
      <Stack
        direction="row"
        spacing={0.5}
        className="esti-app-footer__launcher-anchor"
        sx={{ alignItems: "center" }}
      >
        <Tooltip title="Studio Intelligence">
          <IconButton onClick={() => navigate("/")} aria-label="Studio Intelligence" color="primary" sx={chromeIconSx}>
            <AutoAwesome />
          </IconButton>
        </Tooltip>
        <Tooltip title="Tasks">
          <IconButton onClick={() => navigate("/tasks")} aria-label="Tasks" sx={chromeIconSx}>
            <TaskAltOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Search (Ctrl+K)">
          <IconButton onClick={() => navigate("/search")} aria-label="Search" sx={chromeIconSx}>
            <SearchOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ask ESTI (Alt+A)">
          <IconButton
            className="esti-app-footer__esti"
            onClick={() => window.dispatchEvent(new CustomEvent(ASK_ESTI_EVENT))}
            aria-label="Ask ESTI AI"
            sx={chromeIconSx}
          >
            <span className="esti-brand esti-brand--esti esti-ai-bar__mark" role="img" aria-label="ESTI" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Wellness — breathe, stretch, eyes">
          <IconButton
            ref={wellnessTriggerRef}
            color={showWellness ? "primary" : "default"}
            onClick={() => setShowWellness((o) => !o)}
            aria-label="Wellness"
            sx={chromeIconSx}
          >
            <SelfImprovement />
          </IconButton>
        </Tooltip>
        <HeaderPomodoro />
      </Stack>

      {/* RIGHT — system tray */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
        <TrayClock />
        <AlertsBell />
        <DemoAdminUnlock />
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton onClick={onSignOut} aria-label="Sign out" sx={chromeIconSx}>
            <PowerSettingsNew />
          </IconButton>
        </Tooltip>
      </Stack>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
      <WellnessReminderBanner />
      <WellnessPanel
        open={showWellness}
        onClose={() => setShowWellness(false)}
        triggerRef={wellnessTriggerRef}
        initialSection={wellnessSection}
      />
    </Box>
  );
}
