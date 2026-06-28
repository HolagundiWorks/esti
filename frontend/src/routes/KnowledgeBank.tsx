import {
  Button,
  Search,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Tile,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LessonsBank } from "../components/ProjectLessons.js";
import { DataState } from "../components/DataState.js";
import { SEARCH_ENTITY_LABEL } from "@esti/contracts";
import { PageHeader } from "../components/PageHeader.js";
import { SpecCatalogManager } from "../components/knowledge/SpecCatalogManager.js";
import { trpc } from "../lib/trpc.js";

const KB_TAB_SLUGS = ["specification", "lessons"] as const;

function KnowledgeBankSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const kbQ = trpc.search.knowledgeBank.useQuery(
    { q: q.trim(), limit: 12 },
    { enabled: q.trim().length >= 2 },
  );

  return (
    <Tile>
      <Stack gap={4}>
        <Stack gap={2}>
          <h3>Search Knowledge Bank</h3>
          <p style={{ margin: 0 }}>
            Templates, rate books, specification catalogue, drawings, contractors, and published lessons.
          </p>
        </Stack>
        <Stack orientation="horizontal" gap={4} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px", maxWidth: 420 }}>
            <Search
              id="kb-search"
              labelText="Knowledge search"
              placeholder="Search catalogues and templates…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim().length >= 2) {
                  navigate(`/search?q=${encodeURIComponent(q.trim())}&types=OFFICE_TEMPLATE,DSR_ITEM,SPEC_CATALOG,SPEC_STANDARD,DRAWING,CONTRACTOR,LESSON`);
                }
              }}
            />
          </div>
          <Button
            kind="tertiary"
            disabled={q.trim().length < 2}
            onClick={() =>
              navigate(`/search?q=${encodeURIComponent(q.trim())}&types=OFFICE_TEMPLATE,DSR_ITEM,SPEC_CATALOG,SPEC_STANDARD,DRAWING,CONTRACTOR,LESSON`)
            }
          >
            Full search
          </Button>
        </Stack>
        {q.trim().length >= 2 && (
          <DataState loading={kbQ.isLoading} isEmpty={(kbQ.data?.hits ?? []).length === 0} columnCount={3} empty={{ title: "No matches", description: "Try a different term or open full search." }}>
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(kbQ.data?.hits ?? []).map((h) => (
                    <TableRow key={`${h.entityType}-${h.entityId}`}>
                      <TableCell><Tag size="sm" type="gray">{SEARCH_ENTITY_LABEL[h.entityType]}</Tag></TableCell>
                      <TableCell>{h.title}</TableCell>
                      <TableCell><Link to={h.href}>Open</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        )}
      </Stack>
    </Tile>
  );
}

export function KnowledgeBank() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabIndex = Math.max(0, KB_TAB_SLUGS.indexOf(
    (searchParams.get("tab") ?? "specification") as (typeof KB_TAB_SLUGS)[number],
  ));
  const selectTab = (index: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", KB_TAB_SLUGS[index] ?? "specification");
      return next;
    }, { replace: true });
  };

  return (
    <Stack gap={7}>
      <PageHeader
        title="Knowledge Bank"
        description="Governed office standards used by estimation, specifications, and procurement workflows."
      />

      <KnowledgeBankSearch />

      <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => selectTab(selectedIndex)}>
        <TabList aria-label="Knowledge Bank sections">
          <Tab>Specification</Tab>
          <Tab>Lessons</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SpecCatalogManager embedded />
          </TabPanel>

          <TabPanel>
            <LessonsBank />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
