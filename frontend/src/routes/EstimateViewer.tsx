import {
  Dropdown,
  FileUploaderButton,
  InlineNotification,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { formatINR, type CostedEstimate } from "@esti/contracts";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const EST_TAB_SLUGS = ["abstract", "boq", "materials", "steel"] as const;
const inr = (paise: number) => formatINR(paise, { paise: false });
const qty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** Variance tag — green when the rate book costs less than the estimate, red when more. */
function VarianceTag({ paise }: { paise: number }) {
  if (paise === 0) return <Tag type="gray" size="sm">±0</Tag>;
  return (
    <Tag type={paise < 0 ? "green" : "red"} size="sm">
      {paise < 0 ? "−" : "+"}
      {inr(Math.abs(paise))}
    </Tag>
  );
}

const scroll = { maxHeight: "58vh", overflowY: "auto" } as const;

type Costed = CostedEstimate;

function AbstractTab({ c }: { c: Costed }) {
  const rows = c.abstract.rows;
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={8} empty={{ title: "No items" }}>
      <TableContainer
        title="Abstract of cost"
        description={`As-estimated ${inr(c.abstract.totalEstimatedPaise)} · costed ${inr(c.abstract.totalCostedPaise)}`}
      >
        <div style={scroll}>
          <Table size="sm" useZebraStyles stickyHeader>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Item</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Rate (est.)</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Variance</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.shortName}</TableCell>
                  <TableCell>{r.uom}</TableCell>
                  <TableCell>{qty(r.qty)}</TableCell>
                  <TableCell>{inr(r.ratePaiseEstimated)}</TableCell>
                  <TableCell>
                    {inr(r.ratePaise)} {r.rateSource === "estimate" && <Tag type="cool-gray" size="sm">est.</Tag>}
                  </TableCell>
                  <TableCell>{inr(r.amountPaise)}</TableCell>
                  <TableCell>
                    <VarianceTag paise={r.variancePaise} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableContainer>
    </DataState>
  );
}

