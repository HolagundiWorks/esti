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
import { Download } from "@carbon/icons-react";
import {
  DOCUMENT_ENTITY_LABEL,
  DEFAULT_NUMBERING_SCOPES,
  OFFICE_TEMPLATE_KIND_LABEL,
  type DocumentEntityType,
  type OfficeTemplateKind,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { useAuth } from "../lib/auth.js";

const ENTITY_TYPES = Object.keys(DOCUMENT_ENTITY_LABEL) as DocumentEntityType[];

export function DocumentsRegister() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const listQ = trpc.documents.register.useQuery({
    entityType: typeFilter ? (typeFilter as DocumentEntityType) : undefined,
    status: statusFilter ? (statusFilter as "DRAFT" | "ISSUED" | "SUPERSEDED") : undefined,
    limit: 300,
  });
  const exportQ = trpc.documents.registerExport.useQuery(
    {
      entityType: typeFilter ? (typeFilter as DocumentEntityType) : undefined,
      status: statusFilter ? (statusFilter as "DRAFT" | "ISSUED" | "SUPERSEDED") : undefined,
      limit: 500,
    },
    { enabled: false },
  );
  const patternsQ = trpc.documents.numberingPatterns.useQuery();
  const templatesQ = trpc.documents.listTemplates.useQuery();
  const utils = trpc.useUtils();
  const setPatterns = trpc.documents.setNumberingPatterns.useMutation({
    onSuccess: () => utils.documents.numberingPatterns.invalidate(),
  });
  const createTemplate = trpc.documents.createTemplate.useMutation({
    onSuccess: () => utils.documents.listTemplates.invalidate(),
  });
  const removeTemplate = trpc.documents.removeTemplate.useMutation({
    onSuccess: () => utils.documents.listTemplates.invalidate(),
  });

  const [patternEdits, setPatternEdits] = useState<Record<string, { prefix: string; padding: string }>>({});
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState({ kind: "LETTER" as OfficeTemplateKind, title: "", body: "" });

  const rows = listQ.data ?? [];

  const docLink = (entityType: DocumentEntityType, projectId: string | null) => {
    if (projectId) return `/projects/${projectId}?tab=documents`;
    if (entityType === "LETTER") return "/office/letters";
    if (entityType === "CONTRACT") return "/office/contracts";
    if (entityType === "PROPOSAL") return "/office/proposals";
    if (entityType === "FEE_PROPOSAL") return "/accounting/fees";
    return undefined;
  };

  return (
    <>
      <PageHeader
        title="Document register"
        description="Unified view of issued office and project documents — numbers, versions, and PDF status."
        actions={
          <Button
            kind="secondary"
            size="sm"
            renderIcon={Download}
            disabled={exportQ.isFetching}
            onClick={async () => {
              const data = await exportQ.refetch();
              if (data.data?.length) downloadXlsx(data.data, "Register", "esti-document-register");
            }}
          >
            Export XLSX
          </Button>
        }
      />

      <Stack gap={7}>
        <Stack orientation="horizontal" gap={5}>
          <Select id="doc-type-filter" labelText="Type" size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <SelectItem value="" text="All types" />
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t} text={DOCUMENT_ENTITY_LABEL[t]} />
            ))}
          </Select>
          <Select id="doc-status-filter" labelText="Status" size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <SelectItem value="" text="All statuses" />
            <SelectItem value="DRAFT" text="Draft" />
            <SelectItem value="ISSUED" text="Issued" />
          </Select>
        </Stack>

        <DataState loading={listQ.isLoading} isEmpty={rows.length === 0} columnCount={7} empty={{ title: "No documents", description: "Create letters, site reports, BOQs, or MOM on a project." }}>
          <TableContainer title="All documents">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Ref</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Project</TableHeader>
                  <TableHeader>Ver</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>PDF</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const to = docLink(r.entityType, r.projectId);
                  return (
                    <TableRow key={`${r.entityType}-${r.id}`}>
                      <TableCell>{to ? <Link to={to}>{r.ref}</Link> : r.ref}</TableCell>
                      <TableCell>{DOCUMENT_ENTITY_LABEL[r.entityType]}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.projectRef ?? "—"}</TableCell>
                      <TableCell>{r.versionNo}</TableCell>
                      <TableCell>
                        <Tag type={r.status === "ISSUED" ? "green" : "gray"} size="sm">{r.status}</Tag>
                      </TableCell>
                      <TableCell>{r.pdfStatus === "READY" ? "Ready" : r.pdfStatus}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>

        {isOwner && (
          <Stack gap={5}>
            <h3>Numbering patterns</h3>
            <p className="esti-label esti-label--helper">Override FY-sequential prefixes per document scope.</p>
            <Button
              size="sm"
              disabled={setPatterns.isPending}
              onClick={() => {
                const next = { ...(patternsQ.data ?? {}) };
                for (const [scope, edit] of Object.entries(patternEdits)) {
                  if (!edit.prefix && !edit.padding) continue;
                  next[scope] = {
                    prefix: edit.prefix || undefined,
                    padding: edit.padding ? Number(edit.padding) : undefined,
                  };
                }
                setPatterns.mutate(next);
              }}
            >
              Save numbering defaults
            </Button>
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Scope</TableHeader>
                    <TableHeader>Default</TableHeader>
                    <TableHeader>Prefix override</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(DEFAULT_NUMBERING_SCOPES).map(([scope, def]) => (
                    <TableRow key={scope}>
                      <TableCell>{scope}</TableCell>
                      <TableCell>{def.prefix}</TableCell>
                      <TableCell>
                        <TextInput
                          id={`np-${scope}`}
                          labelText="Prefix"
                          hideLabel
                          size="sm"
                          placeholder={def.prefix}
                          onChange={(e) =>
                            setPatternEdits((p) => ({
                              ...p,
                              [scope]: { prefix: e.target.value, padding: String(def.padding) },
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        <Stack gap={4}>
          <Stack orientation="horizontal" gap={3}>
            <h3>Office templates</h3>
            <Button size="sm" onClick={() => setTplOpen(true)}>New template</Button>
          </Stack>
          <TableContainer title="Templates">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Kind</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(templatesQ.data ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{OFFICE_TEMPLATE_KIND_LABEL[t.kind as OfficeTemplateKind] ?? t.kind}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      <Button kind="danger--ghost" size="sm" onClick={() => removeTemplate.mutate({ id: t.id })}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Stack>

      <Modal
        open={tplOpen}
        modalHeading="New office template"
        primaryButtonText={createTemplate.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!tplForm.title || !tplForm.body || createTemplate.isPending}
        onRequestClose={() => setTplOpen(false)}
        onRequestSubmit={() => {
          createTemplate.mutate(tplForm, {
            onSuccess: () => {
              setTplOpen(false);
              setTplForm({ kind: "LETTER", title: "", body: "" });
            },
          });
        }}
      >
        <Stack gap={5}>
          <Select id="tpl-kind" labelText="Kind" value={tplForm.kind} onChange={(e) => setTplForm((f) => ({ ...f, kind: e.target.value as OfficeTemplateKind }))}>
            {(Object.keys(OFFICE_TEMPLATE_KIND_LABEL) as OfficeTemplateKind[]).map((k) => (
              <SelectItem key={k} value={k} text={OFFICE_TEMPLATE_KIND_LABEL[k]} />
            ))}
          </Select>
          <TextInput id="tpl-title" labelText="Title" value={tplForm.title} onChange={(e) => setTplForm((f) => ({ ...f, title: e.target.value }))} />
          <TextArea id="tpl-body" labelText="Body" rows={8} value={tplForm.body} onChange={(e) => setTplForm((f) => ({ ...f, body: e.target.value }))} />
        </Stack>
      </Modal>
    </>
  );
}
