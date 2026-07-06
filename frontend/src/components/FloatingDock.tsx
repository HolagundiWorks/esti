import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import { Divider, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertsBell } from "./AlertsBell.js";
import { FloatingCalculator } from "./FloatingCalculator.js";
import { HeaderPomodoro } from "./HeaderPomodoro.js";
import { useOfficeHealth } from "./shell/useOfficeHealth.js";

/**
 * Floating glass dock — bottom-centred floating bar with a top border that signals
 * alert status (office health). Left→right: Studio Intelligence · Tasks · pomodoro ·
 * calculator · notifications · ESTI AI. Due dates + the office-health indicator live
 * in the footer; the module toggles moved into Studio Intelligence. Square icons.
 */
export function FloatingDock() {
  const navigate = useNavigate();
  const [showCalc, setShowCalc] = useState(false);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);

  const { state } = useOfficeHealth();

  const borderToken =
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
    <>
      <Paper
        elevation={0}
        className="esti-floating-dock"
        sx={{ borderTop: 2, borderTopColor: borderToken, height: 48, px: 1.5 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
          {/* Studio Intelligence — home dashboard lives on the dock now */}
          <Tooltip title="Studio Intelligence">
            <IconButton size="small" onClick={() => navigate("/")} aria-label="Studio Intelligence" color="primary">
              <AutoAwesome />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Tasks */}
          <Tooltip title="Tasks">
            <IconButton size="small" onClick={() => navigate("/tasks")} aria-label="Tasks">
              <TaskAltOutlined />
            </IconButton>
          </Tooltip>
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

          {/* Notifications */}
          <AlertsBell />

          <Divider orientation="vertical" flexItem />

          {/* ESTI AI agent — ESTI mark (neumorphic soft button) */}
          <Tooltip title="Ask ESTI">
            <IconButton
              className="esti-neu-btn"
              size="small"
              onClick={() => navigate("/office/ai-studio")}
              aria-label="Ask ESTI AI"
            >
              <span className="esti-brand esti-brand--esti" style={{ height: 20, width: 20 }} role="img" aria-label="ESTI" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
    </>
  );
}
