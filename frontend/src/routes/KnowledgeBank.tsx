import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { SEARCH_ENTITY_LABEL } from "@esti/contracts";
import { PageHeader } from "../components/PageHeader.js";
import { SpecCatalogManager } from "../components/knowledge/SpecCatalogManager.js";
import { ItemLibrary } from "../components/knowledge/kb/ItemLibrary.js";
import { RateBookLibrary } from "../components/knowledge/kb/RateBookLibrary.js";
import { trpc } from "../lib/trpc.js";

const KB_TAB_SLUGS = ["items", "specification", "rate-book"] as const;

const SEARCH_TYPES = "OFFICE_TEMPLATE,DSR_ITEM,SPEC_CATALOG,SPEC_STANDARD,DRAWING,CONTRACTOR,LESSON";

function KnowledgeBankSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const kbQ = trpc.search.knowledgeBank.useQuery(
    { q: q.trim(), limit: 12 },
    { enabled: q.trim().length >= 2 },
  );

  const hits = kbQ.data?.hits ?? [];
  const columns: GridColDef[] = [
    {
      field: "type",
      headerName: "Type",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Chip
          label={SEARCH_ENTITY_LABEL[params.row.entityType as keyof typeof SEARCH_ENTITY_LABEL] ?? params.row.entityType}
          size="small"
          sx={{
            backgroundColor: "var(--cds-tag-background-gray)",
            color: "var(--cds-tag-color-gray)",
          }}
        />
      ),
    },
    { field: "title", headerName: "Title", flex: 2, minWidth: 200 },
    {
      field: "open",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (params) => <Link to={params.row.href}>Open</Link>,
    },
  ];
  const rows = hits.map((h) => ({
    id: `${h.entityType}-${h.entityId}`,
    entityType: h.entityType,
    title: h.title,
    href: h.href,
  }));

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">Search Knowledge Bank</Typography>
          <Typography variant="body2">
            Templates, rate books, specification catalogue, drawings, contractors, and published lessons.
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          sx={{ flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <Box sx={{ flex: "1 1 240px", maxWidth: 420 }}>
            <TextField
              id="kb-search"
              label="Knowledge search"
              placeholder="Search catalogues and templates…"
              fullWidth
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim().length >= 2) {
                  navigate(`/search?q=${encodeURIComponent(q.trim())}&types=${SEARCH_TYPES}`);
                }
              }}
            />
          </Box>
          <Button
            variant="outlined"
            disabled={q.trim().length < 2}
            onClick={() =>
              navigate(`/search?q=${encodeURIComponent(q.trim())}&types=${SEARCH_TYPES}`)
            }
          >
            Full search
          </Button>
        </Stack>
        {q.trim().length >= 2 && (
          <DataState
            loading={kbQ.isLoading}
            isEmpty={hits.length === 0}
            columnCount={3}
            empty={{ title: "No matches", description: "Try a different term or open full search." }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
              onRowClick={(params) => navigate(params.row.href)}
            />
          </DataState>
        )}
      </Stack>
    </Paper>
  );
}

export function KnowledgeBank() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabIndex = Math.max(0, KB_TAB_SLUGS.indexOf(
    (searchParams.get("tab") ?? "items") as (typeof KB_TAB_SLUGS)[number],
  ));
  const selectTab = (index: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", KB_TAB_SLUGS[index] ?? "materials");
      return next;
    }, { replace: true });
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Knowledge Bank"
        description="Governed office reference library — items, specifications, and the office rate book."
      />

      <KnowledgeBankSearch />

      <Tabs
        value={tabIndex}
        onChange={(_e, v) => selectTab(v)}
        aria-label="Knowledge Bank sections"
      >
        <Tab label="Items" />
        <Tab label="Specification" />
        <Tab label="Rate Book" />
      </Tabs>

      {tabIndex === 0 && <ItemLibrary />}
      {tabIndex === 1 && <SpecCatalogManager embedded />}
      {tabIndex === 2 && <RateBookLibrary />}
    </Stack>
  );
}
