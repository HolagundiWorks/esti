import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { DrawingIssueCell } from "./DrawingIssueCell.js";
import { DrawingViewer } from "./DrawingViewer.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

export function ProjectDrawings({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const takeoffQ = trpc.measurements.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      // Poll while the worker is still chewing on any drawing.
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

  // Revision upload + history modals.
  const [revFor, setRevFor] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [revFile, setRevFile] = useState<File | null>(null);
  const [revNote, setRevNote] = useState("");
  const [histId, setHistId] = useState<string | null>(null);
  const versionsQ = trpc.drawings.versions.useQuery(
    { id: histId ?? "" },
    { enabled: !!histId },
  );

  async function postUpload(fd: FormData) {
    const res = await fetch("/upload/drawing", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`,
      );
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

  return (
    <>
      <h3 style={{ marginTop: 32 }}>Drawings &amp; takeoff</h3>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          margin: "12px 0",
        }}
      >
        <TextInput
          id="dwg-title"
          labelText="Drawing title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <FileUploaderButton
          labelText={file ? file.name : "Choose DXF"}
          accept={[".dxf"]}
          disableLabelChanges
          buttonKind="tertiary"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />
        <Button size="md" disabled={!file || !title || busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload & take off"}
        </Button>
      </div>
      {error && (
        <InlineNotification
          kind="error"
          title="Upload failed"
          subtitle={error}
          lowContrast
        />
      )}

      <TableContainer
        title="Uploaded drawings"
        description="ezdxf layer/entity takeoff"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Rev</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Entities</TableHeader>
              <TableHeader>View</TableHeader>
              <TableHeader>Issue</TableHeader>
              <TableHeader>Versions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(drawingsQ.data ?? []).map((d) => {
              return (
                <TableRow key={d.id}>
                  <TableCell>{d.ref}</TableCell>
                  <TableCell>
                    {d.title}
                    <div>{d.fileName}</div>
                    {d.revisionNote && <div>“{d.revisionNote}”</div>}
                  </TableCell>
                  <TableCell>
                    <Tag type={d.revNo > 1 ? "blue" : "gray"}>
                      Rev {d.revNo}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[d.status] ?? "gray"}>{d.status}</Tag>
                    {d.status === "FAILED" && d.errorText && (
                      <div>{d.errorText}</div>
                    )}
                  </TableCell>
                  <TableCell>{d.entityCount}</TableCell>
                  <TableCell>
                    {d.status === "READY" && (
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setViewerId(d.id)}
                      >
                        View / measure
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.status === "READY" && (
                      <DrawingIssueCell
                        drawingId={d.id}
                        initialStatus={d.issuePdfStatus}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setRevFor({ id: d.id, title: d.title })}
                      >
                        New rev
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setHistId(d.id)}
                      >
                        History
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {(takeoffQ.data ?? []).length > 0 && (
        <TableContainer
          title="Measured quantities (takeoff)"
          description="Calibrated measurements across this project's drawings"
          style={{ marginTop: 16 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Label</TableHeader>
                <TableHeader>Length</TableHeader>
                <TableHeader>Drawing</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(takeoffQ.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.label}</TableCell>
                  <TableCell>
                    {m.realLength.toFixed(1)} {m.unit}
                  </TableCell>
                  <TableCell>{m.drawingRef}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewerId && (
        <DrawingViewer
          drawingId={viewerId}
          projectId={projectId}
          open={!!viewerId}
          onClose={() => setViewerId(null)}
        />
      )}

      <Modal
        open={!!revFor}
        modalHeading={`Upload new revision — ${revFor?.title ?? ""}`}
        primaryButtonText={busy ? "Uploading…" : "Upload revision"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!revFile || busy}
        onRequestClose={() => {
          setRevFor(null);
          setRevFile(null);
          setRevNote("");
        }}
        onRequestSubmit={uploadRevision}
      >
        <Stack gap={5}>
          <p>
            The new DXF supersedes the current revision; the previous version is
            kept in history.
          </p>
          <FileUploaderButton
            labelText={revFile ? revFile.name : "Choose DXF"}
            accept={[".dxf"]}
            disableLabelChanges
            buttonKind="tertiary"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRevFile(e.target.files?.[0] ?? null)
            }
          />
          <TextInput
            id="rev-note"
            labelText="Revision note (optional)"
            value={revNote}
            onChange={(e) => setRevNote(e.target.value)}
          />
        </Stack>
      </Modal>

      <Modal
        open={!!histId}
        passiveModal
        modalHeading="Revision history"
        onRequestClose={() => setHistId(null)}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Rev</TableHeader>
              <TableHeader>Ref</TableHeader>
              <TableHeader>File</TableHeader>
              <TableHeader>Note</TableHeader>
              <TableHeader>Current</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(versionsQ.data ?? []).map((v) => (
              <TableRow key={v.id}>
                <TableCell>Rev {v.revNo}</TableCell>
                <TableCell>{v.ref}</TableCell>
                <TableCell>{v.fileName}</TableCell>
                <TableCell>{v.revisionNote ?? "—"}</TableCell>
                <TableCell>
                  {v.isCurrent ? (
                    <Tag type="green" size="sm">
                      Current
                    </Tag>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Modal>
    </>
  );
}
