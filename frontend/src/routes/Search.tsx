import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
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

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

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
    <Stack spacing={3}>
      <PageHeader
        title="Search"
        description="Permission-aware search across projects, documents, knowledge catalogues, and lessons."
      />

      <Stack spacing={2}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField
            id="global-search"
            label="Search"
            placeholder="Search projects, templates, rate books, lessons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            sx={{ flex: "1 1 280px", maxWidth: 480 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button variant="contained" onClick={runSearch} disabled={query.trim().length < 2}>
            Search
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            id="search-types"
            select
            label="Object types"
            value={typeFilter}
            onChange={(e) => {
              const value = e.target.value as unknown as SearchEntityTypeT[] | string;
              setTypeFilter(typeof value === "string" ? (value ? (value.split(",") as SearchEntityTypeT[]) : []) : value);
            }}
            sx={{ minWidth: 280, flex: 1 }}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected) =>
                  (selected as SearchEntityTypeT[]).map((t) => SEARCH_ENTITY_LABEL[t]).join(", ") || "Filter by type",
              },
            }}
          >
            {typeItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.text}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id="search-project"
            select
            label="Limit to project (optional)"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">All projects</MenuItem>
            {(projectsQ.data ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
            ))}
          </TextField>
        </Box>

        {appliedQ.length >= 2 && Object.keys(typeCounts).length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {Object.entries(typeCounts).map(([t, n]) => (
              <TagChip
                key={t}
                color="blue"
                label={`${SEARCH_ENTITY_LABEL[t as SearchEntityTypeT] ?? t} (${n})`}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {appliedQ.length < 2 ? (
        <Typography variant="body2">Enter at least 2 characters to search.</Typography>
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
          <Stack spacing={2}>
            <Typography variant="subtitle1" component="h3">{`Results for “${appliedQ}”`}</Typography>
            <Stack spacing={1}>
              {hits.map((h) => (
                <Paper key={`${h.entityType}-${h.entityId}`} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                        <TagChip color="gray" label={SEARCH_ENTITY_LABEL[h.entityType]} />
                        <Typography variant="subtitle2" noWrap>{h.title}</Typography>
                      </Stack>
                      <Button component={Link} to={h.href} variant="text" size="small">
                        Open
                      </Button>
                    </Stack>
                    {h.snippet && (
                      <Typography variant="body2" color="text.secondary">{h.snippet}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Project:{" "}
                      {h.projectRef && h.projectId ? (
                        <Link to={`/projects/${h.projectId}`}>{h.projectRef}</Link>
                      ) : (
                        h.projectRef ?? "—"
                      )}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </DataState>
      )}
    </Stack>
  );
}
