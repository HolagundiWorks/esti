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
  switchMode: (m: PomodoroMode) => void;
  toggle: () => void;
  reset: () => void;
};

const PomodoroCtx = createContext<PomodoroState | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PomodoroMode>("work");
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
    setTimeLeft(POMODORO_DURATIONS[m]);
    setRunning(false);
  }

  function toggle() {
    setRunning((r) => !r);
  }

  function reset() {
    if (tickRef.current) clearInterval(tickRef.current);
    setTimeLeft(POMODORO_DURATIONS[mode]);
    setRunning(false);
  }

  return (
    <PomodoroCtx.Provider value={{ mode, timeLeft, running, sessions, switchMode, toggle, reset }}>
      {children}
    </PomodoroCtx.Provider>
  );
}

export function usePomodoro(): PomodoroState {
  const ctx = useContext(PomodoroCtx);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}
