import Close from "@mui/icons-material/Close";
import Send from "@mui/icons-material/Send";
import {
  Box,
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

/** Window event that opens/toggles the Ask ESTI bar (dispatched by the taskbar footer). */
export const ASK_ESTI_EVENT = "esti:ask";

/**
 * Ask ESTI — a **floating command bar** (not a page). It floats above the dock,
 * follows the neumorphic soft-UI treatment (`esti-neu`), and opens from the dock
 * ESTI button (which dispatches `ASK_ESTI_EVENT`) or Alt+A. Esc / backdrop closes.
 */
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

  // Open/toggle from the dock ESTI button, plus Alt+A / Esc.
  useEffect(() => {
    const onAsk = () => setOpen((o) => !o);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(ASK_ESTI_EVENT, onAsk);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(ASK_ESTI_EVENT, onAsk);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!canUseAgent || !open) return null;

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
      {/* Backdrop — click to dismiss. */}
      <Box
        onClick={() => setOpen(false)}
        aria-hidden
        sx={{ position: "fixed", inset: 0, zIndex: 1290 }}
      />

      {/* Neumorphic command bar — floats above the dock on desktop, renders as a
          full page on mobile. */}
      <Paper
        className="esti-neu esti-ai-bar"
        role="dialog"
        aria-modal
        aria-label="Ask ESTI"
        sx={{
          position: "fixed",
          zIndex: 1301,
          overflowY: "auto",
          p: 2,
          top: { xs: 0, md: "auto" },
          right: { xs: 0, md: "auto" },
          bottom: { xs: 0, md: 104 },
          left: { xs: 0, md: "50%" },
          transform: { xs: "none", md: "translateX(-50%)" },
          width: { xs: "100%", md: "min(680px, 92vw)" },
          height: { xs: "100%", md: "auto" },
          maxHeight: { xs: "none", md: "60vh" },
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <span
              aria-hidden
              className="esti-brand esti-brand--esti esti-ai-bar__mark"
            />
            <TextField
              inputRef={inputRef}
              id="esti-agent-command"
              className="esti-grow"
              size="small"
              variant="standard"
              placeholder={
                projectId
                  ? "Ask ESTI about this project…"
                  : "Ask ESTI — projects, invoices, tasks, deadlines…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKey}
              disabled={generate.isPending || settingsQ.isLoading}
            />
            <IconButton
              className="esti-neu-btn"
              color="primary"
              aria-label="Send"
              onClick={() => submit()}
              disabled={!input.trim() || generate.isPending}
            >
              <Send fontSize="small" />
            </IconButton>
            <IconButton
              className="esti-neu-btn"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>

          {(turns.length > 0 || generate.isPending) && (
            <Stack spacing={1}>
              {turns.map((t, i) => (
                <Paper key={`${t.role}-${i}`} className="esti-neu-inset" sx={{ p: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">
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
            <Typography variant="body2" color="text.secondary">
              Ask ESTI anything — revisions, invoices, client status, upcoming
              deadlines, fees, or team workload.
            </Typography>
          )}
        </Stack>
      </Paper>
    </>
  );
}
