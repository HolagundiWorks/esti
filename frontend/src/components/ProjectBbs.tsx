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
  TextInput,
} from "@carbon/react";
import { BAR_DIAS, bbsItemTotals } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

export function ProjectBbs({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.bbs.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const [openId, setOpenId] = useState<string | null>(null);
  const itemsQ = trpc.bbs.items.useQuery({ bbsId: openId ?? "" }, { enabled: !!openId });

  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = trpc.bbs.create.useMutation({
    onSuccess: (row) => {
      utils.bbs.listByProject.invalidate({ projectId });
      setNewOpen(false);
      setTitle("");
      setOpenId(row.id);
    },
  });

  const invalidateItems = () => openId && utils.bbs.items.invalidate({ bbsId: openId });
  const addItem = trpc.bbs.addItem.useMutation({ onSuccess: () => { invalidateItems(); setItemOpen(false); } });
  const removeItem = trpc.bbs.removeItem.useMutation({ onSuccess: invalidateItems });

  const [itemOpen, setItemOpen] = useState(false);
  const [itf, setItf] = useState({ barMark: "", member: "", diaMm: "12", noOfMembers: "1", barsPerMember: "1", cuttingLengthMm: "" });

  const items = itemsQ.data ?? [];
  const preview =
    itf.cuttingLengthMm !== ""
      ? bbsItemTotals({
          diaMm: Number(itf.diaMm),
          noOfMembers: Number(itf.noOfMembers) || 1,
          barsPerMember: Number(itf.barsPerMember) || 1,
          cuttingLengthMm: Number(itf.cuttingLengthMm) || 0,
        })
      : null;

  // Steel summary by diameter.
  const byDia = new Map<number, number>();
  for (const it of items) byDia.set(it.diaMm, (byDia.get(it.diaMm) ?? 0) + it.weightKg);
  const totalWeight = items.reduce((s, it) => s + it.weightKg, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
        <h3>Bar bending schedule</h3>
        <Button size="sm" onClick={() => setNewOpen(true)}>New BBS</Button>
      </div>

      <TableContainer title="Schedules">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Title</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.title}</TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => setOpenId(openId === b.id ? null : b.id)}>
                    {openId === b.id ? "Hide" : "Open"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {openId && (
        <div style={{ marginTop: 16, borderLeft: "3px solid #0f62fe", paddingLeft: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4>Bars</h4>
            <Button size="sm" onClick={() => setItemOpen(true)}>Add bar</Button>
          </div>
          <TableContainer title="Bar schedule" description="Weight = d²/162 × length × bars">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Member</TableHeader>
                  <TableHeader>Dia (mm)</TableHeader>
                  <TableHeader>Members</TableHeader>
                  <TableHeader>Bars/member</TableHeader>
                  <TableHeader>Cutting len (mm)</TableHeader>
                  <TableHeader>Weight (kg)</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.barMark}</TableCell>
                    <TableCell>{it.member ?? "—"}</TableCell>
                    <TableCell>{it.diaMm}</TableCell>
                    <TableCell>{it.noOfMembers}</TableCell>
                    <TableCell>{it.barsPerMember}</TableCell>
                    <TableCell>{it.cuttingLengthMm}</TableCell>
                    <TableCell>{it.weightKg.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button kind="ghost" size="sm" onClick={() => removeItem.mutate({ id: it.id })}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
            {[...byDia.entries()].sort((a, b) => a[0] - b[0]).map(([dia, kg]) => (
              <span key={dia} style={{ fontSize: 13 }}>
                Ø{dia}: <strong>{kg.toFixed(1)} kg</strong>
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 14 }}>
              Total steel: <strong>{totalWeight.toFixed(1)} kg</strong>
            </span>
          </div>
        </div>
      )}

      <Modal
        open={newOpen}
        modalHeading="New bar bending schedule"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || create.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, title })}
      >
        <TextInput id="bbs-title" labelText="Title" placeholder="e.g. Footing F1 reinforcement" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Modal>

      <Modal
        open={itemOpen}
        modalHeading="Add bar"
        primaryButtonText={addItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!openId || !itf.barMark || itf.cuttingLengthMm === "" || addItem.isPending}
        onRequestClose={() => setItemOpen(false)}
        onRequestSubmit={() =>
          openId &&
          addItem.mutate({
            bbsId: openId,
            barMark: itf.barMark,
            member: itf.member || undefined,
            diaMm: Number(itf.diaMm),
            noOfMembers: Number(itf.noOfMembers) || 1,
            barsPerMember: Number(itf.barsPerMember) || 1,
            cuttingLengthMm: Number(itf.cuttingLengthMm) || 0,
          })
        }
      >
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="bb-mark" labelText="Bar mark" value={itf.barMark} onChange={(e) => setItf((f) => ({ ...f, barMark: e.target.value }))} />
            <TextInput id="bb-member" labelText="Member (optional)" value={itf.member} onChange={(e) => setItf((f) => ({ ...f, member: e.target.value }))} />
            <Select id="bb-dia" labelText="Dia (mm)" value={itf.diaMm} onChange={(e) => setItf((f) => ({ ...f, diaMm: e.target.value }))}>
              {BAR_DIAS.map((d) => <SelectItem key={d} value={String(d)} text={`${d}`} />)}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="bb-mem" labelText="No. of members" type="number" value={itf.noOfMembers} onChange={(e) => setItf((f) => ({ ...f, noOfMembers: e.target.value }))} />
            <TextInput id="bb-bpm" labelText="Bars / member" type="number" value={itf.barsPerMember} onChange={(e) => setItf((f) => ({ ...f, barsPerMember: e.target.value }))} />
            <TextInput id="bb-cut" labelText="Cutting length (mm)" type="number" value={itf.cuttingLengthMm} onChange={(e) => setItf((f) => ({ ...f, cuttingLengthMm: e.target.value }))} />
          </div>
          {preview && (
            <p style={{ fontSize: 13, color: "#6f6f6f" }}>
              {preview.totalBars} bars · {preview.totalLengthM} m · <strong>{preview.weightKg} kg</strong>
            </p>
          )}
        </Stack>
      </Modal>
    </>
  );
}
