import {
  Button,
  DataTable,
  InlineNotification,
  Modal,
  Pagination,
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
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  TextInput,
} from "@carbon/react";
import { Jurisdiction, PROJECT_STATUS_LABEL, ProjectStatus, ProjectType, formatINR } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const HEADERS = [
  { key: "ref", header: "Ref" },
  { key: "title", header: "Title" },
  { key: "projectType", header: "Type" },
  { key: "status", header: "Status" },
  { key: "value", header: "Contract value" },
];

const PAGE_SIZES = [10, 25, 50];

export function Projects() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("");
  const list = trpc.projectOffice.list.useQuery({
    limit: 200,
    offset: 0,
    status: statusFilter ? statusFilter as (typeof ProjectStatus.options)[number] : undefined,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<string>("RESIDENTIAL");
  const [jurisdiction, setJurisdiction] = useState<string>("BBMP");
  const [valueRupees, setValueRupees] = useState("");
  const [clientId, setClientId] = useState("");
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 10);

  const create = trpc.projectOffice.create.useMutation({
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      setOpen(false);
      setTitle("");
      setValueRupees("");
    },
  });

  const allRows =
    list.data?.map((p) => ({
      id: p.id,
      ref: <Link to={`/projects/${p.id}`}>{p.ref}</Link>,
      title: p.title,
      projectType: p.projectType,
      status: <Tag type={p.status === "COMPLETED" ? "green" : p.status === "CANCELLED" ? "red" : p.status === "ACTIVE" ? "blue" : p.status === "PROPOSAL" ? "teal" : "gray"}>{PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}</Tag>,
      value: formatINR(p.contractValuePaise, { paise: false }),
    })) ?? [];

  return (
    <div>
      <DataState
        loading={list.isLoading}
        isEmpty={allRows.length === 0}
        columnCount={5}
        empty={{
          title: "No projects yet",
          description: "Create your first project office to start tracking phases, fees and invoices.",
          action: <Button size="sm" onClick={() => setOpen(true)}>New project</Button>,
        }}
      >
        <DataTable rows={allRows} headers={HEADERS} isSortable>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps, onInputChange }) => {
            const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
            return (
              <TableContainer title="Architecture projects" description="All office projects">
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="Search projects…"
                      persistent
                      onChange={(e) => { setPage(1); onInputChange(e); }}
                    />
                    <Select
                      id="project-status-filter"
                      labelText="Project status"
                      hideLabel
                      size="sm"
                      value={statusFilter}
                      onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
                    >
                      <SelectItem value="" text="All statuses" />
                      {ProjectStatus.options.map((status) => (
                        <SelectItem key={status} value={status} text={PROJECT_STATUS_LABEL[status]} />
                      ))}
                    </Select>
                    <Button onClick={() => setOpen(true)}>New project</Button>
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => {
                        const { key, ...rest } = getHeaderProps({ header });
                        return (
                          <TableHeader key={key} {...rest}>
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedRows.map((row) => {
                      const { key, ...rest } = getRowProps({ row });
                      return (
                        <TableRow key={key} {...rest}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination
                  totalItems={rows.length}
                  pageSize={pageSize}
                  pageSizes={PAGE_SIZES}
                  page={page}
                  onChange={({ page: p, pageSize: ps }) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                />
              </TableContainer>
            );
          }}
        </DataTable>
      </DataState>

      <Modal
        open={open}
        modalHeading="New project"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            title,
            projectType: projectType as (typeof ProjectType.options)[number],
            jurisdiction: jurisdiction as (typeof Jurisdiction.options)[number],
            contractValuePaise: Math.round(Number(valueRupees || "0") * 100),
            clientId: clientId || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="title"
            labelText="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            id="projectType"
            labelText="Project type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {ProjectType.options.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <Select
            id="jurisdiction"
            labelText="Jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            {Jurisdiction.options.map((j) => (
              <SelectItem key={j} value={j} text={j} />
            ))}
          </Select>
          <Select
            id="client"
            labelText="Client (optional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <SelectItem value="" text="— none —" />
            {(clientsQ.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id} text={c.name} />
            ))}
          </Select>
          <TextInput
            id="value"
            labelText="Contract value (₹)"
            type="number"
            value={valueRupees}
            onChange={(e) => setValueRupees(e.target.value)}
          />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
