import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { pushToast } from "../../lib/toast.js";
import { EYE_ROUTINE } from "./wellnessExercises.js";

export function EyeExerciseGuide({
  running,
  onStop,
}: {
  running: boolean;
  onStop: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(EYE_ROUTINE[0]!.durationSec);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setStepIdx(0);
      setLeft(EYE_ROUTINE[0]!.durationSec);
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      let acc = 0;
      for (let i = 0; i < EYE_ROUTINE.length; i++) {
        const dur = EYE_ROUTINE[i]!.durationSec;
        if (elapsed < acc + dur) {
          setStepIdx(i);
          setLeft(Math.ceil(acc + dur - elapsed));
          raf.current = requestAnimationFrame(tick);
          return;
        }
        acc += dur;
      }
      onStop();
      pushToast({
        kind: "success",
        title: "Eye break complete",
        subtitle: "Screen strain eased — back to work when ready.",
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, onStop]);

  const step = EYE_ROUTINE[stepIdx]!;

  return (
    <Box sx={{ display: "grid", placeItems: "center", py: 1, width: 1 }}>
      <Box
        className={`esti-eye-glyph esti-eye-glyph--${step.key}${running ? " esti-eye-glyph--active" : ""}`}
        aria-hidden
      >
        <span className="esti-eye-glyph__iris" />
      </Box>
      <Typography variant="subtitle2" sx={{ mt: 1.5, textAlign: "center" }}>
        {step.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", px: 1 }}>
        {step.cue}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        {running ? `${left}s · step ${stepIdx + 1}/${EYE_ROUTINE.length}` : "Press play to begin"}
      </Typography>
    </Box>
  );
}
