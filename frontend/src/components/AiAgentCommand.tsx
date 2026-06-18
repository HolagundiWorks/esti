import { Close } from "@carbon/icons-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";

/** Floating ESTI agent — logo FAB opens a horizontal command bar (Alt+A). */
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
    <div ref={rootRef} className={`esti-ai-agent${open ? " esti-ai-agent--open" : ""}`}>
      {showReply && (
        <div
          className={`esti-ai-agent__reply${error ? " esti-ai-agent__reply--error" : ""}`}
          aria-live="polite"
        >
          {generate.isPending ?
            "Thinking…"
          : error ?
            error
          : reply}
        </div>
      )}

      <div className="esti-ai-agent__row">
        <div className={`esti-ai-agent__bar${open ? " esti-ai-agent__bar--open" : ""}`}>
          <span className="esti-ai-agent__prompt" aria-hidden>
            &gt;
          </span>

          <input
            ref={inputRef}
            type="text"
            className="esti-ai-agent__input"
            placeholder={
              projectId ?
                "Ask ESTI about this project (read-only)…"
              : "Ask ESTI about your office data (read-only)…"
            }
            value={input}
            disabled={generate.isPending || aiLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            aria-label="AI command"
            tabIndex={open ? 0 : -1}
          />

          <button
            type="button"
            className="esti-ai-agent__close"
            aria-label="Close agent"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            <Close size={16} />
          </button>
        </div>

        <button
          ref={fabRef}
          type="button"
          className="esti-ai-agent__fab"
          aria-label="ESTI assistant (Alt+A)"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="esti-ai-agent__logo" aria-hidden />
        </button>
      </div>
    </div>
  );
}
