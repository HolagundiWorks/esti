import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
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
  TextInput,
} from "@carbon/react";
import { Launch } from "@carbon/icons-react";
import { can, takeoffElement } from "@esti/contracts";
import { useState } from "react";
import { DrawingIssueCell } from "./DrawingIssueCell.js";
import { useAuth } from "../lib/auth.js";
import { ESTICAD_DOWNLOAD_URL, esticadDrawingUrl, openEsticadDrawing } from "../lib/esticadLink.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

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
  const takeoffQ = trpc.measurements.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
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

  const [revFor, setRevFor] = useState<{ id: string; title: string } | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [revNote, setRevNote] = useState("");
  const [histId, setHistId] = useState<string | null>(null);
  const [takeoffEstOpen, setTakeoffEstOpen] = useState(false);
  const [takeoffEstForm, setTakeoffEstForm] = useState({
    title: "Takeoff estimate",
    dsrVersionId: "",
    leadPct: "0",
  });
  const dsrVersionsQ = trpc.dsr.listVersions.useQuery(undefined, {
    enabled: takeoffEstOpen,
  });
  const createFromTakeoff = trpc.estimates.createFromTakeoff.useMutation({
    onSuccess: () => {
      setTakeoffEstOpen(false);
      setTakeoffEstForm({ title: "Takeoff estimate", dsrVersionId: "", leadPct: "0" });
    },
  });
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

  const readyDrawings = (drawingsQ.data ?? []).filter((d) => d.status === "READY");

  return (
    <>
      <h3 style={{ marginTop: 32 }}>Drawings</h3>
      <InlineNotification
        kind="info"
        title="Quantity takeoff in ESTICAD"
        subtitle={
          canTakeoff
            ? "Upload DXF drawings here for the project register. Measure walls, slabs, and structural elements in the free ESTICAD desktop app — quantities sync to this project automatically."
            : "Drawings are listed here for issue control. Quantity takeoff is performed in ESTICAD by staff with write access."
        }
        lowContrast
        hideCloseButton
        style={{ marginBottom: 12 }}
      />
      {canTakeoff && (
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem" }}>
          <a href={ESTICAD_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
            Download ESTICAD
          </a>
          {" · "}
          Sign in with your AORMS account, run <code>ESTILINK</code>, then open a drawing from the Takeoff column below.
        </p>
      )}
      {!canUpload && (
        <InlineNotification
          kind="info"
          title="Upload not available"
          subtitle="Your role is read-only. Ask a project lead or sign in with an Associate (or higher) account to upload DXF drawings."
          lowContrast
          hideCloseButton
        />
      )}
      {canUpload && uploadRequired && user?.isDemo && (
        <InlineNotification
          kind="info"
          title="Demo upload password"
          subtitle="Use the demo login password (demo1234) when prompted — same gate as a live firm with upload protection enabled."
          lowContrast
          hideCloseButton
          style={{ marginBottom: 12 }}
        />
      )}
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
          accept={[".dxf", ".DXF", "application/dxf", "image/vnd.dxf", "application/x-dxf"]}
          disableLabelChanges
          buttonKind="tertiary"
          disabled={!canUpload}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />
        <Button
          size="md"
          disabled={!canUpload || !file || !title || busy}
          onClick={upload}
        >
          {busy ? "Uploading…" : "Upload drawing"}
        </Button>
      </div>
      {canUpload && (
        <p style={{ margin: "0 0 8px", opacity: 0.85, fontSize: "0.875rem" }}>
          AutoCAD / Revit / SketchUp: export or Save As <strong>DXF</strong> (.dxf), not DWG.
          Processing runs in the background — status updates in a few seconds.
        </p>
      )}
      {error && (
        <InlineNotification
          kind="error"
          title="Upload failed"
          subtitle={error}
          lowContrast
        />
      )}
      {esticadHint && (
        <InlineNotification
          kind="info"
          title="ESTICAD"
          subtitle={esticadHint}
          lowContrast
          onCloseButtonClick={() => setEsticadHint(null)}
        />
      )}

      <TableContainer
        title="Uploaded drawings"
        description="DXF register — open ESTICAD to measure quantities"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Rev</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Entities</TableHeader>
              <TableHeader>Takeoff</TableHeader>
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
                    {d.status === "READY" && canTakeoff && (
                      <Button
                        kind="primary"
                        size="sm"
                        renderIcon={Launch}
                        onClick={() => launchEsticad(d.id)}
                      >
                        Open in ESTICAD
                      </Button>
                    )}
                    {d.status === "READY" && !canTakeoff && "—"}
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

      {canTakeoff && readyDrawings.length > 0 && (takeoffQ.data?.rows ?? []).length === 0 && (
        <InlineNotification
          kind="info"
          title="No measurements yet"
          subtitle="Use Open in ESTICAD on a ready drawing to capture quantity takeoff. Results appear here when synced from the desktop app."
          lowContrast
          hideCloseButton
          style={{ marginTop: 16 }}
        />
      )}

      {(takeoffQ.data?.rows ?? []).length > 0 && (
        <TableContainer
          title="Measured quantities (from ESTICAD)"
          description="Read-only — captured in ESTICAD desktop; used for BOQ and estimates in AORMS"
          style={{ marginTop: 16 }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Button size="sm" kind="tertiary" onClick={() => setTakeoffEstOpen(true)}>
              Prepare draft cost estimate
            </Button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Measured</TableHeader>
                <TableHeader>BOQ qty</TableHeader>
                <TableHeader>Drawing</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(takeoffQ.data?.rows ?? []).map((m) => {
                const el = m.elementTypeId ? takeoffElement(m.elementTypeId) : undefined;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell>{el?.label ?? m.elementCategory ?? "—"}</TableCell>
                    <TableCell>
                      {m.kind === "COUNT"
                        ? `${m.itemCount ?? 1} nos`
                        : `${m.realLength.toFixed(1)} ${m.unit}`}
                    </TableCell>
                    <TableCell>
                      {m.boqQty != null
                        ? `${Number(m.boqQty).toFixed(3)} ${m.boqUnit ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{m.drawingRef}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Modal
        open={takeoffEstOpen}
        modalHeading="Prepare draft estimate from takeoff"
        primaryButtonText={createFromTakeoff.isPending ? "Preparing…" : "Create draft estimate"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !takeoffEstForm.title || !takeoffEstForm.dsrVersionId || createFromTakeoff.isPending
        }
        onRequestClose={() => setTakeoffEstOpen(false)}
        onRequestSubmit={() =>
          createFromTakeoff.mutate({
            projectId,
            title: takeoffEstForm.title,
            dsrVersionId: takeoffEstForm.dsrVersionId,
            leadPct: Number(takeoffEstForm.leadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="DSR-linked costing"
            subtitle="Quantities are grouped by element type, matched to DSR item codes (e.g. BM-230), and rated from the selected schedule. Open Estimation / BOQ to review the draft."
          />
          <TextInput
            id="dwg-to-title"
            labelText="Estimate title"
            value={takeoffEstForm.title}
            onChange={(e) => setTakeoffEstForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="dwg-to-dsr"
            labelText="DSR version"
            value={takeoffEstForm.dsrVersionId}
            onChange={(e) =>
              setTakeoffEstForm((f) => ({ ...f, dsrVersionId: e.target.value }))
            }
          >
            <SelectItem value="" text="Select DSR version…" />
            {(dsrVersionsQ.data ?? []).filter((v) => v.status !== "DRAFT").map((v) => (
              <SelectItem key={v.id} value={v.id} text={v.label} />
            ))}
          </Select>
          <TextInput
            id="dwg-to-lead"
            labelText="Whole-estimate lead %"
            type="number"
            value={takeoffEstForm.leadPct}
            onChange={(e) => setTakeoffEstForm((f) => ({ ...f, leadPct: e.target.value }))}
          />
        </Stack>
      </Modal>

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
