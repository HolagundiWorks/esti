import AccessTime from "@mui/icons-material/AccessTime";
import { IconButton, Paper, Stack } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fmtPomTime, usePomodoro } from "../contexts/PomodoroContext.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";
import { PomodoroRing } from "./PomodoroRing.js";
import { ScrollAffordance } from "./ScrollAffordance.js";

/** Header focus-timer control — opens a floating dial panel (Alt+T). Material UI. */
export function HeaderPomodoro() {
  const [open, setOpen] = useState(false);
  const pom = usePomodoro();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pomActive = pom.running || (pom.timeLeft < pom.duration && pom.timeLeft > 0);

  useDismissOnOutsideClick(open, () => setOpen(false), [panelRef, triggerRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isFocus = pom.mode === "work";

  return (
    <>
      <IconButton
        ref={triggerRef}
        size="small"
        color={open ? "primary" : "default"}
        aria-label={`Focus timer${pomActive ? ` · ${fmtPomTime(pom.timeLeft)}` : ""} (Alt+T)`}
        aria-expanded={open}
        aria-controls="esti-pom-panel"
        className={pomActive ? "esti-header-pom--active" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <AccessTime />
      </IconButton>

      {pom.running && !open && (
        <span
          className={`esti-pom-running-timer${isFocus ? " esti-pom-running-timer--focus" : " esti-pom-running-timer--break"}`}
          aria-live="polite"
          aria-label={`Focus timer ${fmtPomTime(pom.timeLeft)}`}
        >
          {fmtPomTime(pom.timeLeft)}
        </span>
      )}

      {open && (
        <div ref={panelRef} id="esti-pom-panel" className="esti-float-widget esti-float-pom-header">
          <Paper className="esti-float-panel-shell">
            <ScrollAffordance>
              <Stack spacing={2}>
                <h4>Focus timer</h4>
                <PomodoroRing />
              </Stack>
            </ScrollAffordance>
          </Paper>
        </div>
      )}
    </>
  );
}
