import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@esti/contracts";
import { useEffect, useState } from "react";
import { EstiAiExplainLabel } from "../AiCarbon.js";
import { trpc } from "../../lib/trpc.js";

export function AiStudioSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.ai.settings.useQuery();
  const [form, setForm] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      const { ollamaDefaultUrl: _, ...rest } = settingsQ.data;
      setForm(rest);
    }
  }, [settingsQ.data]);

  const save = trpc.ai.setSettings.useMutation({
    onSuccess: () => {
      utils.ai.settings.invalidate();
      setMsg("AI Studio settings saved");
    },
  });

  return (
    <Tile decorator={<EstiAiExplainLabel scope="draft" />} className="esti-ai-settings-tile">
      <Stack gap={5}>
        <h2>AI Studio</h2>
        <p>
          Drafts run on <strong>Ollama</strong> on your server — no cloud API keys or external
          integrations. Pull the model once: <code>ollama pull llama3.2</code>
        </p>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Ollama endpoint"
          subtitle={settingsQ.data?.ollamaDefaultUrl ?? "http://127.0.0.1:11434"}
        />
        {msg && (
          <InlineNotification kind="success" title="Saved" subtitle={msg} lowContrast onClose={() => setMsg(null)} />
        )}
        <Toggle
          id="ai-enabled"
          labelText="Enable AI Studio"
          labelB="On"
          labelA="Off"
          toggled={form.enabled}
          onToggle={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
        />
        <Select
          id="ai-provider"
          labelText="Provider"
          value={form.provider}
          onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiSettings["provider"] }))}
        >
          <SelectItem value="ollama" text="Ollama (on-server)" />
          <SelectItem value="mock" text="Template only (offline / demo)" />
        </Select>
        <TextInput
          id="ai-ollama-url"
          labelText="Ollama base URL"
          helperText="Docker service name, e.g. http://ollama:11434"
          value={form.ollamaBaseUrl ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value.trim() || undefined }))
          }
        />
        <TextInput
          id="ai-model"
          labelText="Ollama model name"
          helperText="Must match a model pulled on the server, e.g. llama3.2"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
        />
        <Toggle
          id="ai-redact"
          labelText="Redact PII in stored output"
          labelB="On"
          labelA="Off"
          toggled={form.redactPii}
          onToggle={(checked) => setForm((f) => ({ ...f, redactPii: checked }))}
        />
        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          {save.isPending ? "Saving…" : "Save AI settings"}
        </Button>
      </Stack>
    </Tile>
  );
}
