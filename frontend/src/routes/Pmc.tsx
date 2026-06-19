import { ProgressBar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { PROJECT_STATUS_LABEL } from "@esti/contracts";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

/** Office-wide PMC portfolio — PMC-enabled projects only. */
export function Pmc() {
  const settingsQ = trpc.settings.get.useQuery();
  const pmcEnabled = settingsQ.data?.pmcEnabled ?? false;
  const portfolioQ = trpc.pmc.portfolio.useQuery(undefined, { enabled: pmcEnabled });

  return (
    <Stack gap={6}>
      <PageHeader
        title="PMC"
        description="Project management portfolio — construction schedule health and site coordination for PMC-enabled projects."
      />

      {!pmcEnabled && !settingsQ.isLoading && (
        <p>PMC is off — enable it in Company settings to use the portfolio view.</p>
      )}

      {pmcEnabled && portfolioQ.isLoading && <p>Loading PMC portfolio…</p>}

      {pmcEnabled && !portfolioQ.isLoading && portfolioQ.isError && (
        <p>Could not load PMC portfolio. Refresh the page or check that the backend is running.</p>
      )}

      {pmcEnabled && !portfolioQ.isLoading && !portfolioQ.isError && (portfolioQ.data ?? []).length === 0 && (
        <p>
          No PMC projects. Enable the PMC module in Company settings, then turn on PMC per project in
          Project settings.
        </p>
      )}

      {pmcEnabled && (portfolioQ.data ?? []).length > 0 && (
        <TableContainer>
          <Table size="md">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Schedule %</TableHeader>
                <TableHeader>Baseline end</TableHeader>
                <TableHeader>Critical overdue</TableHeader>
                <TableHeader>Health</TableHeader>
                <TableHeader>Open site items</TableHeader>
                <TableHeader>Snags</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(portfolioQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to={`/projects/${p.id}?tab=pmc`}>
                      {p.ref} — {p.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}
                  </TableCell>
                  <TableCell style={{ minWidth: 120 }}>
                    <ProgressBar label="" hideLabel value={p.scheduleProgressPct} max={100} size="small" />
                    {p.scheduleProgressPct}%
                  </TableCell>
                  <TableCell>{p.constructionBaselineEnd ?? "—"}</TableCell>
                  <TableCell>
                    {(p.criticalOverdue ?? 0) > 0 ?
                      <Tag type="red" size="sm">
                        {p.criticalOverdue}
                      </Tag>
                    : "0"}
                  </TableCell>
                  <TableCell>
                    <Tag type={p.healthScore >= 70 ? "green" : p.healthScore >= 40 ? "gray" : "red"} size="sm">
                      {p.healthScore}
                    </Tag>
                  </TableCell>
                  <TableCell>{p.openConstruction}</TableCell>
                  <TableCell>{p.openSnags}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
