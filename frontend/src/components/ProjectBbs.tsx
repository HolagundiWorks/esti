import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  BAR_DIAS,
  bbsFloorSummary,
  bbsItemTotals,
  applyStructuralCatalogEntry,
  can,
  DEMO_BEAM_230x600_M25,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
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
    return <span className="esti-label--secondary">Generating…</span>;
  }
  return (
    <Button kind="ghost" size="sm" disabled={gen.isPending} onClick={() => gen.mutate({ id })}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

/** Parse bulk BBS lines: barMark, member, diaMm, noOfMembers, barsPerMember, cuttingLengthMm, floor? */
function parseBbsBulk(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(/[\t,;]/).map((c) => c.trim());
      const [barMark, member = "", diaMm, noOfMembers = "1", barsPerMember = "1", cuttingLengthMm, floor = ""] = cols;
      if (!barMark || !diaMm || !cuttingLengthMm) return null;
      return {
        barMark,
        member: member || undefined,
        diaMm: Number(diaMm),
        noOfMembers: Number(noOfMembers) || 1,
        barsPerMember: Number(barsPerMember) || 1,
        cuttingLengthMm: Number(cuttingLengthMm) || 0,
        floor: floor || undefined,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.cuttingLengthMm > 0);
}

export function ProjectBbs({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
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
  const validateQ = trpc.bbs.validate.useQuery(
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

  const invalidateItems = () => {
    if (openId) {
      void utils.bbs.items.invalidate({ bbsId: openId });
      void utils.bbs.validate.invalidate({ bbsId: openId });
    }
  };
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

  // Spine link (work package / BOQ line / drawing) for the open schedule.
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ workPackageId: "", boqItemId: "", drawingId: "" });
  const wpQ = trpc.workPackages.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const drawingsQ = trpc.drawings.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const wpItemsQ = trpc.workPackages.byId.useQuery(
    { id: linkForm.workPackageId },
    { enabled: linkOpen && !!linkForm.workPackageId },
  );
  const link = trpc.bbs.link.useMutation({
    onSuccess: () => {
      utils.bbs.listByProject.invalidate({ projectId });
      setLinkOpen(false);
    },
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
    floor: "",
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
  const floorSummary = bbsFloorSummary(items);
  const hasFloors = floorSummary.some((f) => f.floor !== "—");

  const open = (listQ.data ?? []).find((b) => b.id === openId) ?? null;
  const validation = validateQ.data;
  const exportBlocked = validation ? !validation.ok : false;

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
                    disabled={exportBlocked}
                    onClick={() => {
                      void utils.bbs.exportRows.fetch({ bbsId: open.id }).then((data) => {
                        if (data.rows.length) downloadXlsx(data.rows, "BBS", `${data.ref ?? open.title}-bbs`);
                      });
                    }}
                  >
                    Export XLSX
                  </Button>
                  {!exportBlocked ? (
                    <BbsPdf id={open.id} initial={open.pdfStatus ?? "NONE"} />
                  ) : (
                    <Button size="sm" kind="ghost" disabled>
                      Issue PDF
                    </Button>
                  )}
                </>
              )}
              {open && canWrite && (
                <Button
                  size="sm"
                  kind="tertiary"
                  onClick={() => {
                    setLinkForm({
                      workPackageId: open.workPackageId ?? "",
                      boqItemId: open.boqItemId ?? "",
                      drawingId: open.drawingId ?? "",
                    });
                    setLinkOpen(true);
                  }}
                >
                  Link
                </Button>
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
          {open && (open.workPackageId || open.boqItemId || open.drawingId) && (
            <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap", marginTop: 8 }}>
              {open.workPackageId && (
                <Tag type="teal" size="sm">
                  Work package:{" "}
                  {(wpQ.data ?? []).find((w) => w.id === open.workPackageId)?.ref ?? "linked"}
                </Tag>
              )}
              {open.boqItemId && (
                <Tag type="cyan" size="sm">
                  BOQ line linked
                </Tag>
              )}
              {open.drawingId && (
                <Tag type="purple" size="sm">
                  Drawing:{" "}
                  {(drawingsQ.data ?? []).find((d) => d.id === open.drawingId)?.ref ?? "linked"}
                </Tag>
              )}
            </Stack>
          )}
          {validation && validation.issues.length > 0 && (
            <InlineNotification
              kind={validation.ok ? "warning" : "error"}
              lowContrast
              hideCloseButton
              title={validation.ok ? "Review before issue" : "Fix validation errors before export"}
              subtitle={validation.issues
                .slice(0, 4)
                .map((issue) => issue.message)
                .join(" · ")}
              style={{ marginBottom: 12 }}
            />
          )}
          <TableContainer
            title="Bar schedule"
            description="Weight = d²/162 × length × bars"
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Member</TableHeader>
                  <TableHeader>Floor</TableHeader>
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
                    <TableCell>{it.floor ?? "—"}</TableCell>
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
          {hasFloors && (
            <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap", marginTop: 8 }}>
              <span className="esti-label--secondary">By floor:</span>
              {floorSummary.map((f) => (
                <Tag key={f.floor} type="gray" size="sm">
                  {f.floor}: {f.weightKg.toFixed(1)} kg
                </Tag>
              ))}
            </Stack>
          )}
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
            floor: itf.floor || undefined,
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
            <TextInput
              id="bb-floor"
              labelText="Floor (optional)"
              value={itf.floor}
              onChange={(e) =>
                setItf((f) => ({ ...f, floor: e.target.value }))
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
        modalHeading="Apply structural template"
        primaryButtonText={bulkImport.isPending ? "Applying…" : "Apply"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!openId || !spanMm || bulkImport.isPending}
        onRequestClose={() => setTemplateOpen(false)}
        onRequestSubmit={() => {
          if (!openId) return;
          const applied = applyStructuralCatalogEntry(DEMO_BEAM_230x600_M25, Number(spanMm) || 6000);
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

      <Modal
        open={linkOpen}
        modalHeading="Link this schedule into the cost spine"
        primaryButtonText={link.isPending ? "Saving…" : "Save links"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!open || link.isPending}
        onRequestClose={() => setLinkOpen(false)}
        onRequestSubmit={() => {
          if (!open) return;
          link.mutate({
            id: open.id,
            workPackageId: linkForm.workPackageId || null,
            boqItemId: linkForm.boqItemId || null,
            drawingId: linkForm.drawingId || null,
          });
        }}
      >
        <Stack gap={5}>
          <p className="esti-label--secondary">
            Tie the bar schedule to the work package, BOQ line, and drawing it reinforces. Leave a
            field on "Not linked" to clear it.
          </p>
          <Select
            id="link-wp"
            labelText="Work package"
            value={linkForm.workPackageId}
            onChange={(e) =>
              setLinkForm((f) => ({ ...f, workPackageId: e.target.value, boqItemId: "" }))
            }
          >
            <SelectItem value="" text="Not linked" />
            {(wpQ.data ?? []).map((wp) => (
              <SelectItem key={wp.id} value={wp.id} text={`${wp.ref ?? "WP"} · ${wp.name}`} />
            ))}
          </Select>
          <Select
            id="link-boq"
            labelText="BOQ line"
            disabled={!linkForm.workPackageId}
            value={linkForm.boqItemId}
            onChange={(e) => setLinkForm((f) => ({ ...f, boqItemId: e.target.value }))}
          >
            <SelectItem value="" text="Not linked" />
            {(wpItemsQ.data?.items ?? [])
              .filter((it) => it.boqItemId)
              .map((it) => (
                <SelectItem key={it.id} value={it.boqItemId!} text={it.description} />
              ))}
          </Select>
          <Select
            id="link-drawing"
            labelText="Drawing"
            value={linkForm.drawingId}
            onChange={(e) => setLinkForm((f) => ({ ...f, drawingId: e.target.value }))}
          >
            <SelectItem value="" text="Not linked" />
            {(drawingsQ.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id} text={`${d.ref ?? "DRG"} · ${d.title}`} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </>
  );
}
