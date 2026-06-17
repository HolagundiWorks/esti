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
  TextArea,
  TextInput,
} from "@carbon/react";
import { BAR_DIAS, bbsItemTotals, applySteelFlowCatalogEntry, DEMO_BEAM_230x600_M25 } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { pdfPollInterval } from "../lib/pdfUi.js";

function BbsPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.bbs.byId.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        pdfPollInterval(query.state.data?.pdfStatus, initial !== "NONE"),
      enabled: initial !== "NONE" || !!id,
    },
  );
  const gen = trpc.bbs.generatePdf.useMutation({
    onSuccess: () => utils.bbs.byId.invalidate({ id }),
  });
  const status = q.data?.pdfStatus ?? initial;
  const url = q.data?.pdfUrl ?? null;
  if (status === "READY" && url) {
    return (
      <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
        Open PDF
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span style={{ fontSize: "0.875rem" }}>Generating…</span>;
  }
  return (
    <Button kind="ghost" size="sm" disabled={gen.isPending} onClick={() => gen.mutate({ id })}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

/** Parse bulk BBS lines: barMark, member, diaMm, noOfMembers, barsPerMember, cuttingLengthMm */
function parseBbsBulk(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(/[\t,;]/).map((c) => c.trim());
      const [barMark, member = "", diaMm, noOfMembers = "1", barsPerMember = "1", cuttingLengthMm] = cols;
      if (!barMark || !diaMm || !cuttingLengthMm) return null;
      return {
        barMark,
        member: member || undefined,
        diaMm: Number(diaMm),
        noOfMembers: Number(noOfMembers) || 1,
        barsPerMember: Number(barsPerMember) || 1,
        cuttingLengthMm: Number(cuttingLengthMm) || 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.cuttingLengthMm > 0);
}

export function ProjectBbs({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.bbs.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const itemsQ = trpc.bbs.items.useQuery(
    { bbsId: openId ?? "" },
    { enabled: !!openId },
  );

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

  const invalidateItems = () =>
    openId && utils.bbs.items.invalidate({ bbsId: openId });
  const addItem = trpc.bbs.addItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      setItemOpen(false);
    },
  });
  const bulkImport = trpc.bbs.bulkImport.useMutation({
    onSuccess: () => {
      invalidateItems();
      setBulkOpen(false);
      setBulkText("");
    },
  });
  const removeItem = trpc.bbs.removeItem.useMutation({
    onSuccess: invalidateItems,
  });

  const [itemOpen, setItemOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [spanMm, setSpanMm] = useState("6000");
  const [itf, setItf] = useState({
    barMark: "",
    member: "",
    diaMm: "12",
    noOfMembers: "1",
    barsPerMember: "1",
    cuttingLengthMm: "",
  });

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

  const byDia = new Map<number, number>();
  for (const it of items)
    byDia.set(it.diaMm, (byDia.get(it.diaMm) ?? 0) + it.weightKg);
  const totalWeight = items.reduce((s, it) => s + it.weightKg, 0);

  const open = (listQ.data ?? []).find((b) => b.id === openId) ?? null;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Bar bending schedule</h3>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          New BBS
        </Button>
      </div>

      <TableContainer title="Schedules">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Ver</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.ref}</TableCell>
                <TableCell>{b.title}</TableCell>
                <TableCell>v{b.versionNo ?? 1}</TableCell>
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => setOpenId(openId === b.id ? null : b.id)}
                  >
                    {openId === b.id ? "Hide" : "Open"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {openId && (
        <div style={{ marginTop: 16, paddingLeft: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4>{open?.ref ?? "Bars"} · {open?.title}</h4>
            <Stack orientation="horizontal" gap={3}>
              {open && (
                <>
                  <Button
                    size="sm"
                    kind="ghost"
                    onClick={() => {
                      void utils.bbs.exportRows.fetch({ bbsId: open.id }).then((data) => {
                        if (data.rows.length) downloadXlsx(data.rows, "BBS", `${data.ref ?? open.title}-bbs`);
                      });
                    }}
                  >
                    Export XLSX
                  </Button>
                  <BbsPdf id={open.id} initial={open.pdfStatus ?? "NONE"} />
                </>
              )}
              <Button size="sm" kind="tertiary" onClick={() => setTemplateOpen(true)}>
                From template
              </Button>
              <Button size="sm" kind="tertiary" onClick={() => setBulkOpen(true)}>
                Bulk import
              </Button>
              <Button size="sm" onClick={() => setItemOpen(true)}>
                Add bar
              </Button>
            </Stack>
          </div>
          <TableContainer
            title="Bar schedule"
            description="Weight = d²/162 × length × bars"
          >
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
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => removeItem.mutate({ id: it.id })}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <div
            style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}
          >
            {[...byDia.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([dia, kg]) => (
                <span key={dia}>
                  Ø{dia}: <strong>{kg.toFixed(1)} kg</strong>
                </span>
              ))}
            <span style={{ marginLeft: "auto" }}>
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
        <TextInput
          id="bbs-title"
          labelText="Title"
          placeholder="e.g. Footing F1 reinforcement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Modal>

      <Modal
        open={itemOpen}
        modalHeading="Add bar"
        primaryButtonText={addItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !openId ||
          !itf.barMark ||
          itf.cuttingLengthMm === "" ||
          addItem.isPending
        }
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
            <TextInput
              id="bb-mark"
              labelText="Bar mark"
              value={itf.barMark}
              onChange={(e) =>
                setItf((f) => ({ ...f, barMark: e.target.value }))
              }
            />
            <TextInput
              id="bb-member"
              labelText="Member (optional)"
              value={itf.member}
              onChange={(e) =>
                setItf((f) => ({ ...f, member: e.target.value }))
              }
            />
            <Select
              id="bb-dia"
              labelText="Dia (mm)"
              value={itf.diaMm}
              onChange={(e) => setItf((f) => ({ ...f, diaMm: e.target.value }))}
            >
              {BAR_DIAS.map((d) => (
                <SelectItem key={d} value={String(d)} text={`${d}`} />
              ))}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="bb-mem"
              labelText="No. of members"
              type="number"
              value={itf.noOfMembers}
              onChange={(e) =>
                setItf((f) => ({ ...f, noOfMembers: e.target.value }))
              }
            />
            <TextInput
              id="bb-bpm"
              labelText="Bars / member"
              type="number"
              value={itf.barsPerMember}
              onChange={(e) =>
                setItf((f) => ({ ...f, barsPerMember: e.target.value }))
              }
            />
            <TextInput
              id="bb-cut"
              labelText="Cutting length (mm)"
              type="number"
              value={itf.cuttingLengthMm}
              onChange={(e) =>
                setItf((f) => ({ ...f, cuttingLengthMm: e.target.value }))
              }
            />
          </div>
          {preview && (
            <p>
              {preview.totalBars} bars · {preview.totalLengthM} m ·{" "}
              <strong>{preview.weightKg} kg</strong>
            </p>
          )}
        </Stack>
      </Modal>

      <Modal
        open={bulkOpen}
        modalHeading="Bulk import bars"
        primaryButtonText={bulkImport.isPending ? "Importing…" : "Import"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!openId || !bulkText.trim() || bulkImport.isPending}
        onRequestClose={() => setBulkOpen(false)}
        onRequestSubmit={() => {
          if (!openId) return;
          const rows = parseBbsBulk(bulkText);
          if (rows.length) bulkImport.mutate({ bbsId: openId, rows });
        }}
      >
        <Stack gap={4}>
          <p style={{ margin: 0, opacity: 0.85 }}>
            One line per bar: mark, member (optional), dia (mm), members, bars/member, cutting length (mm).
          </p>
          <TextArea
            id="bulk-bbs"
            labelText="Paste rows"
            rows={10}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"A1, Column C1, 16, 4, 2, 3200\nB2, Beam B1, 12, 2, 4, 5400"}
          />
        </Stack>
      </Modal>

      <Modal
        open={templateOpen}
        modalHeading="Apply SteelFlow template"
        primaryButtonText={bulkImport.isPending ? "Applying…" : "Apply"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!openId || !spanMm || bulkImport.isPending}
        onRequestClose={() => setTemplateOpen(false)}
        onRequestSubmit={() => {
          if (!openId) return;
          const applied = applySteelFlowCatalogEntry(DEMO_BEAM_230x600_M25, Number(spanMm) || 6000);
          const rows = applied.rebars.map((r) => ({
            barMark: r.barMark,
            member: `${applied.elementType} · ${r.barType}`,
            diaMm: r.diaMm,
            noOfMembers: 1,
            barsPerMember: r.quantity,
            cuttingLengthMm: r.cuttingLengthMm,
          }));
          if (rows.length) bulkImport.mutate({ bbsId: openId, rows });
          setTemplateOpen(false);
        }}
      >
        <Stack gap={4}>
          <p style={{ margin: 0, opacity: 0.85 }}>
            {DEMO_BEAM_230x600_M25.name} — validated IS:456 / IS:2502 layout with main, extra, and skin bars.
          </p>
          <TextInput
            id="tpl-span"
            labelText="Span / member length (mm)"
            type="number"
            value={spanMm}
            onChange={(e) => setSpanMm(e.target.value)}
          />
        </Stack>
      </Modal>
    </>
  );
}
