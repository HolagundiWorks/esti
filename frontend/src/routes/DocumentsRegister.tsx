import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Download from "@mui/icons-material/Download";
import {
  DOCUMENT_ENTITY_LABEL,
  DEFAULT_NUMBERING_SCOPES,
  OFFICE_TEMPLATE_KIND_LABEL,
  type DocumentEntityType,
  type OfficeTemplateKind,
  type TagColor,
} from "@esti/contracts";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { Link } from "react-router-dom";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { useAuth } from "../lib/auth.js";

const ENTITY_TYPES = Object.keys(DOCUMENT_ENTITY_LABEL) as DocumentEntityType[];

const DOC_STATUS_TAG: Record<string, TagColor> = { ISSUED: "green" };

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

  useScreenActions(
    tplOpen
      ? []
      : [
          {
            id: "new-template",
            zone: "center",
            tone: "primary",
            label: "New template",
            icon: <AddIcon />,
            onClick: () => setTplOpen(true),
          },
          {
            id: "export-xlsx",
            zone: "right",
            label: "Export XLSX",
            icon: <Download />,
            disabled: exportQ.isFetching,
            onClick: async () => {
              const data = await exportQ.refetch();
              if (data.data?.length) downloadXlsx(data.data, "Register", "esti-document-register");
            },
          },
        ],
    [tplOpen, exportQ.isFetching],
  );
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

  const columns: GridColDef[] = [
    {
      field: "ref",
      headerName: "Ref",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => {
        const to = docLink(p.row.entityType, p.row.projectId);
        return to ? <Link to={to}>{p.row.ref}</Link> : p.row.ref;
      },
    },
    {
      field: "entityType",
      headerName: "Type",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => DOCUMENT_ENTITY_LABEL[row.entityType as DocumentEntityType],
    },
    { field: "title", headerName: "Title", flex: 2, minWidth: 180 },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 110,
      valueGetter: (v) => v ?? "—",
    },
    { field: "versionNo", headerName: "Ver", width: 80 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (p) => <StatusTag value={p.row.status} map={DOC_STATUS_TAG} />,
    },
    {
      field: "pdfStatus",
      headerName: "PDF",
      width: 110,
      valueGetter: (v) => (v === "READY" ? "Ready" : v),
    },
  ];

  return (
    <>
      <RailLayout
        title="Document register"
        description="Unified view of issued office and project documents — numbers, versions, and PDF status."
        aside={
          <Stack spacing={1.5}>
            <TextField
              id="doc-type-filter"
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All types</MenuItem>
              {ENTITY_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{DOCUMENT_ENTITY_LABEL[t]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="doc-status-filter"
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="ISSUED">Issued</MenuItem>
            </TextField>
          </Stack>
        }
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Documents" }]} />
        <DataState loading={listQ.isLoading} isEmpty={rows.length === 0} columnCount={7} empty={{ title: "No documents", description: "Create letters, site reports, BOQs, or MOM on a project." }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => `${r.entityType}-${r.id}`}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
          />
        </DataState>

        {isOwner && (
          <Stack spacing={2}>
            <Typography variant="h6">Numbering patterns</Typography>
            <p className="esti-label esti-label--helper">Override FY-sequential prefixes per document scope.</p>
            <div>
              <Button
                variant="contained"
                size="small"
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
            </div>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scope</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell>Prefix override</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(DEFAULT_NUMBERING_SCOPES).map(([scope, def]) => (
                    <TableRow key={scope}>
                      <TableCell>{scope}</TableCell>
                      <TableCell>{def.prefix}</TableCell>
                      <TableCell>
                        <TextField
                          id={`np-${scope}`}
                          size="small"
                          aria-label="Prefix"
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

        <Stack spacing={2}>
          <Typography variant="h6">Office templates</Typography>
          <DataGrid
            rows={templatesQ.data ?? []}
            columns={[
              {
                field: "kind",
                headerName: "Kind",
                flex: 1,
                minWidth: 140,
                valueGetter: (v) => OFFICE_TEMPLATE_KIND_LABEL[v as OfficeTemplateKind] ?? v,
              },
              { field: "title", headerName: "Title", flex: 2, minWidth: 200 },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 60,
                renderCell: (p) => (
                  <RowActionsMenu
                    actions={[
                      { label: "Remove", onClick: () => removeTemplate.mutate({ id: p.row.id }), danger: true },
                    ]}
                  />
                ),
              },
            ]}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      </RailLayout>

      <Dialog aria-labelledby="documents-register-template-title" open={tplOpen} onClose={() => setTplOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="documents-register-template-title">New office template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="tpl-kind"
              select
              label="Kind"
              value={tplForm.kind}
              onChange={(e) => setTplForm((f) => ({ ...f, kind: e.target.value as OfficeTemplateKind }))}
            >
              {(Object.keys(OFFICE_TEMPLATE_KIND_LABEL) as OfficeTemplateKind[]).map((k) => (
                <MenuItem key={k} value={k}>{OFFICE_TEMPLATE_KIND_LABEL[k]}</MenuItem>
              ))}
            </TextField>
            <TextField id="tpl-title" label="Title" value={tplForm.title} onChange={(e) => setTplForm((f) => ({ ...f, title: e.target.value }))} />
            <TextField id="tpl-body" label="Body" multiline rows={8} value={tplForm.body} onChange={(e) => setTplForm((f) => ({ ...f, body: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setTplOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!tplForm.title || !tplForm.body || createTemplate.isPending}
            onClick={() => {
              createTemplate.mutate(tplForm, {
                onSuccess: () => {
                  setTplOpen(false);
                  setTplForm({ kind: "LETTER", title: "", body: "" });
                },
              });
            }}
          >
            {createTemplate.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
