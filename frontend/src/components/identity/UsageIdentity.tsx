import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { USAGE_PING_INTERVAL_MS } from "@esti/contracts";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { welcomeKitUrl } from "../../lib/welcomeKit.js";

/**
 * Usage-earned AORMS identity (Phase 34).
 *
 * Heartbeats active app time while the tab is visible, and — once the account
 * crosses 100 hours — invites (never forces) the person to generate their
 * permanent AORMS-U handle. "Later" snoozes the invitation; Profile › AORMS
 * Identity keeps the progress bar and the generate button available.
 */
export function UsageIdentity() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const statusQ = trpc.usage.status.useQuery(undefined, {
    refetchInterval: USAGE_PING_INTERVAL_MS,
  });
  const ping = trpc.usage.ping.useMutation();
  const dismiss = trpc.usage.dismissIdPrompt.useMutation({
    onSuccess: () => utils.usage.status.invalidate(),
  });
  const generate = trpc.usage.generateAormsId.useMutation({
    onSuccess: () => {
      void utils.usage.status.invalidate();
      void utils.users.myProfile.invalidate();
    },
  });

  // Heartbeat — a ref keeps the effect mount-only while always calling the
  // latest mutate; only visible tabs credit time.
  const pingRef = useRef(ping.mutate);
  pingRef.current = ping.mutate;
  useEffect(() => {
    const send = () => {
      if (document.visibilityState === "visible") pingRef.current();
    };
    send();
    const timer = window.setInterval(send, USAGE_PING_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const [closed, setClosed] = useState(false);
  const s = statusQ.data;
  const generatedId = generate.data?.publicId ?? null;
  const open =
    !closed &&
    !!s &&
    s.canGenerate &&
    s.eligible &&
    !s.aormsId &&
    !s.promptDismissed;

  if (!open && !generatedId) return null;

  const hours = s ? Math.floor(s.minutes / 60) : 0;

  const handleClose = () => {
    setClosed(true);
    if (!generatedId) dismiss.mutate();
  };

  return (
    <Dialog
      open={open || (!closed && !!generatedId)}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="overline" component="span">AORMS identity</Typography>
          <span>{generatedId ? "Your AORMS ID is ready" : "Generate your AORMS ID"}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {generatedId ? (
          <Stack spacing={2}>
            <p>
              Your permanent AORMS identity handle is <strong>{generatedId}</strong>. It never
              changes — certifications and your professional growth record key to it. You can
              always find it under Profile › AORMS Identity.
            </p>
            <p>
              Your welcome kit is ready — a printable certificate and your ID card at
              credit-card size:
            </p>
            <div className="esti-row">
              <Button
                size="small"
                variant="outlined"
                href={welcomeKitUrl("certificate", { name: user?.fullName, id: generatedId })}
                target="_blank"
                rel="noopener"
              >
                Certificate
              </Button>
              <Button
                size="small"
                variant="outlined"
                href={welcomeKitUrl("card", { name: user?.fullName, id: generatedId })}
                target="_blank"
                rel="noopener"
              >
                ID card
              </Button>
            </div>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <p>
              You have crossed {hours} hours of active use in AORMS. That earns your permanent
              AORMS identity handle (AORMS-U-…) — a portable professional ID that never changes.
            </p>
            <p>
              Generate it now, or choose Later — the option stays available under Profile › AORMS
              Identity.
            </p>
            {generate.isError && (
              <Alert severity="error">
                Could not generate the ID — {generate.error.message}
              </Alert>
            )}
            {s && (
              <Stack spacing={0.5}>
                <Typography variant="body2">Active use</Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (Math.min(s.minutes, s.requiredMinutes) / s.requiredMinutes) * 100)}
                />
                <Typography variant="caption">
                  {`${hours} of ${Math.floor(s.requiredMinutes / 60)} hours`}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {!generatedId && (
          <Button variant="text" color="inherit" onClick={handleClose}>
            Later
          </Button>
        )}
        <Button
          variant="contained"
          disabled={generate.isPending}
          onClick={() => {
            if (generatedId) setClosed(true);
            else generate.mutate();
          }}
        >
          {generatedId ? "Done" : "Generate my AORMS ID"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
