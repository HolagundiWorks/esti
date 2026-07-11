import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
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
import { useScreenActions } from "@hcw/ui-kit";
import { Link, useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
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

  useScreenActions(
    [
      {
        id: "run-search",
        zone: "right",
        tone: "primary",
        label: "Search",
        icon: <SearchIcon />,
        disabled: query.trim().length < 2,
        onClick: runSearch,
      },
    ],
    [query],
  );

  return (
    <RailLayout
      title="Search"
      description="Permission-aware search across projects, documents, knowledge catalogues, and lessons."
      aside={
        <Stack spacing={2}>
          <TextField
            id="search-types"
            select
            label="Object types"
            value={typeFilter}
            onChange={(e) => {
              const value = e.target.value as unknown as SearchEntityTypeT[] | string;
              setTypeFilter(typeof value === "string" ? (value ? (value.split(",") as SearchEntityTypeT[]) : []) : value);
            }}
            fullWidth
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected) =>
                  (selected as SearchEntityTypeT[]).map((t) => SEARCH_ENTITY_LABEL[t]).join(", ") || "All types",
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
            label="Limit to project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All projects</MenuItem>
            {(projectsQ.data ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
            ))}
          </TextField>
          {appliedQ.length >= 2 && Object.keys(typeCounts).length > 0 && (
            <Stack spacing={0.75}>
              <Typography variant="overline" color="text.secondary">
                Result mix
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
                {Object.entries(typeCounts).map(([t, n]) => (
                  <StatusDot
                    key={t}
                    color="blue"
                    label={`${SEARCH_ENTITY_LABEL[t as SearchEntityTypeT] ?? t} (${n})`}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      }
    >
      <PageBreadcrumb items={[{ label: "Search" }]} />

      <Stack spacing={2}>
        <TextField
          id="global-search"
          label="Search"
          placeholder="Search projects, templates, rate books, lessons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          fullWidth
          helperText="Enter at least 2 characters, then use the dock Search action or press Enter."
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

        {appliedQ.length < 2 ? (
          <Typography variant="body2" color="text.secondary">
            Enter at least 2 characters to search.
          </Typography>
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
              <Typography variant="subtitle1" component="h2">{`Results for “${appliedQ}”`}</Typography>
              <Stack spacing={1}>
                {hits.map((h) => (
                  <Box
                    key={`${h.entityType}-${h.entityId}`}
                    sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", justifyContent: "space-between" }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                          <StatusDot color="gray" label={SEARCH_ENTITY_LABEL[h.entityType]} />
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
                  </Box>
                ))}
              </Stack>
            </Stack>
          </DataState>
        )}
      </Stack>
    </RailLayout>
  );
}
