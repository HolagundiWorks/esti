import {
  Button,
  CodeSnippet,
  Column,
  Grid,
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
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const PAGE_SIZES = [10, 25, 50, 100];

type Filters = { search: string; entity: string; action: string };

function jsonDetail(value: unknown) {
  return value === null || value === undefined ? "No snapshot recorded" : JSON.stringify(value, null, 2);
}

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<Filters>({ search: "", entity: "", action: "" });
  const [applied, setApplied] = useState<Filters>(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = trpc.audit.list.useQuery({
    page,
    pageSize,
    search: applied.search || undefined,
    entity: applied.entity || undefined,
    action: applied.action || undefined,
  });
  const selected = list.data?.rows.find((row) => row.id === selectedId) ?? null;

  function applyFilters() {
    setPage(1);
    setApplied(filters);
  }

  function clearFilters() {
    const empty = { search: "", entity: "", action: "" };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  }

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Audit log</h1>
        <p>Append-only record of security-sensitive and operational changes.</p>
      </Stack>

      <Grid condensed>
        <Column sm={4} md={4} lg={6}>
          <TextInput
            id="audit-search"
            labelText="Search actor, entity, or action"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
          />
        </Column>
        <Column sm={4} md={2} lg={3}>
          <Select
            id="audit-entity"
            labelText="Entity"
            value={filters.entity}
            onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value }))}
          >
            <SelectItem value="" text="All entities" />
            {(list.data?.filters.entities ?? []).map((entity) => (
              <SelectItem key={entity} value={entity} text={entity} />
            ))}
          </Select>
        </Column>
        <Column sm={4} md={2} lg={3}>
          <Select
            id="audit-action"
            labelText="Action"
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          >
            <SelectItem value="" text="All actions" />
            {(list.data?.filters.actions ?? []).map((action) => (
              <SelectItem key={action} value={action} text={action} />
            ))}
          </Select>
        </Column>
        <Column sm={4} md={8} lg={4}>
          <Stack orientation="horizontal" gap={3}>
            <Button onClick={applyFilters}>Apply filters</Button>
            <Button kind="secondary" onClick={clearFilters}>Clear</Button>
          </Stack>
        </Column>
      </Grid>

      {list.error && (
        <InlineNotification
          kind="error"
          title="Audit log unavailable"
          subtitle={list.error.message}
          hideCloseButton
          lowContrast
        />
      )}

      <DataState
        loading={list.isLoading}
        isEmpty={!list.error && (list.data?.rows.length ?? 0) === 0}
        columnCount={6}
        empty={{ title: "No audit entries found", description: "Change or clear the current filters." }}
      >
        <TableContainer title="Recorded changes" description={`${list.data?.total ?? 0} entries`}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Time</TableHeader>
                <TableHeader>Entity</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Actor</TableHeader>
                <TableHeader>Record ID</TableHeader>
                <TableHeader>Details</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.rows ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</TableCell>
                  <TableCell>{row.entity}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.actorName ?? row.actorEmail ?? "System"}</TableCell>
                  <TableCell>{row.entityId ?? "—"}</TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => setSelectedId(row.id)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            totalItems={list.data?.total ?? 0}
            onChange={({ page: nextPage, pageSize: nextPageSize }) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </TableContainer>
      </DataState>

      <Modal
        open={selected !== null}
        passiveModal
        modalHeading={selected ? `${selected.entity} · ${selected.action}` : "Audit details"}
        onRequestClose={() => setSelectedId(null)}
      >
        {selected && (
          <Stack gap={5}>
            <p>Record: {selected.entityId ?? "Not associated with a domain record"}</p>
            <p>Actor: {selected.actorName ?? selected.actorEmail ?? selected.actorId ?? "System"}</p>
            <Stack gap={3}>
              <h3>Before</h3>
              <CodeSnippet type="multi">{jsonDetail(selected.before)}</CodeSnippet>
            </Stack>
            <Stack gap={3}>
              <h3>After</h3>
              <CodeSnippet type="multi">{jsonDetail(selected.after)}</CodeSnippet>
            </Stack>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
