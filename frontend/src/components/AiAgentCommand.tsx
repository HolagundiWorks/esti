import Close from "@mui/icons-material/Close";
import Send from "@mui/icons-material/Send";
import {
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

type ChatTurn = { role: "user" | "assistant"; text: string };

/** Floating ESTI agent — same dialog UI as the landing page (Alt+A). */
export function AiAgentCommand() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const canUseAgent =
    !!user &&
    user.role !== "CLIENT" &&
    !(user.role === "CONSULTANT" && user.consultantId);

  const settingsQ = trpc.ai.settings.useQuery(undefined, { enabled: canUseAgent });
  const aiEnabled = settingsQ.data?.agentEnabled ?? settingsQ.data?.enabled ?? false;
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const generate = trpc.ai.generate.useMutation({
    onSuccess: (res) => {
      setTurns((t) => [...t, { role: "assistant", text: res.output }]);
    },
    onError: (err) => {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: `Could not answer: ${err.message}` },
      ]);
    },
  });

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, generate.isPending, open]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!canUseAgent) return null;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || generate.isPending) return;
    if (!aiEnabled) {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: "ESTI is unavailable — AI is not enabled for this firm." },
      ]);
      setInput("");
      return;
    }
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    generate.mutate({ kind: "SUMMARY", mode: "agent", projectId, prompt });
  }

  function handleInputKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className="esti-landing-ai__backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {open && (
        <div
          className="esti-landing-ai__cmd"
          role="dialog"
          aria-modal
          aria-label="Ask ESTI"
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1.5}
              className="esti-landing-ai__cmd-input-row"
              sx={{ alignItems: "center" }}
            >
              <TextField
                inputRef={inputRef}
                id="esti-agent-command"
                className="esti-grow"
                placeholder={
                  projectId
                    ? "Ask your office manager about this project…"
                    : "Ask your office manager — projects, invoices, tasks, deadlines…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKey}
                disabled={generate.isPending || settingsQ.isLoading}
              />
              <IconButton
                color="primary"
                aria-label="Send"
                onClick={() => submit()}
                disabled={!input.trim() || generate.isPending}
              >
                <Send />
              </IconButton>
              <IconButton aria-label="Close" onClick={() => setOpen(false)}>
                <Close />
              </IconButton>
            </Stack>

            {(turns.length > 0 || generate.isPending) && (
              <Stack spacing={1} className="esti-landing-ai__thread">
                {turns.map((t, i) => (
                  <Paper key={`${t.role}-${i}`} className="esti-landing-ai__turn" sx={{ p: 2 }}>
                    <Typography component="p" className="esti-landing-eyebrow">
                      {t.role === "user" ? "You" : "ESTI"}
                    </Typography>
                    <Typography variant="body2" component="p">{t.text}</Typography>
                  </Paper>
                ))}
                {generate.isPending && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Thinking…</Typography>
                  </Stack>
                )}
                <div ref={endRef} />
              </Stack>
            )}

            {turns.length === 0 && !generate.isPending && (
              <p className="esti-label esti-label--secondary">
                Ask ESTI anything — revisions, invoices, client status, upcoming deadlines, fees, or team workload.
              </p>
            )}
          </Stack>
        </div>
      )}

      <div className="esti-landing-ai">
        <IconButton
          className="esti-landing-ai__fab"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close ESTI" : "Ask ESTI (Alt+A)"}
          aria-expanded={open}
        >
          {open ? (
            <Close sx={{ fontSize: 20 }} aria-hidden />
          ) : (
            <img
              src="/esti-logo.png"
              alt=""
              aria-hidden
              className="esti-landing-ai__fab-logo"
            />
          )}
        </IconButton>
      </div>
    </>
  );
}
