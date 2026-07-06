import TimerOutlined from "@mui/icons-material/TimerOutlined";
import { IconButton, Popover, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fmtPomTime, usePomodoro } from "../contexts/PomodoroContext.js";
import { PomodoroRing } from "./PomodoroRing.js";

/**
 * Focus-timer control for the dock — opens a floating dial panel (Alt+T) in a
 * portaled MUI Popover anchored above the button (so it is never clipped by the
 * dock's transform/overflow). Material UI.
 */
export function HeaderPomodoro() {
  const pom = usePomodoro();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pomActive = pom.running || (pom.timeLeft < pom.duration && pom.timeLeft > 0);
  const isFocus = pom.mode === "work";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Tooltip title={`Focus timer${pomActive ? ` · ${fmtPomTime(pom.timeLeft)}` : ""} (Alt+T)`}>
        <IconButton
          ref={btnRef}
          size="small"
          color={open ? "primary" : "default"}
          className={pomActive ? "esti-header-pom--active" : undefined}
          aria-label="Focus timer"
          onClick={() => setOpen((o) => !o)}
        >
          <TimerOutlined />
        </IconButton>
      </Tooltip>

      {pom.running && !open && (
        <span
          className={`esti-pom-running-timer${isFocus ? " esti-pom-running-timer--focus" : " esti-pom-running-timer--break"}`}
          aria-live="polite"
          aria-label={`Focus timer ${fmtPomTime(pom.timeLeft)}`}
        >
          {fmtPomTime(pom.timeLeft)}
        </span>
      )}

      <Popover
        open={open}
        anchorEl={btnRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{ paper: { sx: { width: 260, p: 2 } } }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle2">Focus timer</Typography>
          <PomodoroRing />
        </Stack>
      </Popover>
    </>
  );
}
