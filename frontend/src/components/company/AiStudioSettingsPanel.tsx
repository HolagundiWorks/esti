import {
  Alert,
  AlertTitle,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@esti/contracts";
import { useEffect, useState } from "react";
import { TYPE_SCALE } from "@hcw/ui-kit";
import { EstiAiExplainLabel } from "../AiCarbon.js";
import { trpc } from "../../lib/trpc.js";

export function AiStudioSettingsPanel({ isEnterprise: _isEnterprise = false }: { isEnterprise?: boolean }) {
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
    meta: { errorTitle: "Couldn't save the AI Studio settings" },
    onSuccess: () => {
      utils.ai.settings.invalidate();
      setMsg("AI Studio settings saved");
      setErr(null);
    },
    onError: (e) => { setErr(e.message); setMsg(null); },
  });

  const isCloud = form.provider === "cloud";
  // BYO API is available to all accounts (no tier gate).
  const showCloudOption = true;

  return (
    <Box className="esti-ai-settings-tile" sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" component="h2">AI Studio</Typography>
          <EstiAiExplainLabel scope="draft" />
        </Stack>
        <Typography variant="body2">
          Drafts run on <strong>Ollama</strong> on your server by default. Every account can
          plug in a <strong>BYO API key</strong> for any{" "}
          <strong>OpenAI-compatible provider</strong> (OpenAI, Azure OpenAI, Groq, Together AI,
          LM Studio, Ollama with{" "}
          <code>/v1</code>, etc.) — no extra tier required. Hosted Ollama usage is metered
          monthly; BYO-API calls are billed directly by your provider.
        </Typography>
        <Alert severity="info" sx={{ fontSize: TYPE_SCALE.body2 }}>
          <AlertTitle>OpenAI-compatible endpoint format</AlertTitle>
          Set the base URL to the path ending in <code>/v1</code>, e.g.{" "}
          <code>https://api.openai.com/v1</code> or{" "}
          <code>http://localhost:11434/v1</code> (Ollama). The API key field
          accepts any bearer token your provider issues.
        </Alert>
        <Alert severity="info">
          <AlertTitle>Ollama endpoint</AlertTitle>
          {settingsQ.data?.ollamaDefaultUrl ?? "http://127.0.0.1:11434"}
        </Alert>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
        <FormControlLabel
          control={
            <Switch
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
          }
          label="Enable AI Studio"
        />
        <TextField
          id="ai-provider"
          select
          label="Provider"
          value={form.provider}
          onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiSettings["provider"] }))}
          fullWidth
        >
          <MenuItem value="ollama">Ollama (on-server)</MenuItem>
          <MenuItem value="mock">Template only (offline / demo)</MenuItem>
          {showCloudOption && <MenuItem value="cloud">Cloud — bring your own API (OpenAI-compatible)</MenuItem>}
        </TextField>

        {!isCloud && (
          <>
            <TextField
              id="ai-ollama-url"
              label="Ollama base URL"
              helperText="Docker service name, e.g. http://ollama:11434"
              value={form.ollamaBaseUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value.trim() || undefined }))}
              fullWidth
            />
            <TextField
              id="ai-model"
              label="Ollama model name"
              helperText="Must match a model pulled on the server, e.g. llama3.2"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              fullWidth
            />
          </>
        )}

        {isCloud && (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <span className="esti-label--secondary">Bring-your-own AI provider (OpenAI-compatible)</span>
            </Stack>
            <TextField
              id="ai-cloud-url"
              label="Endpoint URL"
              helperText="OpenAI-compatible base ending in /v1, e.g. https://api.openai.com/v1"
              value={form.cloudBaseUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudBaseUrl: e.target.value.trim() || undefined }))}
              fullWidth
            />
            <TextField
              id="ai-cloud-model"
              label="Model id"
              helperText="e.g. gpt-4o-mini"
              value={form.cloudModel ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudModel: e.target.value.trim() || undefined }))}
              fullWidth
            />
            <TextField
              id="ai-cloud-key"
              type="password"
              label="API key"
              helperText={secretConfigured ? "A key is stored — leave blank to keep it." : "Stored at rest; never shown again."}
              value={form.cloudApiKey ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cloudApiKey: e.target.value || undefined }))}
              autoComplete="new-password"
              fullWidth
            />
          </>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={form.redactPii}
              onChange={(e) => setForm((f) => ({ ...f, redactPii: e.target.checked }))}
            />
          }
          label="Redact PII in stored output"
        />
        <Box>
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() => save.mutate({ ...form, cloudApiKey: form.cloudApiKey?.trim() ? form.cloudApiKey : undefined })}
          >
            {save.isPending ? "Saving…" : "Save AI settings"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
