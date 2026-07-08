import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import Logout from "@mui/icons-material/Logout";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import SelfImprovement from "@mui/icons-material/SelfImprovement";
import Settings from "@mui/icons-material/Settings";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import {
  Box,
  Divider,
  IconButton,
  InputAdornment,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ComponentType } from "react";
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

type AdminGroup = { heading: string; items: { label: string; to: string; icon?: ComponentType<any> }[] };

/**
 * Taskbar footer — the HCW-UI-Kit spatial model's bottom bar, designed like a
 * Windows taskbar (docs/esti/HCW-UI-KIT.md). It absorbs the former floating
 * dock's widgets:
 *
 *   LEFT   — launcher/widget icons (Studio Intelligence · Tasks · Wellness ·
 *            Pomodoro · Calculator · Alerts · ESTI AI) + the former right-side
 *            icons (admin menu · ID card · sign out).
 *   CENTER — open search.
 *   RIGHT  — the system tray: due-dates · office health · CLOCK.
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
  return <span className="esti-header-clock">{time} · {date}</span>;
}

export function AppFooterBar({
  planClass,
  adminGroups = [],
  onSignOut,
}: {
  planClass?: string;
  adminGroups?: AdminGroup[];
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [adminAnchor, setAdminAnchor] = useState<null | HTMLElement>(null);
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

  const runSearch = () => {
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };
  const goAdmin = (to: string) => { setAdminAnchor(null); navigate(to); };

  return (
    <Box
      component="footer"
      className={`esti-app-footer ${planClass ?? ""}`}
      sx={{ borderTop: 2, borderTopColor: healthToken }}
    >
      {/* LEFT — taskbar apps: the widget launchers + former right-side icons. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
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
        {/* Pomodoro + Calculator — desktop only; hidden on mobile. */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.5 }}>
          <HeaderPomodoro />
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
        </Box>
        <AlertsBell />
        <Tooltip title="Ask ESTI (Alt+A)">
          <IconButton
            className="esti-neu-btn"
            size="small"
            onClick={() => window.dispatchEvent(new CustomEvent(ASK_ESTI_EVENT))}
            aria-label="Ask ESTI AI"
          >
            <span className="esti-brand esti-brand--esti esti-ai-bar__mark" role="img" aria-label="ESTI" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {adminGroups.length > 0 && (
          <>
            <Tooltip title="Admin · Library · Third Parties">
              <IconButton
                size="small"
                onClick={(e) => setAdminAnchor(e.currentTarget)}
                aria-label="Admin menu"
              >
                <Settings />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={adminAnchor}
              open={Boolean(adminAnchor)}
              onClose={() => setAdminAnchor(null)}
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              transformOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
              {adminGroups.flatMap((g, gi) => [
                ...(gi > 0 ? [<Divider key={`d-${g.heading}`} />] : []),
                <ListSubheader key={`h-${g.heading}`} disableSticky sx={{ bgcolor: "transparent", lineHeight: 2.2 }}>
                  {g.heading}
                </ListSubheader>,
                // Text-only items, each divided by a hairline separator.
                ...g.items.map((it, ii) => (
                  <MenuItem
                    key={it.to}
                    onClick={() => goAdmin(it.to)}
                    sx={{
                      borderBottom: ii < g.items.length - 1 ? 1 : 0,
                      borderColor: "divider",
                    }}
                  >
                    {it.label}
                  </MenuItem>
                )),
              ])}
            </Menu>
          </>
        )}
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onSignOut} aria-label="Sign out">
            <Logout />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* CENTER — open search (Windows-11-style centred). */}
      <TextField
        className="esti-app-footer__search"
        size="small"
        variant="standard"
        placeholder="Search AORMS…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && runSearch()}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* RIGHT — system tray: due-dates · office health · clock. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
        <Tooltip title="Pending tasks · overdue invoices">
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/tasks")}
          >
            {pendingTasks} due{overdueInvoices > 0 ? ` · ${overdueInvoices} inv` : ""}
          </Typography>
        </Tooltip>
        <Tooltip title={`Office health: ${state}`}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <OfficeHealthGlyph state={state} size={12} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>{state}</Typography>
          </Stack>
        </Tooltip>
        <TrayClock />
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
