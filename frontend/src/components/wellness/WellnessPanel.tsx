import { Box, Divider, IconButton, Popover, Stack, Switch, TextField, Typography } from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Stop from "@mui/icons-material/Stop";
import { useEffect, useRef, useState, type RefObject } from "react";
import { BREATHING_PATTERNS, breathingPattern, cycleSeconds, type BreathingPattern } from "@esti/contracts";
import { setWellnessPrefs, useWellnessPrefs } from "../../lib/wellnessPrefs.js";
import { pushToast } from "../../lib/toast.js";
import { trpc } from "../../lib/trpc.js";

type Props = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
};

const PHASE_LABEL: Record<string, string> = { in: "Breathe in", hold: "Hold", out: "Breathe out", holdOut: "Hold" };

/**
 * Wellness — a floating neumorphic breathing module (five guided patterns) plus
 * the hydration-reminder toggle and the firm break schedule. Anchors above its
 * dock button. The breath orb expands on inhale, holds, and contracts on exhale
 * at the selected pattern's cadence; a session timer keeps the guidance running.
 */
export function WellnessPanel({ open, onClose, triggerRef }: Props) {
  const prefs = useWellnessPrefs();
  const [patternKey, setPatternKey] = useState(prefs.pattern);
  const [running, setRunning] = useState(false);
  const settingsQ = trpc.settings.get.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const wellness = (settingsQ.data as { wellness?: { snackBreak: string | null; lunchBreak: string | null } } | undefined)?.wellness;

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
      slotProps={{ paper: { className: "esti-neu", sx: { width: 300, p: 2.25 } } }}
    >
      <Stack spacing={1.75}>
        <Typography variant="subtitle2">Wellness · Breathe</Typography>

        {/* Pattern selector */}
        <Stack spacing={0.5}>
          {BREATHING_PATTERNS.map((p) => (
            <PatternRow key={p.key} p={p} selected={p.key === patternKey} onClick={() => choose(p.key)} />
          ))}
        </Stack>

        <BreathGuide pattern={pattern} running={running} onStop={() => setRunning(false)} />

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
          <IconButton
            className="esti-neu-btn"
            onClick={() => setRunning((r) => !r)}
            aria-label={running ? "Stop" : "Start"}
          >
            {running ? <Stop /> : <PlayArrow />}
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {pattern.inhale}s in · {pattern.hold > 0 ? `${pattern.hold}s hold · ` : ""}
            {pattern.exhale}s out · {pattern.durationLabel}
          </Typography>
        </Stack>

        <Divider flexItem />

        {/* Reminders */}
        <Stack spacing={1}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2">Hydration reminder</Typography>
            <Switch
              size="small"
              checked={prefs.hydrationEnabled}
              onChange={(e) => setWellnessPrefs({ hydrationEnabled: e.target.checked })}
            />
          </Stack>
          {prefs.hydrationEnabled && (
            <TextField
              type="number"
              size="small"
              label="Every (minutes)"
              value={prefs.hydrationMin}
              onChange={(e) => setWellnessPrefs({ hydrationMin: Math.max(1, Number(e.target.value) || 15) })}
              slotProps={{ htmlInput: { min: 1, max: 240 } }}
              sx={{ maxWidth: 140 }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {wellness?.snackBreak || wellness?.lunchBreak
              ? `Breaks: ${[wellness?.snackBreak && `snack ${wellness.snackBreak}`, wellness?.lunchBreak && `lunch ${wellness.lunchBreak}`].filter(Boolean).join(" · ")} (set by the firm)`
              : "Snack & lunch break times are set in the company profile."}
          </Typography>
        </Stack>
      </Stack>
    </Popover>
  );
}

function PatternRow({ p, selected, onClick }: { p: BreathingPattern; selected: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      className={selected ? "esti-neu-inset" : ""}
      sx={{
        textAlign: "left",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        px: 1,
        py: 0.6,
        font: "inherit",
        color: selected ? "primary.main" : "text.primary",
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.2 }}>
        {p.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">{p.goal}</Typography>
    </Box>
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
    <Box sx={{ display: "grid", placeItems: "center", py: 1.5 }}>
      <Box className="esti-breath-orb" style={{ transform: `scale(${scale.toFixed(3)})` }}>
        <span className="esti-breath-orb__phase">{PHASE_LABEL[phase] ?? "Ready"}</span>
        {running && <span className="esti-breath-orb__count">{phaseLeft}</span>}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25 }}>
        {running ? `${mm}:${ss} left` : "Press play to begin"}
      </Typography>
    </Box>
  );
}
