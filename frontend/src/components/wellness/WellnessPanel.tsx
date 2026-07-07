import { Box, IconButton, Popover, Stack, Tooltip, Typography } from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Stop from "@mui/icons-material/Stop";
import Spa from "@mui/icons-material/Spa";
import CenterFocusStrong from "@mui/icons-material/CenterFocusStrong";
import Waves from "@mui/icons-material/Waves";
import AllInclusive from "@mui/icons-material/AllInclusive";
import { useEffect, useRef, useState, type RefObject, type ComponentType } from "react";
import { BREATHING_PATTERNS, breathingPattern, cycleSeconds, type BreathingPattern } from "@esti/contracts";
import { setWellnessPrefs, useWellnessPrefs } from "../../lib/wellnessPrefs.js";
import { pushToast } from "../../lib/toast.js";

type Props = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
};

const PHASE_LABEL: Record<string, string> = { in: "Breathe in", hold: "Hold", out: "Breathe out", holdOut: "Hold", idle: "Ready" };

/** One circular, icon-only button per pattern. */
const PATTERN_ICON: Record<string, ComponentType> = {
  relax: Spa,
  focus: CenterFocusStrong,
  anxiety: Waves,
  daily: AllInclusive,
};

/**
 * Wellness — a floating, square neumorphic breathing module. A big breath orb
 * expands on inhale, holds, and contracts on exhale at the selected pattern's
 * cadence; the pattern is chosen from a row of circular, icon-only buttons.
 */
export function WellnessPanel({ open, onClose, triggerRef }: Props) {
  const prefs = useWellnessPrefs();
  const [patternKey, setPatternKey] = useState(prefs.pattern);
  const [running, setRunning] = useState(false);
  const pattern = breathingPattern(patternKey);

  function choose(key: string) {
    setPatternKey(key);
    setWellnessPrefs({ pattern: key });
    setRunning(false);
  }

  return (
    <Popover
      open={open}
      anchorEl={triggerRef.current}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      slotProps={{ paper: { className: "esti-neu esti-wellness-panel", sx: { width: 300, p: 2.5 } } }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ alignSelf: "flex-start" }}>Breathe</Typography>

        <BreathGuide pattern={pattern} running={running} onStop={() => setRunning(false)} />

        {/* Pattern selector — circular, icon-only buttons */}
        <Stack direction="row" spacing={1.25} sx={{ justifyContent: "center" }}>
          {BREATHING_PATTERNS.map((p) => {
            const Icon = PATTERN_ICON[p.key] ?? Spa;
            const selected = p.key === patternKey;
            return (
              <Tooltip key={p.key} title={p.name}>
                <IconButton
                  className="esti-neu-btn"
                  onClick={() => choose(p.key)}
                  aria-label={p.name}
                  color={selected ? "primary" : "default"}
                  sx={selected ? { outline: 2, outlineColor: "primary.main", outlineOffset: 1 } : undefined}
                >
                  <Icon />
                </IconButton>
              </Tooltip>
            );
          })}
        </Stack>

        <IconButton
          className="esti-neu-btn"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Stop" : "Start"}
          size="large"
        >
          {running ? <Stop /> : <PlayArrow />}
        </IconButton>
      </Stack>
    </Popover>
  );
}

/** Cosine ease so the scale glides rather than snapping between phases. */
function ease(p: number): number {
  return (1 - Math.cos(Math.min(1, Math.max(0, p)) * Math.PI)) / 2;
}

function BreathGuide({ pattern, running, onStop }: { pattern: BreathingPattern; running: boolean; onStop: () => void }) {
  const [scale, setScale] = useState(0.55);
  const [phase, setPhase] = useState<string>("idle");
  const [phaseLeft, setPhaseLeft] = useState(0);
  const [sessionLeft, setSessionLeft] = useState(pattern.sessionSeconds);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setPhase("idle");
      setScale(0.55);
      setSessionLeft(pattern.sessionSeconds);
      return;
    }
    startRef.current = performance.now();
    const cyc = cycleSeconds(pattern);
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const remain = pattern.sessionSeconds - t;
      if (remain <= 0) {
        onStop();
        pushToast({ kind: "success", title: "Breathing session complete", subtitle: pattern.name });
        return;
      }
      setSessionLeft(Math.ceil(remain));
      const pos = t % cyc;
      const { inhale, hold, exhale } = pattern;
      if (pos < inhale) {
        setPhase("in"); setPhaseLeft(Math.ceil(inhale - pos)); setScale(0.55 + 0.45 * ease(pos / inhale));
      } else if (pos < inhale + hold) {
        setPhase("hold"); setPhaseLeft(Math.ceil(inhale + hold - pos)); setScale(1);
      } else if (pos < inhale + hold + exhale) {
        const p = (pos - inhale - hold) / exhale;
        setPhase("out"); setPhaseLeft(Math.ceil(inhale + hold + exhale - pos)); setScale(1 - 0.45 * ease(p));
      } else {
        setPhase("holdOut"); setPhaseLeft(Math.ceil(cyc - pos)); setScale(0.55);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, pattern, onStop]);

  const mm = Math.floor(sessionLeft / 60);
  const ss = String(sessionLeft % 60).padStart(2, "0");

  return (
    <Box sx={{ display: "grid", placeItems: "center", py: 1 }}>
      <Box className="esti-breath-orb" style={{ transform: `scale(${scale.toFixed(3)})` }}>
        <span className="esti-breath-orb__phase">{PHASE_LABEL[phase] ?? "Ready"}</span>
        {running && <span className="esti-breath-orb__count">{phaseLeft}</span>}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
        {running ? `${mm}:${ss} left` : "Press play to begin"}
      </Typography>
    </Box>
  );
}
