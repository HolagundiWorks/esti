import { Button, Stack } from "@mui/material";
import { useRef, useState } from "react";
import {
  fmtPomTime,
  POMODORO_MODE_LABEL,
  usePomodoro,
} from "../contexts/PomodoroContext.js";
import { StatusDot } from "./StatusTag.js";

const DIAL = { cx: 110, cy: 110, r: 86, vb: 220 };
const FOCUS = "var(--cds-support-success)";
const BREAK = "var(--cds-support-error)";

function dialPoint(frac: number): [number, number] {
  const a = (-90 + frac * 360) * (Math.PI / 180);
  return [DIAL.cx + DIAL.r * Math.cos(a), DIAL.cy + DIAL.r * Math.sin(a)];
}

function dialArc(frac: number): string {
  const f = Math.min(frac, 0.9999);
  const [sx, sy] = dialPoint(0);
  const [ex, ey] = dialPoint(f);
  return `M ${sx} ${sy} A ${DIAL.r} ${DIAL.r} 0 ${f > 0.5 ? 1 : 0} 1 ${ex} ${ey}`;
}

/**
 * Interactive Pomodoro dial: drag the knob to set minutes (green = focus,
 * red = break). Top half starts focus, bottom half break, centre toggles run.
 */
export function PomodoroRing() {
  const pom = usePomodoro();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const isBreak = pom.mode !== "work";
  const color = isBreak ? BREAK : FOCUS;

  const shownSecs = pom.running ? pom.timeLeft : pom.duration;
  const frac = Math.min(shownSecs / 3600, 1);
  const [hx, hy] = dialPoint(frac);

  function setFromPointer(e: { clientX: number; clientY: number }) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * DIAL.vb;
    const sy = ((e.clientY - rect.top) / rect.height) * DIAL.vb;
    const deg = Math.atan2(sy - DIAL.cy, sx - DIAL.cx) * (180 / Math.PI);
    let fromTop = (deg + 90) % 360;
    if (fromTop < 0) fromTop += 360;
    const minutes = Math.max(1, Math.min(60, Math.round((fromTop / 360) * 60)));
    pom.setDuration(pom.mode, minutes * 60);
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <StatusDot
          color={isBreak ? "red" : "green"}
          label={POMODORO_MODE_LABEL[pom.mode]}
        />
      </Stack>

      <div className="esti-pom-ring">
        <svg
          ref={svgRef}
          viewBox="0 0 220 220"
          width="200"
          height="200"
          role="img"
          aria-label="Pomodoro dial"
          style={{ touchAction: "none" }}
          onPointerMove={(e) => {
            if (dragging && !pom.running) setFromPointer(e);
          }}
          onPointerUp={(e) => {
            if (dragging) {
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              setDragging(false);
            }
          }}
        >
          <path
            d="M 24 110 A 86 86 0 0 1 196 110 Z"
            fill={FOCUS}
            opacity={isBreak ? 0.06 : 0.16}
            style={{ cursor: "pointer" }}
            onClick={() =>
              pom.running && !isBreak ? pom.toggle() : pom.start("work")
            }
          />
          <path
            d="M 24 110 A 86 86 0 0 0 196 110 Z"
            fill={BREAK}
            opacity={isBreak ? 0.16 : 0.06}
            style={{ cursor: "pointer" }}
            onClick={() =>
              pom.running && isBreak ? pom.toggle() : pom.start("short")
            }
          />

          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.r}
            fill="none"
            stroke="var(--cds-layer-accent)"
            strokeWidth="10"
          />
          <path
            d={dialArc(frac)}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            className={pom.running ? "esti-pom-ring--run" : undefined}
          />

          <line
            x1={DIAL.cx}
            y1={DIAL.cy}
            x2={hx}
            y2={hy}
            stroke={color}
            strokeWidth="3"
            opacity={0.5}
          />
          <circle
            cx={hx}
            cy={hy}
            r="11"
            fill={color}
            style={{ cursor: pom.running ? "not-allowed" : "grab" }}
            onPointerDown={(e) => {
              if (!pom.running) {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDragging(true);
              }
            }}
          />

          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r="46"
            fill="var(--cds-layer)"
            stroke="var(--cds-border-subtle)"
          />
          <text
            x={DIAL.cx}
            y={DIAL.cy - 4}
            textAnchor="middle"
            fontSize="26"
            fontWeight="600"
            fill="var(--cds-text-primary)"
          >
            {fmtPomTime(pom.timeLeft)}
          </text>
          <text
            x={DIAL.cx}
            y={DIAL.cy + 22}
            textAnchor="middle"
            fontSize="13"
            fill={color}
            style={{ cursor: "pointer" }}
            onClick={pom.toggle}
          >
            {pom.running ? "❚❚ Pause" : "▶ Start"}
          </text>
        </svg>
      </div>

      <Button variant="outlined" size="small" onClick={pom.reset}>
        Reset
      </Button>
    </Stack>
  );
}
