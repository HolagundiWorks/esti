import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@esti/contracts";
import { useEffect, useState } from "react";
import { EstiAiExplainLabel } from "../AiCarbon.js";
import { trpc } from "../../lib/trpc.js";

export function AiStudioSettingsPanel({ isEnterprise = false }: { isEnterprise?: boolean }) {
  const utils = trpc.useUtils();
  const settingsQ = trpc.ai.settings.useQuery();
  const [form, setForm] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      const d = settingsQ.data;
      setForm({
        enabled: d.enabled,
        provider: d.provider,
        model: d.model,
        ollamaBaseUrl: d.ollamaBaseUrl ?? undefined,
        cloudBaseUrl: d.cloudBaseUrl ?? undefined,
        cloudModel: d.cloudModel ?? undefined,
        cloudApiKey: undefined, // never returned — blank means "keep stored"
        redactPii: d.redactPii,
      });
      setSecretConfigured(d.cloudApiKeyConfigured);
    }
  }, [settingsQ.data]);

  const save = trpc.ai.setSettings.useMutation({
    onSuccess: () => {
      utils.ai.settings.invalidate();
      setMsg("AI Studio settings saved");
      setErr(null);
    },
    onError: (e) => { setErr(e.message); setMsg(null); },
  });

  const isCloud = form.provider === "cloud";
  const showCloudOption = isEnterprise || isCloud;

  return (
    <Tile decorator={<EstiAiExplainLabel scope="draft" />} className="esti-ai-settings-tile">
      <Stack gap={5}>
        <h2>AI Studio</h2>
        <p>
          Drafts run on <strong>Ollama</strong> on your server — no cloud keys. Enterprise firms
          may instead plug in their own <strong>OpenAI-compatible</strong> provider.
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
        {err && (
          <InlineNotification kind="error" title="Error" subtitle={err} lowContrast onClose={() => setErr(null)} />
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
          {showCloudOption && <SelectItem value="cloud" text="Cloud — bring your own API (OpenAI-compatible)" />}
        </Select>

        {!isCloud && (
          <>
            <TextInput
              id="ai-ollama-url"
              labelText="Ollama base URL"
              helperText="Docker service name, e.g. http://ollama:11434"
              value={form.ollamaBaseUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value.trim() || undefined }))}
            />
            <TextInput
              id="ai-model"
              labelText="Ollama model name"
              helperText="Must match a model pulled on the server, e.g. llama3.2"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
          </>
        )}

        {isCloud && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)" }}>
              <span className="esti-label--secondary">Bring-your-own AI provider</span>
              <Tag type="purple" size="sm">Enterprise</Tag>
            </div>
            <TextInput
              id="ai-cloud-url"
              labelText="Endpoint URL"
              helperText="OpenAI-compatible base ending in /v1, e.g. https://api.openai.com/v1"
              value={form.cloudBaseUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudBaseUrl: e.target.value.trim() || undefined }))}
            />
            <TextInput
              id="ai-cloud-model"
              labelText="Model id"
              helperText="e.g. gpt-4o-mini"
              value={form.cloudModel ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudModel: e.target.value.trim() || undefined }))}
            />
            <TextInput
              id="ai-cloud-key"
              type="password"
              labelText="API key"
              helperText={secretConfigured ? "A key is stored — leave blank to keep it." : "Stored at rest; never shown again."}
              value={form.cloudApiKey ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudApiKey: e.target.value || undefined }))}
            />
          </>
        )}

        <Toggle
          id="ai-redact"
          labelText="Redact PII in stored output"
          labelB="On"
          labelA="Off"
          toggled={form.redactPii}
          onToggle={(checked) => setForm((f) => ({ ...f, redactPii: checked }))}
        />
        <Button disabled={save.isPending} onClick={() => save.mutate({ ...form, cloudApiKey: form.cloudApiKey?.trim() ? form.cloudApiKey : undefined })}>
          {save.isPending ? "Saving…" : "Save AI settings"}
        </Button>
      </Stack>
    </Tile>
  );
}
