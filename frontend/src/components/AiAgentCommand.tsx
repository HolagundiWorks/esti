import { Close } from "@carbon/icons-react";
import {
  IconButton,
  InlineLoading,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { EstiAiExplainLabel } from "./AiCarbon.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";

/** Floating ESTI agent — Carbon for AI command bar (Alt+A). */
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
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiLoading = settingsQ.isLoading;

  const generate = trpc.ai.generate.useMutation({
    onSuccess: (res) => {
      setReply(res.output);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useDismissOnOutsideClick(open, () => setOpen(false), [rootRef, fabRef]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "a" || e.key === "A") {
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

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  if (!canUseAgent) return null;

  function submitCommand() {
    const cmd = input.trim();
    if (!cmd || generate.isPending) return;
    if (!aiEnabled) {
      setError(
        settingsQ.isError ?
          "Could not load AI settings — try refreshing the page."
        : "ESTI is unavailable — AI is not enabled for this firm.",
      );
      setInput("");
      return;
    }
    setError(null);
    setInput("");
    generate.mutate({ kind: "SUMMARY", mode: "agent", projectId, prompt: cmd });
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCommand();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const showReply = open && (reply || error || generate.isPending);

  return (
    <div
      ref={rootRef}
      className={`esti-ai-agent${open ? " esti-ai-agent--open" : ""}`}
      aria-label="ESTI AI assistant"
    >
      {showReply && (
        <Tile
          decorator={<EstiAiExplainLabel scope="agent" />}
          className={`esti-ai-agent__reply esti-motion-fade-in${error ? " esti-ai-agent__reply--error" : ""}`}
        >
          {generate.isPending ?
            <InlineLoading description="Thinking…" />
          : error ?
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="ESTI could not answer"
              subtitle={error}
            />
          : <p className="esti-ai-agent__reply-text">{reply}</p>}
        </Tile>
      )}

      <Stack orientation="horizontal" gap={3} className="esti-ai-agent__row">
        <div className={`esti-ai-agent__bar${open ? " esti-ai-agent__bar--open" : ""}`}>
          <TextInput
            ref={inputRef}
            id="esti-agent-command"
            labelText="Ask ESTI"
            hideLabel
            size="md"
            decorator={<EstiAiExplainLabel scope="agent" />}
            placeholder={
              projectId ?
                "Ask ESTI about this project (read-only)…"
              : "Ask ESTI about your office data (read-only)…"
            }
            value={input}
            disabled={generate.isPending || aiLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <IconButton
            kind="ghost"
            size="sm"
            label="Close ESTI"
            align="top-right"
            onClick={() => setOpen(false)}
          >
            <Close />
          </IconButton>
        </div>

        <IconButton
          ref={fabRef}
          kind="primary"
          size="lg"
          label="ESTI assistant (Alt+A)"
          className="esti-ai-agent__fab"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <img src="/esti-mark-white.png" alt="" className="esti-ai-agent__mark" aria-hidden />
        </IconButton>
      </Stack>
    </div>
  );
}
