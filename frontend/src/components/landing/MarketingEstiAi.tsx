import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import Send from "@mui/icons-material/Send";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { trpc } from "../../lib/trpc.js";

const SESSION_KEY = "esti.landingAiSession";

function landingSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `lp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `lp-${Date.now()}`;
  }
}

type ChatTurn = { role: "user" | "assistant"; text: string };

export function MarketingEstiAi() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const sessionId = useMemo(() => landingSessionId(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = trpc.marketing.askEsti.useMutation({
    onSuccess: (res) => {
      setTurns((t) => [...t, { role: "assistant", text: res.answer }]);
    },
  });

  const unavailable =
    ask.error?.data?.code === "SERVICE_UNAVAILABLE" ||
    ask.error?.message?.includes("resting");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, ask.isPending, open]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || ask.isPending) return;
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    ask.mutate({ prompt, sessionId });
  }

  function handleInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="esti-landing-ai__backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Command bar */}
      {open && (
        <div
          className="esti-landing-ai__cmd"
          role="dialog"
          aria-modal
          aria-label="Ask ESTI about AORMS"
        >
          <Stack spacing={2}>
            <div className="esti-landing-ai__cmd-input-row">
              <TextField
                inputRef={inputRef}
                id="landing-ai-prompt"
                aria-label="Ask ESTI"
                placeholder="What does your studio struggle with most — revisions, invoices, drawings?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKey}
                disabled={ask.isPending || unavailable}
                className="esti-grow"
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                aria-label="Send"
                onClick={() => submit()}
                disabled={!input.trim() || ask.isPending || unavailable}
              >
                <Send fontSize="small" />
              </Button>
              <Button
                variant="text"
                size="large"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <Close fontSize="small" />
              </Button>
            </div>

            {unavailable && (
              <Alert severity="warning">
                <AlertTitle>ESTI is resting</AlertTitle>
                AI is temporarily unavailable. Create a free account or email hi@aorms.in.
              </Alert>
            )}
            {ask.error && !unavailable && (
              <Alert severity="error">
                <AlertTitle>Could not get an answer</AlertTitle>
                {ask.error.message}
              </Alert>
            )}

            {(turns.length > 0 || ask.isPending) && (
              <div className="esti-landing-ai__thread">
                {turns.map((t, i) => (
                  <Paper key={`${t.role}-${i}`} className="esti-landing-ai__turn">
                    <p className="esti-landing-eyebrow">
                      {t.role === "user" ? "You" : "ESTI"}
                    </p>
                    <p>{t.text}</p>
                  </Paper>
                ))}
                {ask.isPending && (
                  <Stack direction="row" spacing={1}>
                    <CircularProgress size={16} />
                    <span>Thinking…</span>
                  </Stack>
                )}
                <div ref={endRef} />
              </div>
            )}

            {turns.length === 0 && !ask.isPending && (
              <p className="esti-label esti-label--secondary">
                Ask ESTI anything — how AORMS handles GST, client portals, drawing revisions, approvals, or whether it fits a small team.
              </p>
            )}
          </Stack>
        </div>
      )}

      {/* FAB — ESTI mark, white fill */}
      <div className="esti-landing-ai">
        <button
          className="esti-landing-ai__fab"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close ESTI" : "Ask ESTI about AORMS"}
          aria-expanded={open}
        >
          {open ? (
            <Close sx={{ fontSize: 20 }} aria-hidden />
          ) : (
            <span
              aria-hidden
              className="esti-landing-ai__fab-logo esti-brand esti-brand--esti"
              style={{ width: 24, height: 24 }}
            />
          )}
        </button>
      </div>
    </>
  );
}
