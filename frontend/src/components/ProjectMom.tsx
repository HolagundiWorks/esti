import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

export function ProjectMom({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.moms.listByProject.useQuery({ projectId });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "MOM" });
  const inv = () => utils.moms.listByProject.invalidate({ projectId });
  const create = trpc.moms.create.useMutation({ onSuccess: inv });
  const issue = trpc.moms.issue.useMutation({ onSuccess: inv });
  const update = trpc.moms.update.useMutation({
    onSuccess: () => detailId && utils.moms.byId.invalidate({ id: detailId }),
  });
  const addAction = trpc.moms.addAction.useMutation({ onSuccess: () => utils.moms.byId.invalidate() });
  const convert = trpc.moms.convertActionToTask.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", meetingDate: "", venue: "", attendees: "", minutes: "" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  const detailQ = trpc.moms.byId.useQuery({ id: detailId! }, { enabled: !!detailId });

  useEffect(() => {
    setEditMinutes("");
  }, [detailId]);

  return (
    <div>
      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3>Meeting minutes</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>New MOM</Button>
      </Stack>
      <DataState loading={listQ.isLoading} isEmpty={(listQ.data ?? []).length === 0} columnCount={4} empty={{ title: "No meeting minutes", description: "Record decisions and convert action items to tasks." }}>
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.ref}</TableCell>
                  <TableCell>{m.title}</TableCell>
                  <TableCell>{m.meetingDate ?? "—"}</TableCell>
                  <TableCell><Tag type={m.status === "ISSUED" ? "green" : "gray"} size="sm">{m.status}</Tag></TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => setDetailId(m.id)}>Open</Button>
                    {m.status === "DRAFT" && (
                      <Button kind="ghost" size="sm" disabled={issue.isPending} onClick={() => issue.mutate({ id: m.id })}>Issue</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal open={open} modalHeading="New meeting minutes" primaryButtonText="Create" secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, ...form, meetingDate: form.meetingDate || undefined }, { onSuccess: () => setOpen(false) })}
      >
        <Stack gap={4}>
          <Select
            id="mom-tpl"
            labelText="Start from template (optional)"
            value=""
            onChange={(e) => {
              const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
              if (t) setForm((f) => ({ ...f, title: t.title, minutes: t.body }));
            }}
          >
            <SelectItem value="" text="— blank MOM —" />
            {(templatesQ.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.title} />
            ))}
          </Select>
          <TextInput id="mom-title" labelText="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <TextInput id="mom-date" labelText="Meeting date" type="date" value={form.meetingDate} onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))} />
          <TextInput id="mom-venue" labelText="Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
          <TextArea id="mom-att" labelText="Attendees" value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} />
          <TextArea id="mom-min" labelText="Minutes" rows={6} value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} />
        </Stack>
      </Modal>

      <Modal open={!!detailId} modalHeading={detailQ.data?.title ?? "MOM"} primaryButtonText="Close" onRequestClose={() => setDetailId(null)} onRequestSubmit={() => setDetailId(null)} size="lg">
        {detailQ.data && (
          <Stack gap={4}>
            {detailQ.data.status === "DRAFT" ? (
              <>
                <TextArea
                  id="mom-edit-min"
                  labelText="Minutes"
                  rows={8}
                  value={editMinutes || detailQ.data.minutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={update.isPending}
                  onClick={() => {
                    if (!detailId) return;
                    update.mutate({ id: detailId, minutes: editMinutes || detailQ.data!.minutes });
                  }}
                >
                  Save minutes
                </Button>
              </>
            ) : (
              <p>{detailQ.data.minutes || "No minutes text yet."}</p>
            )}
            <h4>Action items</h4>
            {(detailQ.data.actions ?? []).map((a) => (
              <Stack key={a.id} orientation="horizontal" gap={3}>
                <span className="esti-grow">{a.description}</span>
                {!a.taskId && (
                  <Button kind="ghost" size="sm" onClick={() => convert.mutate({ actionId: a.id })}>→ Task</Button>
                )}
              </Stack>
            ))}
            {detailQ.data.status === "DRAFT" && (
              <Stack orientation="horizontal" gap={3}>
                <TextInput id="act-desc" labelText="Action" hideLabel placeholder="New action item" value={actionText} onChange={(e) => setActionText(e.target.value)} />
                <Button size="sm" disabled={!actionText || !detailId} onClick={() => {
                  if (detailId) addAction.mutate({ momId: detailId, description: actionText }, { onSuccess: () => setActionText("") });
                }}>Add</Button>
              </Stack>
            )}
          </Stack>
        )}
      </Modal>
    </div>
  );
}
