import {
  Button,
  FileUploaderButton,
  InlineNotification,
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
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

export function ProjectDrawings({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      // Poll while the worker is still chewing on any drawing.
      refetchInterval: (q) =>
        (q.state.data ?? []).some((d) => d.status === "PENDING" || d.status === "PROCESSING")
          ? 2000
          : false,
    },
  );

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || !title) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("title", title);
      fd.append("file", file);
      const res = await fetch("/upload/drawing", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      setTitle("");
      setFile(null);
      utils.drawings.listByProject.invalidate({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h3 style={{ marginTop: 32 }}>Drawings &amp; takeoff</h3>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", margin: "12px 0" }}>
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
        <InlineNotification kind="error" title="Upload failed" subtitle={error} lowContrast />
      )}

      <TableContainer title="Uploaded drawings" description="ezdxf layer/entity takeoff">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Entities</TableHeader>
              <TableHeader>Layers</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(drawingsQ.data ?? []).map((d) => {
              const layers = (d.layers as { name: string; entityCount: number }[] | null) ?? [];
              return (
                <TableRow key={d.id}>
                  <TableCell>{d.ref}</TableCell>
                  <TableCell>
                    {d.title}
                    <div style={{ fontSize: 12, color: "#6f6f6f" }}>{d.fileName}</div>
                  </TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[d.status] ?? "gray"}>{d.status}</Tag>
                    {d.status === "FAILED" && d.errorText && (
                      <div style={{ fontSize: 12, color: "#da1e28" }}>{d.errorText}</div>
                    )}
                  </TableCell>
                  <TableCell>{d.entityCount}</TableCell>
                  <TableCell>
                    {layers.length === 0
                      ? "—"
                      : layers
                          .slice(0, 4)
                          .map((l) => `${l.name} (${l.entityCount})`)
                          .join(", ") + (layers.length > 4 ? ` +${layers.length - 4}` : "")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
