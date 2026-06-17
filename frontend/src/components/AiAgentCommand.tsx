import { Button } from "@carbon/react";
import { Close } from "@carbon/icons-react";
import { AI_DRAFT_KIND_LABEL, AiDraftKind, can } from "@esti/contracts";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";
import type { AppTheme } from "../lib/theme-context.js";

type Props = {
  theme: AppTheme;
};

/** Floating AORMS agent — logo FAB opens a horizontal command bar (Alt+A). */
export function AiAgentCommand({ theme }: Props) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const canWrite = !!user && can(user.role, "write");
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<AiDraftKind>("SUMMARY");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const settingsQ = trpc.ai.settings.useQuery(undefined, { enabled: canWrite });
  const aiEnabled = settingsQ.data?.enabled ?? false;

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

  if (!canWrite) return null;

  const logoSrc = theme === "white" ? "/aorms-logo.png" : "/aorms-logo-white.png";

  function submitCommand() {
    const cmd = input.trim();
    if (!cmd || generate.isPending) return;
    if (!aiEnabled) {
      setError("AI Studio is disabled — enable in Company settings.");
      setInput("");
      return;
    }
    setError(null);
    setInput("");
    generate.mutate({ kind, projectId, prompt: cmd });
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
          <select
            id="ai-agent-kind"
            className="esti-ai-agent__kind"
            value={kind}
            aria-label="Draft type"
            onChange={(e) => setKind(e.target.value as AiDraftKind)}
          >
            {AiDraftKind.options.map((k) => (
              <option key={k} value={k}>
                {AI_DRAFT_KIND_LABEL[k]}
              </option>
            ))}
          </select>

          <span className="esti-ai-agent__prompt" aria-hidden>
            &gt;
          </span>

          <input
            ref={inputRef}
            type="text"
            className="esti-ai-agent__input"
            placeholder={
              projectId ? "Ask about this project…" : "Ask AORMS agent…"
            }
            value={input}
            disabled={generate.isPending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            aria-label="AI command"
            tabIndex={open ? 0 : -1}
          />

          <Button
            size="sm"
            className="esti-ai-agent__run"
            disabled={!input.trim() || generate.isPending}
            onClick={submitCommand}
            tabIndex={open ? 0 : -1}
          >
            Run
          </Button>

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
          aria-label="AORMS AI agent (Alt+A)"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <img src={logoSrc} alt="" className="esti-ai-agent__logo" />
        </button>
      </div>
    </div>
  );
}
