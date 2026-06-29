import {
  Button,
  Column,
  FileUploaderButton,
  Grid,
  InlineNotification,
  Modal,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const DISCIPLINES: { id: string; label: string }[] = [
  { id: "INTERIORS", label: "Interiors" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "LIGHTING", label: "Lighting" },
];

function DisciplinePanel({ discipline }: { discipline: string }) {
  const utils = trpc.useUtils();
  const q = trpc.standards.listByDiscipline.useQuery({ discipline: discipline as never });
  const inv = () => utils.standards.listByDiscipline.invalidate({ discipline: discipline as never });
  const create = trpc.standards.create.useMutation({ onSuccess: inv });
  const remove = trpc.standards.remove.useMutation({ onSuccess: inv });
  const removeFile = trpc.standards.removeFile.useMutation({ onSuccess: inv });
  const { authorizedFetch } = useUploadAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function attach(standardId: string, kind: string, file: File) {
    setBusyId(standardId);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/standard-file", (fd) => {
        fd.append("standardId", standardId);
        fd.append("kind", kind);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      inv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack gap={5}>
      <div className="esti-page-header">
        <div className="esti-grow" />
        <Button onClick={() => { setTitle(""); setNotes(""); setOpen(true); }}>New standard</Button>
      </div>
      {error && (
        <InlineNotification kind="error" title="Upload failed" subtitle={error} lowContrast onCloseButtonClick={() => setError(null)} />
      )}
      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={1}
        empty={{ title: "No standards", description: `Add a ${discipline.toLowerCase()} standard with notes and drawings.` }}
      >
        <Grid narrow>
          {(q.data ?? []).map((s) => (
            <Column key={s.id} lg={8} md={4} sm={4}>
              <Tile className="esti-fill">
                <Stack gap={3}>
                  <Stack orientation="horizontal" gap={3} className="esti-page-header">
                    <h4 className="esti-grow">{s.title}</h4>
                    <Button kind="danger--ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate({ id: s.id })}>
                      Delete
                    </Button>
                  </Stack>
                  {s.notes && <p className="esti-label esti-label--secondary">{s.notes}</p>}
                  <Stack orientation="horizontal" gap={2}>
                    {(s.files ?? []).map((f) => (
                      <Tag key={f.id} type="blue" size="sm" filter onClose={() => removeFile.mutate({ id: f.id })}>
                        {f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.kind}: {f.fileName}</a> : `${f.kind}: ${f.fileName}`}
                      </Tag>
                    ))}
                  </Stack>
                  <FileUploaderButton
                    labelText={busyId === s.id ? "Uploading…" : "Attach file"}
                    size="sm"
                    accept={[".pdf", ".dwg", ".dxf", ".png", ".jpg"]}
                    disableLabelChanges
                    disabled={busyId === s.id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) void attach(s.id, "PDF", file);
                    }}
                  />
                </Stack>
              </Tile>
            </Column>
          ))}
        </Grid>
      </DataState>

      <Modal
        open={open}
        modalHeading="New standard"
        primaryButtonText={create.isPending ? "Saving…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title.trim() || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          create.mutate({ discipline: discipline as never, title: title.trim(), notes: notes.trim() || undefined });
          setOpen(false);
        }}
      >
        <Stack gap={5}>
          <TextInput id="std-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea id="std-notes" labelText="Technical notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </Modal>
    </Stack>
  );
}

/** Studio › Libraries › Standards Library — Interiors · Plumbing · Electrical · Lighting. */
export function StandardsLibrary() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="Standards Library"
        description="Office design standards by discipline — technical notes, drawings and standard details."
      />
      <Tabs>
        <TabList aria-label="Disciplines" contained>
          {DISCIPLINES.map((d) => <Tab key={d.id}>{d.label}</Tab>)}
        </TabList>
        <TabPanels>
          {DISCIPLINES.map((d) => (
            <TabPanel key={d.id}><DisciplinePanel discipline={d.id} /></TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
