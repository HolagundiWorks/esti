import {
  Button,
  MultiSelect,
  Search,
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
} from "@carbon/react";
import {
  SEARCH_ENTITY_LABEL,
  SearchEntityType,
  type SearchEntityType as SearchEntityTypeT,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

const ALL_TYPES = SearchEntityType.options;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [appliedQ, setAppliedQ] = useState(initialQ.length >= 2 ? initialQ : "");
  const [typeFilter, setTypeFilter] = useState<SearchEntityTypeT[]>(() => {
    const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];
    return types.filter((t): t is SearchEntityTypeT => ALL_TYPES.includes(t as SearchEntityTypeT));
  });
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");

  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setAppliedQ(q.length >= 2 ? q : "");
    const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];
    setTypeFilter(types.filter((t): t is SearchEntityTypeT => ALL_TYPES.includes(t as SearchEntityTypeT)));
    setProjectId(searchParams.get("project") ?? "");
  }, [searchParams]);

  const searchQ = trpc.search.query.useQuery(
    {
      q: appliedQ,
      types: typeFilter.length ? typeFilter : undefined,
      projectId: projectId || undefined,
      limit: 80,
    },
    { enabled: appliedQ.length >= 2 },
  );

  const typeItems = useMemo(
    () => ALL_TYPES.map((t) => ({ id: t, text: SEARCH_ENTITY_LABEL[t] })),
    [],
  );

  function runSearch() {
    const q = query.trim();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set("q", q);
      else next.delete("q");
      if (typeFilter.length) next.set("types", typeFilter.join(","));
      else next.delete("types");
      if (projectId) next.set("project", projectId);
      else next.delete("project");
      return next;
    }, { replace: true });
    setAppliedQ(q.length >= 2 ? q : "");
  }

  const hits = searchQ.data?.hits ?? [];
  const typeCounts = searchQ.data?.typeCounts ?? {};

  return (
    <Stack gap={6}>
      <PageHeader
        title="Search"
        description="Permission-aware search across projects, documents, knowledge catalogues, and lessons."
      />

      <Stack gap={4}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px", maxWidth: 480 }}>
            <Search
              id="global-search"
              labelText="Search"
              placeholder="Search projects, templates, rate books, lessons…"
              size="lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </div>
          <Button onClick={runSearch} disabled={query.trim().length < 2}>
            Search
          </Button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 280, flex: 1 }}>
            <MultiSelect
              id="search-types"
              titleText="Object types"
              label="Filter by type"
              items={typeItems}
              itemToString={(item) => item?.text ?? ""}
              initialSelectedItems={typeItems.filter((i) => typeFilter.includes(i.id))}
              onChange={({ selectedItems }) =>
                setTypeFilter(selectedItems?.map((i) => i.id) ?? [])
              }
            />
          </div>
          <Select
            id="search-project"
            labelText="Limit to project (optional)"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <SelectItem value="" text="All projects" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
            ))}
          </Select>
        </div>

        {appliedQ.length >= 2 && Object.keys(typeCounts).length > 0 && (
          <Stack orientation="horizontal" gap={2}>
            {Object.entries(typeCounts).map(([t, n]) => (
              <Tag key={t} type="blue" size="sm">
                {SEARCH_ENTITY_LABEL[t as SearchEntityTypeT] ?? t} ({n})
              </Tag>
            ))}
          </Stack>
        )}
      </Stack>

      {appliedQ.length < 2 ? (
        <p>Enter at least 2 characters to search.</p>
      ) : (
        <DataState
          loading={searchQ.isLoading}
          isEmpty={hits.length === 0}
          columnCount={4}
          empty={{
            title: "No results",
            description: `Nothing matched “${appliedQ}” with your filters.`,
          }}
        >
          <TableContainer title={`Results for “${appliedQ}”`}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Snippet</TableHeader>
                  <TableHeader>Project</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {hits.map((h) => (
                  <TableRow key={`${h.entityType}-${h.entityId}`}>
                    <TableCell>
                      <Tag size="sm" type="gray">
                        {SEARCH_ENTITY_LABEL[h.entityType]}
                      </Tag>
                    </TableCell>
                    <TableCell>{h.title}</TableCell>
                    <TableCell>{h.snippet}</TableCell>
                    <TableCell>
                      {h.projectRef && h.projectId ? (
                        <Link to={`/projects/${h.projectId}`}>{h.projectRef}</Link>
                      ) : (
                        h.projectRef ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to={h.href}>
                        <Button kind="ghost" size="sm">Open</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      )}
    </Stack>
  );
}
