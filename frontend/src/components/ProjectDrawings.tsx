import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Launch from "@mui/icons-material/Launch";
import {
  DRAWING_REVIEW_STATUS_LABEL,
  DRAWING_REVIEW_STATUS_TAG,
  DrawingReviewStatus,
  can,
} from "@esti/contracts";
import { useState } from "react";
import { DrawingIssueCell } from "./DrawingIssueCell.js";
import { StatusDot } from "./StatusTag.js";
import { useAuth } from "../lib/auth.js";
import { ESTICAD_DOWNLOAD_URL, esticadDrawingUrl, openEsticadDrawing } from "../lib/esticadLink.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

export function ProjectDrawings({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { authorizedFetch, uploadRequired } = useUploadAuth();
  const canUpload = !!user && can(user.role, "write");
  const canTakeoff = canUpload;
  const utils = trpc.useUtils();
  const [esticadHint, setEsticadHint] = useState<string | null>(null);
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      refetchInterval: (q) =>
        (q.state.data ?? []).some(
          (d) => d.status === "PENDING" || d.status === "PROCESSING",
        )
          ? 2000
          : false,
    },
  );

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setReviewStatus = trpc.drawings.setReviewStatus.useMutation({
    onSuccess: () => utils.drawings.listByProject.invalidate({ projectId }),
  });

  const [revFor, setRevFor] = useState<{ id: string; title: string } | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [revNote, setRevNote] = useState("");
  const [histId, setHistId] = useState<string | null>(null);
  const versionsQ = trpc.drawings.versions.useQuery(
    { id: histId ?? "" },
    { enabled: !!histId },
  );

  function launchEsticad(drawingId: string) {
    setEsticadHint(null);
    openEsticadDrawing(projectId, drawingId);
    const link = esticadDrawingUrl(projectId, drawingId);
    void navigator.clipboard?.writeText(link).catch(() => undefined);
    setEsticadHint(
      `Opening ESTICAD… If nothing happens, install ESTICAD and ensure you are signed in with your AORMS account. Link copied: ${link}`,
    );
  }

  async function postUpload(fd: FormData) {
    const res = await authorizedFetch("/upload/drawing", (form) => {
      for (const [key, value] of fd.entries()) {
        form.append(key, value);
      }
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`);
    }
    utils.drawings.listByProject.invalidate({ projectId });
  }

  async function upload() {
    if (!file || !title) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("title", title);
      fd.append("file", file);
      await postUpload(fd);
      setTitle("");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadRevision() {
    if (!revFile || !revFor) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("title", revFor.title);
      fd.append("rootId", revFor.id);
      if (revNote) fd.append("revisionNote", revNote);
      fd.append("file", revFile);
      await postUpload(fd);
      setRevFor(null);
      setRevFile(null);
      setRevNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const drawingColumns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 110 },
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) => (
        <div>
          {p.row.title}
          <div>{p.row.fileName}</div>
          {p.row.revisionNote && <div>“{p.row.revisionNote}”</div>}
        </div>
      ),
    },
    {
      field: "revNo",
      headerName: "Rev",
      width: 90,
      renderCell: (p) => (
        <StatusDot color={p.row.revNo > 1 ? "blue" : "gray"} label={`Rev ${p.row.revNo}`} />
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => (
        <div>
          <StatusDot color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
          {p.row.status === "FAILED" && p.row.errorText && <div>{p.row.errorText}</div>}
        </div>
      ),
    },
    { field: "entityCount", headerName: "Entities", width: 90 },
    {
      field: "takeoff",
      headerName: "Takeoff",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 170,
      renderCell: (p) => (
        <>
          {p.row.status === "READY" && canTakeoff && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Launch />}
              onClick={() => launchEsticad(p.row.id)}
            >
              Open in ESTICAD
            </Button>
          )}
          {p.row.status === "READY" && !canTakeoff && "—"}
        </>
      ),
    },
    {
      field: "review",
      headerName: "Review",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 170,
      renderCell: (p) =>
        canUpload ? (
          <TextField
            id={`dwg-review-${p.row.id}`}
            select
            size="small"
            aria-label="Review status"
            value={p.row.reviewStatus ?? "PENDING_REVIEW"}
            onChange={(e) =>
              setReviewStatus.mutate({
                id: p.row.id,
                reviewStatus: e.target.value as DrawingReviewStatus,
              })
            }
          >
            {DrawingReviewStatus.options.map((s) => (
              <MenuItem key={s} value={s}>{DRAWING_REVIEW_STATUS_LABEL[s]}</MenuItem>
            ))}
          </TextField>
        ) : (
          <StatusDot
            color={DRAWING_REVIEW_STATUS_TAG[(p.row.reviewStatus ?? "PENDING_REVIEW") as DrawingReviewStatus]}
            label={DRAWING_REVIEW_STATUS_LABEL[(p.row.reviewStatus ?? "PENDING_REVIEW") as DrawingReviewStatus]}
          />
        ),
    },
    {
      field: "issue",
      headerName: "Issue",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 150,
      renderCell: (p) =>
        p.row.status === "READY" ? (
          <Stack spacing={0.25}>
            <DrawingIssueCell drawingId={p.row.id} initialStatus={p.row.issuePdfStatus} />
            {(p.row.reviewStatus ?? "PENDING_REVIEW") !== "REVIEWED" && (
              <Typography variant="caption" color="warning.main">
                Not yet reviewed
              </Typography>
            )}
          </Stack>
        ) : null,
    },
    {
      field: "versions",
      headerName: "Versions",
      sortable: false,
      filterable: false,
      width: 170,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Button
            variant="text"
            size="small"
            onClick={() => setRevFor({ id: p.row.id, title: p.row.title })}
          >
            New rev
          </Button>
          <Button variant="text" size="small" onClick={() => setHistId(p.row.id)}>
            History
          </Button>
        </Stack>
      ),
    },
  ];

  const versionColumns: GridColDef[] = [
    { field: "revNo", headerName: "Rev", width: 90, renderCell: (p) => `Rev ${p.row.revNo}` },
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 110 },
    { field: "fileName", headerName: "File", flex: 1.4, minWidth: 160 },
    {
      field: "revisionNote",
      headerName: "Note",
      flex: 1.2,
      minWidth: 120,
      renderCell: (p) => p.row.revisionNote ?? "—",
    },
    {
      field: "isCurrent",
      headerName: "Current",
      width: 110,
      renderCell: (p) =>
        p.row.isCurrent ? <StatusDot color="green" label="Current" /> : "—",
    },
  ];

  return (
    <>
      <Typography variant="h6" component="h3" sx={{ mt: 4 }}>
        Drawings
      </Typography>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        <AlertTitle>Quantity takeoff in ESTICAD</AlertTitle>
        {canTakeoff
          ? "Upload DXF drawings here for the project register. Measure walls, slabs, and structural elements in the free ESTICAD desktop app — quantities sync to this project automatically."
          : "Drawings are listed here for issue control. Quantity takeoff is performed in ESTICAD by staff with write access."}
      </Alert>
      {canTakeoff && (
        <p className="esti-label">
          <a href={ESTICAD_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
            Download ESTICAD
          </a>
          {" · "}
          Sign in with your AORMS account, run <code>ESTILINK</code>, then open a drawing from the Takeoff column below.
        </p>
      )}
      {!canUpload && (
        <Alert severity="info">
          <AlertTitle>Upload not available</AlertTitle>
          Your role is read-only. Ask a project lead or sign in with an Associate (or higher) account to upload DXF drawings.
        </Alert>
      )}
      {canUpload && uploadRequired && user?.isDemo && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          <AlertTitle>Upload password required</AlertTitle>
          This demo has upload protection enabled — enter the upload password when prompted, same as a live firm.
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", my: 1.5 }}>
        <TextField
          id="dwg-title"
          label="Drawing title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ maxWidth: 280 }}
        />
        <Button variant="outlined" component="label" disabled={!canUpload}>
          {file ? file.name : "Choose DXF"}
          <HiddenFileInput
            type="file"
            accept=".dxf,.DXF,application/dxf,image/vnd.dxf,application/x-dxf"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />
        </Button>
        <Button
          variant="contained"
          disabled={!canUpload || !file || !title || busy}
          onClick={upload}
        >
          {busy ? "Uploading…" : "Upload drawing"}
        </Button>
      </Box>
      {canUpload && (
        <p className="esti-label esti-label--secondary">
          AutoCAD / Revit / SketchUp: export or Save As <strong>DXF</strong> (.dxf), not DWG.
          Processing runs in the background — status updates in a few seconds.
        </p>
      )}
      {error && (
        <Alert severity="error">
          <AlertTitle>Upload failed</AlertTitle>
          {error}
        </Alert>
      )}
      {esticadHint && (
        <Alert severity="info" onClose={() => setEsticadHint(null)}>
          <AlertTitle>ESTICAD</AlertTitle>
          {esticadHint}
        </Alert>
      )}

      <Stack spacing={0.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle1" component="h4">
          Uploaded drawings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          DXF register — open ESTICAD to measure quantities
        </Typography>
        <DataGrid
          rows={drawingsQ.data ?? []}
          columns={drawingColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          getRowHeight={() => "auto"}
        />
      </Stack>

      <Dialog
        open={!!revFor}
        onClose={() => {
          setRevFor(null);
          setRevFile(null);
          setRevNote("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{`Upload new revision — ${revFor?.title ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <p>
              The new DXF supersedes the current revision; the previous version is
              kept in history.
            </p>
            <Box>
              <Button variant="outlined" component="label">
                {revFile ? revFile.name : "Choose DXF"}
                <HiddenFileInput
                  type="file"
                  accept=".dxf"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRevFile(e.target.files?.[0] ?? null)
                  }
                />
              </Button>
            </Box>
            <TextField
              id="rev-note"
              label="Revision note (optional)"
              value={revNote}
              onChange={(e) => setRevNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            color="inherit"
            onClick={() => {
              setRevFor(null);
              setRevFile(null);
              setRevNote("");
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" disabled={!revFile || busy} onClick={uploadRevision}>
            {busy ? "Uploading…" : "Upload revision"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!histId} onClose={() => setHistId(null)} fullWidth maxWidth="md">
        <DialogTitle>Revision history</DialogTitle>
        <DialogContent>
          <DataGrid
            rows={versionsQ.data ?? []}
            columns={versionColumns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
