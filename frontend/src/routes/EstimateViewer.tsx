import {
  Button,
  Dropdown,
  FileUploaderButton,
  InlineNotification,
  NumberInput,
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
  TextInput,
} from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { formatINR, type CostedEstimate, type RateSource } from "@esti/contracts";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const EST_TAB_SLUGS = ["abstract", "boq", "materials", "steel", "ratebook"] as const;
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

/** Where the costed rate came from — project override, office book, or estimate. */
function SourceTag({ source }: { source: RateSource }) {
  if (source === "project") return <Tag type="purple" size="sm">project</Tag>;
  if (source === "estimate") return <Tag type="cool-gray" size="sm">est.</Tag>;
  return null; // rateBook is the norm — no tag
}

const scroll = { maxHeight: "58vh", overflowY: "auto" } as const;

type Costed = CostedEstimate;

function AbstractTab({ c }: { c: Costed }) {
  const rows = c.abstract.rows;
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={9} empty={{ title: "No items" }}>
      <TableContainer
        title="Abstract of cost"
        description={`As-estimated ${inr(c.abstract.totalEstimatedPaise)} · costed ${inr(c.abstract.totalCostedPaise)}${
          c.abstract.totalLeadPaise ? ` · lead ${inr(c.abstract.totalLeadPaise)}` : ""
        }`}
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
                <TableHeader>Lead</TableHeader>
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
                    {inr(r.ratePaise)} <SourceTag source={r.rateSource} />
                  </TableCell>
                  <TableCell>{r.leadAmountPaise ? inr(r.leadAmountPaise) : "—"}</TableCell>
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
                    {inr(r.ratePaise)} <SourceTag source={r.rateSource} />
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

/** The project rate book — a project's rate overrides that win over the office
 *  book when re-costing. Seed from the office book, then edit individual rates. */
function ProjectRateBook({ projectId }: { projectId: string | null }) {
  const utils = trpc.useUtils();
  const rows = trpc.estimates.projectRates.useQuery({ projectId: projectId ?? "" }, { enabled: !!projectId });
  const invalidate = () => {
    void utils.estimates.projectRates.invalidate();
    void utils.estimates.recost.invalidate();
  };
  const seed = trpc.estimates.seedProjectRatesFromOffice.useMutation({ onSuccess: invalidate });
  const setRate = trpc.estimates.setProjectRate.useMutation({ onSuccess: invalidate });
  const remove = trpc.estimates.removeProjectRate.useMutation({ onSuccess: invalidate });

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [rupees, setRupees] = useState(0);

  if (!projectId) {
    return (
      <span className="esti-label esti-label--helper">
        Import this estimate under a project (projectId) to keep a project rate book. Costing then prefers project rate →
        office rate → as-estimated.
      </span>
    );
  }

  function saveOverride() {
    if (!projectId || !code.trim()) return;
    setRate.mutate(
      { projectId, code: code.trim(), description: description.trim(), unit: unit.trim(), ratePaise: Math.round(rupees * 100) },
      { onSuccess: () => { setCode(""); setDescription(""); setUnit(""); setRupees(0); } },
    );
  }

  const list = rows.data ?? [];
  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3}>
        <Button size="sm" kind="tertiary" disabled={seed.isPending} onClick={() => seed.mutate({ projectId })}>
          {seed.isPending ? "Seeding…" : "Seed from office rate book"}
        </Button>
        <span className="esti-label esti-label--helper">{list.length} project override(s)</span>
      </Stack>

      <Stack orientation="horizontal" gap={3} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <TextInput id="pr-code" labelText="Item code" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextInput id="pr-desc" labelText="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextInput id="pr-unit" labelText="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <NumberInput
          id="pr-rate"
          label="Rate (₹)"
          min={0}
          step={1}
          value={rupees}
          onChange={(_e, { value }) => setRupees(Number(value) || 0)}
        />
        <Button size="sm" disabled={!code.trim() || setRate.isPending} onClick={saveOverride}>
          Save override
        </Button>
      </Stack>

      <DataState loading={rows.isLoading} isEmpty={list.length === 0} columnCount={5} empty={{ title: "No project overrides", description: "Seed from the office book or add an override above." }}>
        <TableContainer title="Project rate book" description="Overrides win over the office rate book when re-costing.">
          <div style={scroll}>
            <Table size="sm" useZebraStyles stickyHeader>
              <TableHead>
                <TableRow>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Remove</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell>{inr(r.ratePaise)}</TableCell>
                    <TableCell>
                      <Button
                        hasIconOnly
                        size="sm"
                        kind="ghost"
                        renderIcon={TrashCan}
                        iconDescription="Remove override"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate({ id: r.id })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TableContainer>
      </DataState>
    </Stack>
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
              Rate book: {recost.data.rateBook.name} ({recost.data.rateBook.entryCount} rates
              {recost.data.rateBook.projectOverrides ? `, ${recost.data.rateBook.projectOverrides} project overrides` : ""})
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
              <Tab>Rate Book</Tab>
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
              <TabPanel>
                <ProjectRateBook projectId={recost.data?.estimate.projectId ?? null} />
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
