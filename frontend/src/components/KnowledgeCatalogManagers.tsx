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
  KNOWLEDGE_STATUS_LABEL,
  KNOWLEDGE_STATUS_TAG,
  StructuralElementTemplate,
  type KnowledgeItemStatus,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const statusTag = (status: string) => (
  <Tag type={KNOWLEDGE_STATUS_TAG[status as KnowledgeItemStatus] ?? "gray"}>
    {KNOWLEDGE_STATUS_LABEL[status as KnowledgeItemStatus] ?? status}
  </Tag>
);

export function SpecificationManager({ canManage }: { canManage: boolean }) {
  const utils = trpc.useUtils();
  const listQ = trpc.knowledgeBank.listSpecifications.useQuery();
  const refresh = () => utils.knowledgeBank.listSpecifications.invalidate();
  const create = trpc.knowledgeBank.createSpecification.useMutation({
    onSuccess: refresh,
  });
  const submit = trpc.knowledgeBank.submitSpecification.useMutation({
    onSuccess: refresh,
  });
  const publish = trpc.knowledgeBank.publishSpecification.useMutation({
    onSuccess: refresh,
  });
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    version: "1.0",
    tags: "",
    approvedAlternatives: "",
    issueChecks: "",
    specificationText: "",
    purchaseOrderDescription: "",
    unit: "",
    dsrItemCode: "",
    sourceCitation: "",
  });
  const rows = listQ.data ?? [];
  const detail = rows.find((row) => row.id === detailId);
  const error = create.error ?? submit.error ?? publish.error;

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h2>Specification</h2>
        <p>
          Versioned clauses, project tags, DSR references, and purchase-order
          wording.
        </p>
      </Stack>
      {error && (
        <InlineNotification
          kind="error"
          title="Specification action failed"
          subtitle={error.message}
        />
      )}
      {canManage && (
        <Button onClick={() => setOpen(true)}>New specification</Button>
      )}
      <TableContainer title="Specification standards">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Tags</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.version}</TableCell>
                <TableCell>
                  {(row.projectTags as string[]).join(", ") || "—"}
                </TableCell>
                <TableCell>{row.unit}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Modal
        open={open}
        modalHeading="New specification standard"
        primaryButtonText="Create draft"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.code ||
          !form.title ||
          !form.specificationText ||
          !form.purchaseOrderDescription ||
          !form.unit ||
          create.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate(
            {
              code: form.code,
              title: form.title,
              version: form.version,
              projectTags: form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              approvedAlternatives: form.approvedAlternatives
                .split("\n")
                .map((value) => value.trim())
                .filter(Boolean),
              issueChecks: form.issueChecks
                .split("\n")
                .map((value) => value.trim())
                .filter(Boolean),
              specificationText: form.specificationText,
              purchaseOrderDescription: form.purchaseOrderDescription,
              unit: form.unit,
              dsrItemCode: form.dsrItemCode || undefined,
              sourceCitation: form.sourceCitation || undefined,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="ks-code"
              labelText="Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <TextInput
              id="ks-version"
              labelText="Version"
              value={form.version}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
            />
            <TextInput
              id="ks-unit"
              labelText="Unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </Stack>
          <TextInput
            id="ks-title"
            labelText="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <TextInput
            id="ks-tags"
            labelText="Project / work-package tags"
            helperText="Comma-separated"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
          <TextArea
            id="ks-spec"
            labelText="Specification clause"
            rows={5}
            value={form.specificationText}
            onChange={(e) =>
              setForm((f) => ({ ...f, specificationText: e.target.value }))
            }
          />
          <TextArea
            id="ks-alternatives"
            labelText="Approved material alternatives"
            helperText="One approved alternative per line"
            rows={3}
            value={form.approvedAlternatives}
            onChange={(e) =>
              setForm((f) => ({ ...f, approvedAlternatives: e.target.value }))
            }
          />
          <TextArea
            id="ks-checks"
            labelText="Issue checks"
            helperText="One mandatory pre-issue check per line"
            rows={3}
            value={form.issueChecks}
            onChange={(e) =>
              setForm((f) => ({ ...f, issueChecks: e.target.value }))
            }
          />
          <TextArea
            id="ks-po"
            labelText="Purchase-order description"
            rows={3}
            value={form.purchaseOrderDescription}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                purchaseOrderDescription: e.target.value,
              }))
            }
          />
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="ks-dsr"
              labelText="DSR item code (optional)"
              value={form.dsrItemCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, dsrItemCode: e.target.value }))
              }
            />
            <TextInput
              id="ks-source"
              labelText="Source citation"
              value={form.sourceCitation}
              onChange={(e) =>
                setForm((f) => ({ ...f, sourceCitation: e.target.value }))
              }
            />
          </Stack>
        </Stack>
      </Modal>
      <Modal
        open={!!detail}
        passiveModal
        modalHeading={detail?.title ?? "Specification"}
        onRequestClose={() => setDetailId(null)}
        size="lg"
      >
        {detail && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              {statusTag(detail.status)}
              <Tag type="outline">
                {detail.code} · v{detail.version}
              </Tag>
            </Stack>
            <h4>Specification clause</h4>
            <p>{detail.specificationText}</p>
            <h4>Purchase-order description</h4>
            <p>{detail.purchaseOrderDescription}</p>
            <h4>Approved alternatives</h4>
            <p>
              {(detail.approvedAlternatives as string[]).join("; ") || "None"}
            </p>
            <h4>Issue checks</h4>
            <p>{(detail.issueChecks as string[]).join("; ") || "None"}</p>
            <p>
              <strong>Unit:</strong> {detail.unit} · <strong>DSR:</strong>{" "}
              {detail.dsrItemCode ?? "—"}
            </p>
            {detail.sourceCitation && (
              <p>
                <strong>Source:</strong> {detail.sourceCitation}
              </p>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

const geometryExample = '{"widthMm":230,"depthMm":450,"spanMm":4000}';
const reinforcementExample =
  '[{"role":"MAIN","barMark":"B1","diaMm":16,"count":4,"coverMm":25},{"role":"STIRRUP","barMark":"S1","diaMm":8,"spacingMm":150,"coverMm":25}]';

export function StructuralElementManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const utils = trpc.useUtils();
  const listQ = trpc.knowledgeBank.listStructuralTemplates.useQuery();
  const refresh = () =>
    utils.knowledgeBank.listStructuralTemplates.invalidate();
  const create = trpc.knowledgeBank.createStructuralTemplate.useMutation({
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
  const [validationError, setValidationError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    family: "BEAM",
    type: "RECTANGULAR",
    version: "1.0",
    description: "",
    geometry: geometryExample,
    reinforcement: reinforcementExample,
    sourceCitation: "",
  });
  const rows = listQ.data ?? [];
  const detail = rows.find((row) => row.id === detailId);
  const error = create.error ?? submit.error ?? publish.error;

  function createDraft() {
    try {
      const parsed = StructuralElementTemplate.parse({
        ...form,
        geometry: JSON.parse(form.geometry),
        reinforcement: JSON.parse(form.reinforcement),
        description: form.description || undefined,
        sourceCitation: form.sourceCitation || undefined,
      });
      setValidationError("");
      create.mutate(parsed, { onSuccess: () => setOpen(false) });
    } catch (cause) {
      setValidationError(
        cause instanceof Error ? cause.message : "Invalid template data",
      );
    }
  }

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h2>Structural Elements</h2>
        <p>
          Versioned beam, column, slab, and footing geometry with reinforcement
          arrangements for reviewable BBS drafting.
        </p>
      </Stack>
      <InlineNotification
        kind="warning"
        title="Engineering review required"
        subtitle="Templates support quantity calculation only. Project-specific structural design and approval remain the structural engineer's responsibility."
        lowContrast
      />
      {(error || validationError) && (
        <InlineNotification
          kind="error"
          title="Structural template action failed"
          subtitle={error?.message ?? validationError}
        />
      )}
      {canManage && (
        <Button onClick={() => setOpen(true)}>New structural template</Button>
      )}
      <TableContainer title="Structural element templates">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Family</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Bars</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.family}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.version}</TableCell>
                <TableCell>{(row.reinforcement as unknown[]).length}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Modal
        open={open}
        modalHeading="New structural element template"
        primaryButtonText="Create draft"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.code || !form.name || !form.type || create.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={createDraft}
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="ke-code"
              labelText="Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <TextInput
              id="ke-name"
              labelText="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextInput
              id="ke-version"
              labelText="Version"
              value={form.version}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
            />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="ke-family"
              labelText="Family"
              value={form.family}
              onChange={(e) =>
                setForm((f) => ({ ...f, family: e.target.value }))
              }
            >
              {["BEAM", "COLUMN", "SLAB", "FOOTING"].map((family) => (
                <SelectItem key={family} value={family} text={family} />
              ))}
            </Select>
            <TextInput
              id="ke-type"
              labelText="Element type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />
          </Stack>
          <TextArea
            id="ke-description"
            labelText="Description"
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <TextArea
            id="ke-geometry"
            labelText="Geometry (JSON)"
            helperText={`Example: ${geometryExample}`}
            rows={4}
            value={form.geometry}
            onChange={(e) =>
              setForm((f) => ({ ...f, geometry: e.target.value }))
            }
          />
          <TextArea
            id="ke-reinforcement"
            labelText="Reinforcement arrangements (JSON)"
            helperText="Each row requires role, barMark, diaMm, coverMm, and count or spacingMm."
            rows={8}
            value={form.reinforcement}
            onChange={(e) =>
              setForm((f) => ({ ...f, reinforcement: e.target.value }))
            }
          />
          <TextInput
            id="ke-source"
            labelText="Source citation"
            value={form.sourceCitation}
            onChange={(e) =>
              setForm((f) => ({ ...f, sourceCitation: e.target.value }))
            }
          />
        </Stack>
      </Modal>
      <Modal
        open={!!detail}
        passiveModal
        modalHeading={detail?.name ?? "Structural template"}
        onRequestClose={() => setDetailId(null)}
        size="lg"
      >
        {detail && (
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              {statusTag(detail.status)}
              <Tag type="outline">
                {detail.code} · v{detail.version}
              </Tag>
              <Tag type="cool-gray">
                {detail.family} · {detail.type}
              </Tag>
            </Stack>
            {detail.description && <p>{detail.description}</p>}
            <h4>Geometry</h4>
            <pre>{JSON.stringify(detail.geometry, null, 2)}</pre>
            <h4>Reinforcement</h4>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Dia</TableHeader>
                  <TableHeader>Count / spacing</TableHeader>
                  <TableHeader>Cover</TableHeader>
                  <TableHeader>Zone</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(detail.reinforcement as Array<Record<string, unknown>>).map(
                  (bar, index) => (
                    <TableRow key={`${String(bar.barMark)}-${index}`}>
                      <TableCell>{String(bar.barMark)}</TableCell>
                      <TableCell>{String(bar.role)}</TableCell>
                      <TableCell>{String(bar.diaMm)} mm</TableCell>
                      <TableCell>
                        {bar.count
                          ? String(bar.count)
                          : `@ ${String(bar.spacingMm)} mm`}
                      </TableCell>
                      <TableCell>{String(bar.coverMm)} mm</TableCell>
                      <TableCell>{bar.zone ? String(bar.zone) : "—"}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
            {detail.sourceCitation && (
              <p>
                <strong>Source:</strong> {detail.sourceCitation}
              </p>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
