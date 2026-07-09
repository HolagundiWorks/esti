import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { pushToast } from "../../lib/toast.js";
import { STRETCH_ROUTINE } from "./wellnessExercises.js";

export function StretchGuide({
  running,
  onStop,
}: {
  running: boolean;
  onStop: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(STRETCH_ROUTINE[0]!.durationSec);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setStepIdx(0);
      setLeft(STRETCH_ROUTINE[0]!.durationSec);
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      let acc = 0;
      for (let i = 0; i < STRETCH_ROUTINE.length; i++) {
        const dur = STRETCH_ROUTINE[i]!.durationSec;
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
        title: "Stretch break complete",
        subtitle: "Nice — your body will thank you.",
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, onStop]);

  const step = STRETCH_ROUTINE[stepIdx]!;

  return (
    <Box sx={{ display: "grid", placeItems: "center", py: 1, width: 1 }}>
      <Box
        className={`esti-stretch-glyph esti-stretch-glyph--${step.key}${running ? " esti-stretch-glyph--active" : ""}`}
        aria-hidden
      />
      <Typography variant="subtitle2" sx={{ mt: 1.5, textAlign: "center" }}>
        {step.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", px: 1 }}>
        {step.cue}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        {running ? `${left}s · step ${stepIdx + 1}/${STRETCH_ROUTINE.length}` : "Press play to begin"}
      </Typography>
    </Box>
  );
}
