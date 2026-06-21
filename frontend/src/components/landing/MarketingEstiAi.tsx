import { Close, Send } from "@carbon/icons-react";
import {
  Button,
  InlineLoading,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
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
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4} className="esti-landing-ai__cmd-input-row">
              <TextInput
                ref={inputRef}
                id="landing-ai-prompt"
                labelText=""
                hideLabel
                placeholder="What does your studio struggle with most — revisions, invoices, drawings?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKey}
                disabled={ask.isPending || unavailable}
                size="lg"
                className="esti-grow"
              />
              <Button
                kind="primary"
                size="lg"
                renderIcon={Send}
                iconDescription="Send"
                hasIconOnly
                onClick={() => submit()}
                disabled={!input.trim() || ask.isPending || unavailable}
              />
              <Button
                kind="ghost"
                size="lg"
                renderIcon={Close}
                iconDescription="Close"
                hasIconOnly
                onClick={() => setOpen(false)}
              />
            </Stack>

            {unavailable && (
              <InlineNotification
                kind="warning"
                lowContrast
                title="ESTI is resting"
                subtitle="AI is temporarily unavailable. Try the live demo or email hi@aorms.in."
                hideCloseButton
              />
            )}
            {ask.error && !unavailable && (
              <InlineNotification
                kind="error"
                lowContrast
                title="Could not get an answer"
                subtitle={ask.error.message}
                hideCloseButton
              />
            )}

            {(turns.length > 0 || ask.isPending) && (
              <Stack gap={3} className="esti-landing-ai__thread">
                {turns.map((t, i) => (
                  <Tile key={`${t.role}-${i}`} className="esti-landing-ai__turn">
                    <p className="esti-landing-eyebrow">
                      {t.role === "user" ? "You" : "ESTI"}
                    </p>
                    <p>{t.text}</p>
                  </Tile>
                ))}
                {ask.isPending && <InlineLoading description="Thinking…" />}
                <div ref={endRef} />
              </Stack>
            )}

            {turns.length === 0 && !ask.isPending && (
              <p className="esti-label esti-label--secondary">
                Ask ESTI anything — how it handles GST, client portals, drawing revisions, BBMP compliance, or whether it fits a solo practice.
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
            <Close size={20} aria-hidden />
          ) : (
            <img
              src="/esti-mark-black.png"
              alt=""
              aria-hidden
              className="esti-landing-ai__fab-logo"
            />
          )}
        </button>
      </div>
    </>
  );
}
