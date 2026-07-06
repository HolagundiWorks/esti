import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AI_DRAFT_KIND_LABEL, AiDraftKind, can } from "@esti/contracts";
import { useState } from "react";
import { EstiAiExplainLabel } from "./AiCarbon.js";
import { PageHeader } from "./PageHeader.js";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../lib/auth.js";

const DRAFT_KINDS = AiDraftKind.options;

type Props = {
  projectId?: string;
  defaultKind?: AiDraftKind;
  compact?: boolean;
};

/** Inline AI draft generator — editable output, explicit approval only. */
export function AiDraftPanel({ projectId, defaultKind = "SUMMARY", compact }: Props) {
  const { user } = useAuth();
  const canWrite = !!user && can(user.role, "write");
  const settingsQ = trpc.ai.settings.useQuery(undefined, { enabled: canWrite });
  const draftsEnabled = settingsQ.data?.draftsEnabled ?? settingsQ.data?.enabled ?? false;
  const utils = trpc.useUtils();

  const [kind, setKind] = useState<AiDraftKind>(defaultKind);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [sources, setSources] = useState<{ label: string; entityType: string }[]>([]);

  const generate = trpc.ai.generate.useMutation({
    onSuccess: (res) => {
      setOutput(res.output);
      setRunId(res.runId);
      setSources(res.sources);
      utils.ai.listRuns.invalidate();
    },
  });
  const updateRun = trpc.ai.updateRun.useMutation({
    onSuccess: () => utils.ai.listRuns.invalidate(),
  });

  if (!canWrite) return null;
  if (user?.isDemo) {
    if (compact) return null;
    return (
      <Alert severity="info">
        <AlertTitle>Document drafts unavailable on demo</AlertTitle>
        Press Alt+A to open ESTI — read-only answers from live AORMS data.
      </Alert>
    );
  }
  if (settingsQ.data && !draftsEnabled) {
    return (
      <Alert severity="info">
        <AlertTitle>AI Studio disabled</AlertTitle>
        Owner can enable AI Studio under Company → AI settings.
      </Alert>
    );
  }

  const body = (
    <Stack spacing={2}>
      <TextField
        id="ai-kind"
        select
        label="Draft type"
        value={kind}
        onChange={(e) => setKind(e.target.value as AiDraftKind)}
        size={compact ? "small" : "medium"}
      >
        {DRAFT_KINDS.map((k) => (
          <MenuItem key={k} value={k}>
            {AI_DRAFT_KIND_LABEL[k]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        id="ai-prompt"
        label="Instructions (optional)"
        placeholder="e.g. emphasise billing for phase 2"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        size={compact ? "small" : "medium"}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <EstiAiExplainLabel scope="draft" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        variant="contained"
        size={compact ? "small" : "medium"}
        disabled={generate.isPending}
        onClick={() =>
          generate.mutate({
            kind,
            projectId,
            prompt: prompt || undefined,
          })
        }
      >
        {generate.isPending ? "Generating…" : "Generate draft"}
      </Button>
      {generate.error && (
        <Alert severity="error">
          <AlertTitle>Generation failed</AlertTitle>
          {generate.error.message}
        </Alert>
      )}
      {output && (
        <>
          <TextField
            id="ai-output"
            label="Editable draft"
            multiline
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={compact ? 10 : 14}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <EstiAiExplainLabel scope="draft" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              disabled={!runId || updateRun.isPending}
              onClick={() => runId && updateRun.mutate({ id: runId, output })}
            >
              Save edits
            </Button>
            <Button
              variant="text"
              size="small"
              disabled={!runId || updateRun.isPending}
              onClick={() => runId && updateRun.mutate({ id: runId, approvalState: "APPROVED" })}
            >
              Mark reviewed
            </Button>
          </Stack>
          {sources.length > 0 && (
            <Stack spacing={0.5}>
              <span className="esti-label">Sources</span>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                {sources.map((s, i) => (
                  <Chip
                    key={i}
                    size="small"
                    label={`${s.entityType}: ${s.label}`}
                    sx={{
                      backgroundColor: "var(--cds-tag-background-gray)",
                      color: "var(--cds-tag-color-gray)",
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
          <Alert severity="info">
            <AlertTitle>Draft only</AlertTitle>
            Copy into the target document and issue manually. No automatic transmission.
          </Alert>
        </>
      )}
    </Stack>
  );

  if (compact) return body;

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <h4 className="esti-ai-studio__title">AI draft assistant</h4>
          <EstiAiExplainLabel scope="draft" />
        </Stack>
        {body}
      </Stack>
    </Paper>
  );
}

export function AiStudioPage() {
  const { user } = useAuth();
  const runsQ = trpc.ai.listRuns.useQuery({ limit: 25 });
  const settingsQ = trpc.ai.settings.useQuery();

  if (user?.isDemo) {
    return (
      <>
        <PageHeader title="AI Studio" description="Permission-filtered drafts with source tracking and human approval" />
        <Alert severity="info">
          <AlertTitle>Document drafts unavailable on demo</AlertTitle>
          Press Alt+A anywhere in AORMS to open ESTI — it reads live data and suggests next steps (no uploads or auto-actions).
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title="AI Studio" description="Permission-filtered drafts with source tracking and human approval" />
      {!settingsQ.data?.enabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>AI Studio is off</AlertTitle>
          Enable under Company settings. Uses Ollama on your server — no API keys.
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <AiDraftPanel defaultKind="SUMMARY" />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <TableContainer component={Paper} sx={{ p: 2 }}>
            <Stack spacing={0.5} sx={{ mb: 1 }}>
              <Typography variant="h6" component="h4">Recent AI runs</Typography>
              <Typography variant="body2">Provenance: user, model, approval state</Typography>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kind</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>External</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(runsQ.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{AI_DRAFT_KIND_LABEL[r.kind as AiDraftKind] ?? r.kind}</TableCell>
                    <TableCell>
                      {r.provider}/{r.model}
                    </TableCell>
                    <TableCell>{r.approvalState}</TableCell>
                    <TableCell>{r.usedExternalApi === "true" ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </>
  );
}