function BoqTab({ c }: { c: Costed }) {
  return (
    <DataState loading={false} isEmpty={c.boq.sections.length === 0} columnCount={6} empty={{ title: "No items" }}>
      <Stack gap={5}>
        {c.boq.sections.map((sec) => (
          <TableContainer key={sec.section} title={sec.section} description={`Subtotal ${inr(sec.subtotalPaise)}`}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Amount</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {sec.rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.shortName}</TableCell>
                    <TableCell>{r.uom}</TableCell>
                    <TableCell>{qty(r.qty)}</TableCell>
                    <TableCell>{inr(r.ratePaise)}</TableCell>
                    <TableCell>{inr(r.amountPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
      </Stack>
    </DataState>
  );
}

function MaterialsTab({ c }: { c: Costed }) {
  const rows = c.materials.rows;
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={6} empty={{ title: "No material take-off" }}>
      <TableContainer title="Material take-off" description={`Procurement value ${inr(c.materials.totalPaise)}`}>
        <div style={scroll}>
          <Table size="sm" useZebraStyles stickyHeader>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Material</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Value</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>{qty(r.qty)}</TableCell>
                  <TableCell>
                    {inr(r.ratePaise)} {r.rateSource === "estimate" && <Tag type="cool-gray" size="sm">est.</Tag>}
                  </TableCell>
                  <TableCell>{inr(r.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableContainer>
    </DataState>
  );
}

function SteelTab({ c }: { c: Costed }) {
  const rows = c.steel.rows;
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={6} empty={{ title: "No reinforcement" }}>
      <TableContainer
        title="Steel reinforcement"
        description={`${qty(c.steel.totalWeightKg)} kg · value ${inr(c.steel.totalPaise)}`}
      >
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>Ø (mm)</TableHeader>
              <TableHeader>Unit wt (kg/m)</TableHeader>
              <TableHeader>Weight (kg)</TableHeader>
              <TableHeader>Rate (₹/kg)</TableHeader>
              <TableHeader>Value</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.diaMm}>
                <TableCell>{r.diaMm}</TableCell>
                <TableCell>{r.unitWeightKgM}</TableCell>
                <TableCell>{qty(r.weightKg)}</TableCell>
                <TableCell>
                  {inr(r.ratePaise)} {r.rateSource === "estimate" && <Tag type="cool-gray" size="sm">est.</Tag>}
                </TableCell>
                <TableCell>{inr(r.amountPaise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DataState>
  );
}

export function EstimateViewer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { authorizedFetch } = useUploadAuth();
  const utils = trpc.useUtils();

  const list = trpc.estimates.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimates = list.data ?? [];
  const activeId = selectedId ?? estimates[0]?.id ?? null;
  const recost = trpc.estimates.recost.useQuery({ id: activeId ?? "" }, { enabled: !!activeId });

  const tabIndex = Math.max(
    0,
    EST_TAB_SLUGS.indexOf((searchParams.get("tab") ?? "abstract") as (typeof EST_TAB_SLUGS)[number]),
  );
  const selectTab = (index: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", EST_TAB_SLUGS[index] ?? "abstract");
    setSearchParams(next, { replace: true });
  };

  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/estimate", (fd) => {
        fd.append("title", file.name.replace(/\.aormsest$|\.json$/i, ""));
        fd.append("file", file);
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      await utils.estimates.list.invalidate();
      if (body.id) setSelectedId(body.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const costed = recost.data?.costed;

  return (
    <Stack gap={6}>
      <PageHeader
        title="Estimate Viewer"
        description="Import an .aormsest estimate and re-cost it against the office rate book. Quantities are frozen; only the rate is the lever."
        actions={
          <FileUploaderButton
            labelText={busy ? "Importing…" : "Import .aormsest"}
            size="md"
            accept={[".aormsest", ".json"]}
            disableLabelChanges
            disabled={busy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
            }}
          />
        }
      />

      {error && (
        <InlineNotification kind="error" title="Import failed" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
      )}

      <Stack orientation="horizontal" gap={4}>
        <Dropdown
          id="estimate-select"
          className="esti-grow"
          titleText="Estimate"
          label="Select an imported estimate"
          items={estimates}
          itemToString={(it) => (it ? it.title : "")}
          selectedItem={estimates.find((e) => e.id === activeId) ?? null}
          onChange={({ selectedItem }) => setSelectedId(selectedItem?.id ?? null)}
        />
        {recost.data && (
          <Stack gap={2}>
            <span className="esti-label esti-label--helper">
              Rate book: {recost.data.rateBook.name} ({recost.data.rateBook.entryCount} rates)
            </span>
            <Stack orientation="horizontal" gap={3}>
              <Tag type="blue">Estimate {inr(costed!.abstract.totalEstimatedPaise)}</Tag>
              <Tag type="teal">Costed {inr(costed!.grandTotalPaise)}</Tag>
              <VarianceTag paise={costed!.abstract.totalVariancePaise} />
            </Stack>
          </Stack>
        )}
      </Stack>

      <DataState
        loading={list.isLoading || (!!activeId && recost.isLoading)}
        isEmpty={estimates.length === 0}
        columnCount={8}
        empty={{ title: "No estimates yet", description: "Import an .aormsest file exported from the Estimate app." }}
      >
        {costed ? (
          <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => selectTab(selectedIndex)}>
            <TabList aria-label="Estimate sections" contained>
              <Tab>Abstract</Tab>
              <Tab>BOQ</Tab>
              <Tab>Materials</Tab>
              <Tab>Steel</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <AbstractTab c={costed} />
              </TabPanel>
              <TabPanel>
                <BoqTab c={costed} />
              </TabPanel>
              <TabPanel>
                <MaterialsTab c={costed} />
              </TabPanel>
              <TabPanel>
                <SteelTab c={costed} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <span className="esti-label esti-label--helper">Select an estimate to view its costing.</span>
        )}
      </DataState>
    </Stack>
  );
}
