import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import { useCallback, useEffect, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import {
  HCW_MARKDOWN_TOOL,
  REPO_CONVERT_STATUS_LABEL,
  REPO_SOURCE_STATUS_LABEL,
  type RepoConvertStatus,
  type RepoSourceCategory,
  type RepoSourceStatus,
} from "@esti/contracts";
import { EMOI, KNOWLEDGE_BANK_PORTAL } from "../lib/product-nomenclature.js";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

const CATEGORIES: { id: RepoSourceCategory; label: string }[] = [
  { id: "GENERAL", label: "General" },
  { id: "DESIGN", label: "Design" },
  { id: "STRUCTURE", label: "Structure" },
  { id: "MEP", label: "MEP" },
  { id: "COMPLIANCE", label: "Compliance" },
  { id: "MANAGEMENT", label: "Management" },
  { id: "OTHER", label: "Other" },
];

/** Status → StatusDot hue (dot + ink text — never a colour-filled chip). */
function statusColor(status: RepoSourceStatus): string {
  switch (status) {
    case "PUBLISHED": return "green";
    case "REVIEW": return "magenta";
    case "PROCESSING": return "blue";
    case "FAILED": return "red";
    default: return "gray";
  }
}

export function KnowledgeBankPortal() {
  const utils = trpc.useUtils();
  const listQ = trpc.knowledgeBankPortal.list.useQuery();
  const inv = () => utils.knowledgeBankPortal.list.invalidate();

  const create = trpc.knowledgeBankPortal.create.useMutation({ meta: { errorTitle: "Couldn't create the document" }, onSuccess: inv });
  const remove = trpc.knowledgeBankPortal.remove.useMutation({ meta: { errorTitle: "Couldn't delete the document" }, onSuccess: inv });
  const processEmoi = trpc.knowledgeBankPortal.processWithEmoi.useMutation({ meta: { errorTitle: "Couldn't process the document with EmOI" }, onSuccess: inv });
  const publish = trpc.knowledgeBankPortal.publish.useMutation({ meta: { errorTitle: "Couldn't publish the document" }, onSuccess: inv });
  const unpublish = trpc.knowledgeBankPortal.unpublish.useMutation({ meta: { errorTitle: "Couldn't unpublish the document" }, onSuccess: inv });
  const update = trpc.knowledgeBankPortal.update.useMutation({ meta: { errorTitle: "Couldn't update the document" }, onSuccess: inv });

  const { authorizedFetch } = useUploadAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailQ = trpc.knowledgeBankPortal.get.useQuery(
    { id: selectedId! },
    {
      enabled: !!selectedId,
      refetchInterval: (q) =>
        q.state.data?.convertStatus === "PROCESSING" ? 3000 : false,
    },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<RepoSourceCategory>("GENERAL");
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [editRawText, setEditRawText] = useState("");
  const [editDirty, setEditDirty] = useState(false);

  useEffect(() => {
    document.title = `${KNOWLEDGE_BANK_PORTAL.title} — ${EMOI.name}`;
  }, []);

  useEffect(() => {
    const d = detailQ.data;
    if (d?.markdownText != null || d?.rawText != null) {
      setEditRawText(d.markdownText ?? d.rawText ?? "");
      setEditDirty(false);
    }
  }, [detailQ.data?.id, detailQ.data?.markdownText, detailQ.data?.rawText]);

  const resetCreate = () => {
    setTitle("");
    setAuthor("");
    setCategory("GENERAL");
    setRawText("");
    setError(null);
  };

  const submitCreate = () => {
    setError(null);
    create.mutate(
      { title: title.trim(), author: author.trim() || undefined, category, rawText: rawText.trim() },
      {
        onSuccess: (row) => {
          setCreateOpen(false);
          resetCreate();
          setSelectedId(row.id);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const attachFile = async (sourceId: string, file: File) => {
    setUploadBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/repo-textbook", (fd) => {
        fd.append("sourceId", sourceId);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      await utils.knowledgeBankPortal.get.invalidate({ id: sourceId });
      inv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  const ingestLen = (detailQ.data?.markdownText ?? detailQ.data?.rawText ?? "").length;

  const runEmoi = useCallback(() => {
    if (!selectedId) return;
    setError(null);
    processEmoi.mutate(
      { id: selectedId },
      {
        onSuccess: () => utils.knowledgeBankPortal.get.invalidate({ id: selectedId }),
        onError: (e) => setError(e.message),
      },
    );
  }, [processEmoi, selectedId, utils.knowledgeBankPortal.get]);

  const commitPublish = useCallback(() => {
    if (!selectedId) return;
    publish.mutate({ id: selectedId }, {
      onSuccess: () => utils.knowledgeBankPortal.get.invalidate({ id: selectedId }),
    });
  }, [publish, selectedId, utils.knowledgeBankPortal.get]);

  // Dock contract: CENTER = create, RIGHT = commit; publish [] while the create
  // Dialog is open so the dock never fights DialogActions (HCW-UX §6).
  useScreenActions(
    createOpen
      ? []
      : [
          {
            id: "kb-add",
            zone: "center" as const,
            tone: "primary" as const,
            label: "Add textbook",
            icon: <AddIcon />,
            onClick: () => { resetCreate(); setCreateOpen(true); },
          },
          ...(selectedId && detailQ.data?.status === "DRAFT"
            ? [{
                id: "kb-emoi",
                zone: "right" as const,
                tone: "primary" as const,
                label: `Run ${EMOI.name}`,
                icon: <AutoStoriesOutlinedIcon />,
                onClick: runEmoi,
                disabled:
                  processEmoi.isPending
                  || detailQ.data?.convertStatus === "PROCESSING"
                  || ingestLen < 200,
              }]
            : []),
          ...(selectedId && detailQ.data?.status === "REVIEW"
            ? [{
                id: "kb-publish",
                zone: "right" as const,
                tone: "primary" as const,
                label: "Publish to ESTI",
                onClick: commitPublish,
                disabled: publish.isPending,
              }]
            : []),
        ],
    [
      createOpen,
      selectedId,
      detailQ.data?.status,
      detailQ.data?.convertStatus,
      processEmoi.isPending,
      publish.isPending,
      ingestLen,
      runEmoi,
      commitPublish,
    ],
  );

  const columns: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 1.2, minWidth: 180 },
    { field: "author", headerName: "Author", flex: 0.8, minWidth: 120 },
    { field: "category", headerName: "Category", width: 120 },
    {
      field: "status",
      headerName: "Status",
      width: 160,
      renderCell: (p) => (
        <StatusDot
          color={statusColor(p.value as RepoSourceStatus)}
          label={REPO_SOURCE_STATUS_LABEL[p.value as RepoSourceStatus] ?? p.value}
        />
      ),
    },
    { field: "sectionCount", headerName: "Sections", width: 90 },
    {
      field: "actions",
      headerName: "",
      width: 56,
      sortable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            { label: "Open", onClick: () => setSelectedId(p.row.id as string) },
            {
              label: "Delete",
              danger: true,
              disabled: remove.isPending,
              onClick: () => {
                remove.mutate({ id: p.row.id as string });
                if (selectedId === p.row.id) setSelectedId(null);
              },
            },
          ]}
        />
      ),
    },
  ];

  const detail = detailQ.data;

  return (
    <RailLayout
      title={KNOWLEDGE_BANK_PORTAL.title}
      description={KNOWLEDGE_BANK_PORTAL.summary}
      aside={
        <Typography variant="caption" color="text.secondary">
          PDFs convert to Markdown via the same pipeline as{" "}
          <Link href={HCW_MARKDOWN_TOOL.repoUrl} target="_blank" rel="noreferrer">
            {HCW_MARKDOWN_TOOL.name}
          </Link>
          ; {EMOI.name} ingests the markdown before publish to <strong>ESTI</strong>.
        </Typography>
      }
    >
      <PageBreadcrumb items={[{ label: "Library" }, { label: KNOWLEDGE_BANK_PORTAL.title }]} />
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ flex: "0 0 auto", minHeight: 240 }}>
          <DataState
            loading={listQ.isLoading}
            isEmpty={(listQ.data ?? []).length === 0}
            columnCount={1}
            empty={{
              title: "No reference sources",
              description: `Add a textbook. PDFs become Markdown, then ${EMOI.name} rephrases and summarises before you publish to ESTI.`,
            }}
          >
            <DataGrid
              rows={listQ.data ?? []}
              columns={columns}
              getRowId={(r) => r.id}
              onRowClick={(p) => setSelectedId(p.id as string)}
              rowSelectionModel={{ type: "include", ids: new Set(selectedId ? [selectedId] : []) }}
              disableRowSelectionOnClick={false}
              autoHeight
              hideFooter={(listQ.data ?? []).length <= 10}
              density="compact"
            />
          </DataState>
        </Box>

        {selectedId && detail && (
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                <Box className="esti-grow">
                  <h3>{detail.title}</h3>
                  {detail.author && <p className="esti-label esti-label--secondary">{detail.author}</p>}
                </Box>
                <StatusDot
                  size="md"
                  color={statusColor(detail.status as RepoSourceStatus)}
                  label={REPO_SOURCE_STATUS_LABEL[detail.status as RepoSourceStatus] ?? detail.status}
                />
                {detail.convertStatus && (
                  <StatusDot
                    color={detail.convertStatus === "FAILED" ? "red" : detail.convertStatus === "READY" ? "green" : "blue"}
                    label={REPO_CONVERT_STATUS_LABEL[detail.convertStatus as RepoConvertStatus] ?? detail.convertStatus}
                  />
                )}
              </Box>

              {detail.convertStatus === "PROCESSING" && (
                <Alert severity="info" icon={<CircularProgress size={16} />}>
                  Converting PDF to Markdown…
                </Alert>
              )}

              {detail.convertError && (
                <Alert severity="error">{detail.convertError}</Alert>
              )}

              {detail.executiveSummary && (
                <Box>
                  <h4>Executive summary</h4>
                  <p>{detail.executiveSummary}</p>
                </Box>
              )}

              {detail.status === "DRAFT" && (
                <Stack spacing={1}>
                  <h4>Source markdown</h4>
                  <TextField
                    multiline
                    minRows={8}
                    fullWidth
                    value={editRawText}
                    onChange={(e) => {
                      setEditRawText(e.target.value);
                      setEditDirty(true);
                    }}
                    disabled={detail.convertStatus === "PROCESSING"}
                    helperText="Paste or edit markdown (min 200 characters). PDF uploads convert automatically; .txt/.md import directly."
                  />
                  {editDirty && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        update.mutate(
                          { id: detail.id, rawText: editRawText.trim() },
                          { onSuccess: () => setEditDirty(false) },
                        );
                      }}
                      disabled={update.isPending || editRawText.trim().length < 200}
                    >
                      Save markdown
                    </Button>
                  )}
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Button variant="outlined" component="label" disabled={uploadBusy || detail.convertStatus === "PROCESSING"}>
                      Attach PDF / text file
                      <HiddenFileInput
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void attachFile(detail.id, f);
                          e.target.value = "";
                        }}
                      />
                    </Button>
                    {uploadBusy && <CircularProgress size={20} />}
                    {detail.fileUrl && (
                      <Button href={detail.fileUrl} target="_blank" rel="noreferrer">
                        View attachment
                      </Button>
                    )}
                  </Stack>
                  {/* “Run EmOI” lives in the ActionDock (RIGHT — commit); no inline duplicate. */}
                </Stack>
              )}

              {detail.processError && (
                <Alert severity="error">{detail.processError}</Alert>
              )}

              {(detail.sections ?? []).length > 0 && (
                <Box>
                  <h4>Library sections ({detail.sections.length})</h4>
                  <Stack spacing={2}>
                    {detail.sections.map((sec) => (
                      <Box key={sec.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                        <h4>{sec.title}</h4>
                        <p className="esti-label"><strong>Summary:</strong> {sec.summary}</p>
                        <p className="esti-label esti-label--secondary" style={{ whiteSpace: "pre-wrap" }}>
                          {sec.rephrased.slice(0, 600)}{sec.rephrased.length > 600 ? "…" : ""}
                        </p>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* “Publish to ESTI” lives in the ActionDock (RIGHT — commit); no inline duplicate. */}
              {detail.status === "PUBLISHED" && (
                <Button
                  variant="outlined"
                  onClick={() => unpublish.mutate({ id: detail.id }, {
                    onSuccess: () => utils.knowledgeBankPortal.get.invalidate({ id: detail.id }),
                  })}
                  disabled={unpublish.isPending}
                >
                  Unpublish
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Stack>

      <Dialog aria-labelledby="knowledge-bank-portal-source-title" open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle id="knowledge-bank-portal-source-title">Add textbook source</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Title" required fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField label="Author" fullWidth value={author} onChange={(e) => setAuthor(e.target.value)} />
            <TextField
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as RepoSourceCategory)}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Source text"
              required
              multiline
              minRows={10}
              fullWidth
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              helperText="Paste textbook content — stored as markdown for EmOI (minimum 200 characters)."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); resetCreate(); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={create.isPending || title.trim().length < 1 || rawText.trim().length < 200}
          >
            Add source
          </Button>
        </DialogActions>
      </Dialog>
    </RailLayout>
  );
}
