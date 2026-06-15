import {
  Button,
  InlineNotification,
  Modal,
  NumberInput,
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
import {
  DEMO_BEAM_230x600_M25,
  KNOWLEDGE_STATUS_LABEL,
  KNOWLEDGE_STATUS_TAG,
  SF_BAR_TYPE_LABEL,
  SfCatalogLengthRuleLabel,
  parseSteelFlowCatalogRow,
  type KnowledgeItemStatus,
  type SteelFlowCatalogEntry,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

const statusTag = (status: string) => (
  <Tag type={KNOWLEDGE_STATUS_TAG[status as KnowledgeItemStatus] ?? "gray"}>
    {KNOWLEDGE_STATUS_LABEL[status as KnowledgeItemStatus] ?? status}
  </Tag>
);

export function SteelFlowCatalogManager({ canManage }: { canManage: boolean }) {
  const utils = trpc.useUtils();
  const listQ = trpc.knowledgeBank.listStructuralTemplates.useQuery();
  const refresh = () => {
    utils.knowledgeBank.listStructuralTemplates.invalidate();
    utils.knowledgeBank.listPublishedSteelFlowCatalog.invalidate();
  };

  const create = trpc.knowledgeBank.createSteelFlowCatalog.useMutation({
    onSuccess: refresh,
  });
  const submit = trpc.knowledgeBank.submitStructuralTemplate.useMutation({
    onSuccess: refresh,
  });
  const publish = trpc.knowledgeBank.publishStructuralTemplate.useMutation({
    onSuccess: refresh,
  });

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<SteelFlowCatalogEntry>(DEMO_BEAM_230x600_M25);

  const rows = (listQ.data ?? []).filter(
    (row) => parseSteelFlowCatalogRow(row) !== null,
  );
  const detailRow = rows.find((row) => row.id === detailId);
  const detail = detailRow ? parseSteelFlowCatalogRow(detailRow) : null;
  const error = create.error ?? submit.error ?? publish.error;

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h2>Structural element catalogue</h2>
        <p>
          Versioned beam, column, slab, and footing configurations per IS:456 /
          IS:2502. Each entry defines section size, concrete grade, bar roles
          (top, bottom, extra, skin), stirrups, and length rules — e.g. extra
          top bars at <strong>L/4</strong> at supports. Published entries appear
          in the BBS workshop when adding elements.
        </p>
      </Stack>

      <InlineNotification
        kind="warning"
        title="Engineering review required"
        subtitle="Catalogue templates support quantity calculation and BBS drafting only. Structural design and approval remain the engineer's responsibility."
        lowContrast
      />

      {error && (
        <InlineNotification
          kind="error"
          title="Catalogue action failed"
          subtitle={error.message}
        />
      )}

      {canManage && (
        <Stack orientation="horizontal" gap={3}>
          <Button onClick={() => setOpen(true)}>New catalogue entry</Button>
          <Button
            kind="tertiary"
            onClick={() => {
              setForm(DEMO_BEAM_230x600_M25);
              setOpen(true);
            }}
          >
            Load beam 230×600 example
          </Button>
        </Stack>
      )}

      <TableContainer title="Catalogue entries">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Section</TableHeader>
              <TableHeader>Grade</TableHeader>
              <TableHeader>Bars</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const geo = row.geometry as Record<string, number>;
              const reinf = row.reinforcement as { rebars?: unknown[]; stirrups?: unknown[] };
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {row.family} {geo.widthMm}×{geo.depthMm} mm
                  </TableCell>
                  <TableCell>M{geo.fck ?? 25}</TableCell>
                  <TableCell>
                    {(reinf.rebars ?? []).length} bars ·{" "}
                    {(reinf.stirrups ?? []).length} stirrups
                  </TableCell>
                  <TableCell>{statusTag(row.status)}</TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setDetailId(row.id)}
                      >
                        View
                      </Button>
                      {canManage && row.status === "DRAFT" && (
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => submit.mutate({ id: row.id })}
                        >
                          Submit
                        </Button>
                      )}
                      {canManage && ["DRAFT", "REVIEW"].includes(row.status) && (
                        <Button
                          size="sm"
                          onClick={() => publish.mutate({ id: row.id })}
                        >
                          Publish
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="New SteelFlow catalogue entry"
        primaryButtonText="Create draft"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.code || !form.name || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate(form, { onSuccess: () => setOpen(false) })
        }
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="sfc-code"
              labelText="Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <TextInput
              id="sfc-version"
              labelText="Version"
              value={form.version}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
            />
          </Stack>
          <TextInput
            id="sfc-name"
            labelText="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Stack orientation="horizontal" gap={5}>
            <NumberInput
              id="sfc-width"
              label="Width b (mm)"
              value={form.widthMm}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, widthMm: Number(value) }))
              }
            />
            <NumberInput
              id="sfc-depth"
              label="Depth D (mm)"
              value={form.depthMm}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, depthMm: Number(value) }))
              }
            />
            <NumberInput
              id="sfc-cover"
              label="Cover (mm)"
              value={form.coverMm}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, coverMm: Number(value) }))
              }
            />
          </Stack>
          <p>
            Reinforcement rows below use length rules such as{" "}
            <strong>L/4</strong> for extra bars at supports. Edit the JSON in a
            future release; for now use the beam example as a starting point.
          </p>
        </Stack>
      </Modal>

      <Modal
        open={!!detail}
        passiveModal
        modalHeading={detail?.name ?? "Catalogue entry"}
        onRequestClose={() => setDetailId(null)}
        size="lg"
      >
        {detail && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              <Tag type="outline">{detail.code} · v{detail.version}</Tag>
              <Tag type="cool-gray">
                {detail.elementType} {detail.widthMm}×{detail.depthMm} mm · M
                {detail.fck}
              </Tag>
            </Stack>
            {detail.description && <p>{detail.description}</p>}
            <h4>Longitudinal bars</h4>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Dia</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Length rule</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.rebars.map((bar) => (
                  <TableRow key={bar.barMark}>
                    <TableCell>{bar.barMark}</TableCell>
                    <TableCell>{SF_BAR_TYPE_LABEL[bar.barType]}</TableCell>
                    <TableCell>T{bar.diaMm}</TableCell>
                    <TableCell>{bar.quantity}</TableCell>
                    <TableCell>
                      {SfCatalogLengthRuleLabel[bar.lengthRule]}
                      {bar.lengthRule === "SPAN_FRACTION" &&
                        bar.spanFraction != null &&
                        ` (${bar.spanFraction * 100}% = L/${Math.round(1 / bar.spanFraction)})`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {detail.stirrups.length > 0 && (
              <>
                <h4>Stirrups / links</h4>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Dia</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Spacing</TableHeader>
                      <TableHeader>Zone</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.stirrups.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>T{s.diaMm}</TableCell>
                        <TableCell>{s.stirrupType}</TableCell>
                        <TableCell>{s.spacingMm} mm</TableCell>
                        <TableCell>{s.zone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
