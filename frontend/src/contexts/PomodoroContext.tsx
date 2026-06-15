import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type PomodoroMode = "work" | "short" | "long";

export const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  work: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

export const POMODORO_MODE_LABEL: Record<PomodoroMode, string> = {
  work: "Focus",
  short: "Short break",
  long: "Long break",
};

export const POMODORO_MODE_TAG: Record<PomodoroMode, "blue" | "green" | "teal"> = {
  work: "blue",
  short: "green",
  long: "teal",
};

export function fmtPomTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export type PomodoroState = {
  mode: PomodoroMode;
  timeLeft: number;
  running: boolean;
  sessions: number;
  /** Configured length (seconds) of the current mode — adjustable via the dial. */
  duration: number;
  durations: Record<PomodoroMode, number>;
  switchMode: (m: PomodoroMode) => void;
  toggle: () => void;
  reset: () => void;
  /** Set a mode's length (seconds); applies live when idle on that mode. */
  setDuration: (m: PomodoroMode, seconds: number) => void;
  /** Switch to a mode (resetting its clock if changing) and start running. */
  start: (m?: PomodoroMode) => void;
};

const PomodoroCtx = createContext<PomodoroState | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [durations, setDurations] = useState<Record<PomodoroMode, number>>({ ...POMODORO_DURATIONS });
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (tickRef.current) clearInterval(tickRef.current);
            setRunning(false);
            if (mode === "work") setSessions((n) => n + 1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, mode]);

  function switchMode(m: PomodoroMode) {
    if (tickRef.current) clearInterval(tickRef.current);
    setMode(m);
    setTimeLeft(durations[m]);
    setRunning(false);
  }

  function toggle() {
    setRunning((r) => !r);
  }

  function reset() {
    if (tickRef.current) clearInterval(tickRef.current);
    setTimeLeft(durations[mode]);
    setRunning(false);
  }

  function setDuration(m: PomodoroMode, seconds: number) {
    const secs = Math.max(60, Math.min(60 * 60, Math.round(seconds)));
    setDurations((d) => ({ ...d, [m]: secs }));
    // Live-apply only when idle on that mode (don't disrupt a running countdown).
    if (m === mode && !running) setTimeLeft(secs);
  }

  function start(m?: PomodoroMode) {
    if (m && m !== mode) {
      setMode(m);
      setTimeLeft(durations[m]);
    }
    setRunning(true);
  }

  return (
    <PomodoroCtx.Provider
      value={{ mode, timeLeft, running, sessions, duration: durations[mode], durations, switchMode, toggle, reset, setDuration, start }}
    >
      {children}
    </PomodoroCtx.Provider>
  );
}

export function usePomodoro(): PomodoroState {
  const ctx = useContext(PomodoroCtx);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}
