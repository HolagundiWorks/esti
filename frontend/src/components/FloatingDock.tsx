import { Button, ProgressBar, Stack, Tag, Tile } from "@carbon/react";
import { Calculator, Close, Time } from "@carbon/icons-react";
import { useEffect, useState } from "react";
import {
  fmtPomTime,
  POMODORO_MODE_LABEL,
  POMODORO_MODE_TAG,
  usePomodoro,
  type PomodoroMode,
} from "../contexts/PomodoroContext.js";
import { FloatingCalculator } from "./FloatingCalculator.js";

/**
 * Floating dock pinned to the bottom of the left nav rail: a focus-timer and a
 * calculator, each opening a small floating widget. Pomodoro state is global
 * (PomodoroContext) so the timer keeps running when the widget is closed.
 */
export function FloatingDock() {
  const [showPom, setShowPom] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const pom = usePomodoro();

  // Alt+T toggles the timer, Alt+C the calculator.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "t" || e.key === "T") { e.preventDefault(); setShowPom((o) => !o); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setShowCalc((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="esti-dock">
        <Button
          hasIconOnly renderIcon={Time} size="sm"
          iconDescription={`Focus timer${pom.running ? ` · ${fmtPomTime(pom.timeLeft)}` : ""} (Alt+T)`}
          tooltipPosition="right"
          kind={showPom || pom.running ? "primary" : "ghost"}
          onClick={() => setShowPom((o) => !o)}
        />
        <Button
          hasIconOnly renderIcon={Calculator} size="sm"
          iconDescription="Calculator (Alt+C)" tooltipPosition="right"
          kind={showCalc ? "primary" : "ghost"}
          onClick={() => setShowCalc((o) => !o)}
        />
      </div>

      {showPom && <FloatingPomodoro onClose={() => setShowPom(false)} />}
      <FloatingCalculator open={showCalc} onClose={() => setShowCalc(false)} />
    </>
  );
}

function FloatingPomodoro({ onClose }: { onClose: () => void }) {
  const pom = usePomodoro();
  const pct = ((pom.duration - pom.timeLeft) / pom.duration) * 100;

  return (
    <Tile className="esti-float-widget">
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={3}>
          <Tag type={POMODORO_MODE_TAG[pom.mode]} size="sm">{POMODORO_MODE_LABEL[pom.mode]}</Tag>
          <div className="esti-grow" />
          <Button hasIconOnly renderIcon={Close} size="sm" kind="ghost" iconDescription="Close" onClick={onClose} />
        </Stack>
        <Stack orientation="horizontal" gap={2}>
          {(["work", "short", "long"] as PomodoroMode[]).map((m) => (
            <Button key={m} kind={pom.mode === m ? "primary" : "ghost"} size="sm" onClick={() => pom.switchMode(m)}>
              {POMODORO_MODE_LABEL[m]}
            </Button>
          ))}
        </Stack>
        <h1>{fmtPomTime(pom.timeLeft)}</h1>
        <ProgressBar label={POMODORO_MODE_LABEL[pom.mode]} value={pct} max={100} hideLabel />
        <Stack orientation="horizontal" gap={3}>
          <Button kind="primary" size="sm" onClick={pom.toggle}>
            {pom.running ? "Pause" : pom.timeLeft === pom.duration ? "Start" : "Resume"}
          </Button>
          <Button kind="ghost" size="sm" onClick={pom.reset}>Reset</Button>
        </Stack>
        {pom.sessions > 0 && <p>{pom.sessions} session{pom.sessions !== 1 ? "s" : ""} today</p>}
      </Stack>
    </Tile>
  );
}
