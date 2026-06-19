import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
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
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="Document drafts unavailable on demo"
        subtitle="Press Alt+A to open ESTI — read-only answers from live AORMS data."
      />
    );
  }
  if (settingsQ.data && !draftsEnabled) {
    return (
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="AI Studio disabled"
        subtitle="Owner can enable AI Studio under Company → AI settings."
      />
    );
  }

  const body = (
    <Stack gap={5}>
      <Select
        id="ai-kind"
        labelText="Draft type"
        value={kind}
        onChange={(e) => setKind(e.target.value as AiDraftKind)}
        size={compact ? "sm" : "md"}
      >
        {DRAFT_KINDS.map((k) => (
          <SelectItem key={k} value={k} text={AI_DRAFT_KIND_LABEL[k]} />
        ))}
      </Select>
      <TextInput
        id="ai-prompt"
        labelText="Instructions (optional)"
        placeholder="e.g. emphasise billing for phase 2"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        size={compact ? "sm" : "md"}
        decorator={<EstiAiExplainLabel scope="draft" />}
      />
      <Button
        size={compact ? "sm" : "md"}
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
        <InlineNotification
          kind="error"
          lowContrast
          title="Generation failed"
          subtitle={generate.error.message}
        />
      )}
      {output && (
        <>
          <TextArea
            id="ai-output"
            labelText="Editable draft"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={compact ? 10 : 14}
            decorator={<EstiAiExplainLabel scope="draft" />}
          />
          <Stack orientation="horizontal" gap={3}>
            <Button
              kind="secondary"
              size="sm"
              disabled={!runId || updateRun.isPending}
              onClick={() => runId && updateRun.mutate({ id: runId, output })}
            >
              Save edits
            </Button>
            <Button
              kind="tertiary"
              size="sm"
              disabled={!runId || updateRun.isPending}
              onClick={() => runId && updateRun.mutate({ id: runId, approvalState: "APPROVED" })}
            >
              Mark reviewed
            </Button>
          </Stack>
          {sources.length > 0 && (
            <Stack gap={2}>
              <span className="esti-label">Sources</span>
              <Stack orientation="horizontal" gap={2}>
                {sources.map((s, i) => (
                  <Tag key={i} type="gray" size="sm">
                    {s.entityType}: {s.label}
                  </Tag>
                ))}
              </Stack>
            </Stack>
          )}
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Draft only"
            subtitle="Copy into the target document and issue manually. No automatic transmission."
          />
        </>
      )}
    </Stack>
  );

  if (compact) return body;

  return (
    <Tile decorator={<EstiAiExplainLabel scope="draft" />}>
      <h4 className="esti-ai-studio__title">AI draft assistant</h4>
      {body}
    </Tile>
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
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Document drafts unavailable on demo"
          subtitle="Press Alt+A anywhere in AORMS to open ESTI — it reads live data and suggests next steps (no uploads or auto-actions)."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="AI Studio" description="Permission-filtered drafts with source tracking and human approval" />
      {!settingsQ.data?.enabled && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="AI Studio is off"
          subtitle="Enable under Company settings. Uses Ollama on your server — no API keys."
        />
      )}
      <Grid narrow>
        <Column sm={4} md={4} lg={8}>
          <AiDraftPanel defaultKind="SUMMARY" />
        </Column>
        <Column sm={4} md={4} lg={8}>
        <TableContainer title="Recent AI runs" description="Provenance: user, model, approval state">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Provider</TableHeader>
                <TableHeader>State</TableHeader>
                <TableHeader>External</TableHeader>
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
        </Column>
      </Grid>
    </>
  );
}
