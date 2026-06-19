import { Chat, Close, Send } from "@carbon/icons-react";
import {
  Button,
  ComposedModal,
  IconButton,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalHeader,
  Stack,
  TextArea,
  Tile,
} from "@carbon/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { EstiAiExplainLabel } from "../AiCarbon.js";
import { trpc } from "../../lib/trpc.js";

const SESSION_KEY = "esti.landingAiSession";

function landingSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ?
        crypto.randomUUID()
      : `lp-${Date.now()}`;
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
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, ask.isPending, open]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || ask.isPending) return;
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    ask.mutate({ prompt, sessionId });
  }

  return (
    <div className="esti-landing-ai" aria-label="Ask ESTI about AORMS">
      <ComposedModal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        className="esti-landing-ai__modal"
      >
        <ModalHeader
          title="Ask ESTI about AORMS"
          label="Product guide for the AORMS ecosystem"
          closeModal={() => setOpen(false)}
        />
        <ModalBody>
          <Stack gap={5}>
            <EstiAiExplainLabel scope="landing" />
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
            <Stack gap={4} className="esti-landing-ai__thread">
              {turns.length === 0 && !ask.isPending && (
                <p>
                  Ask about modules, workflows, demos, CRIF, portals, ESTICAD, or what
                  AORMS does not do.
                </p>
              )}
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
            <form onSubmit={submit}>
              <Stack gap={4}>
                <TextArea
                  id="landing-ai-prompt"
                  labelText="Your question"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  disabled={ask.isPending || unavailable}
                />
                <Button
                  type="submit"
                  kind="primary"
                  renderIcon={Send}
                  disabled={!input.trim() || ask.isPending || unavailable}
                >
                  Ask ESTI
                </Button>
              </Stack>
            </form>
          </Stack>
        </ModalBody>
      </ComposedModal>

      <IconButton
        kind="primary"
        size="lg"
        label={open ? "Close ESTI" : "Ask ESTI about AORMS"}
        className="esti-landing-ai__fab"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <Close size={24} /> : <Chat size={24} />}
      </IconButton>
    </div>
  );
}
