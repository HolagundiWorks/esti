import {
  ProgressBar,
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
import { PROJECT_STATUS_LABEL } from "@esti/contracts";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

export function Programme() {
  const portfolioQ = trpc.programme.portfolio.useQuery();

  return (
    <Stack gap={6}>
      <PageHeader
        title="Office delivery programme"
        description="Office-wide internal delivery — design stages, milestones, tasks, and overdue items. Site construction schedules live under PMC."
      />

      {portfolioQ.isLoading && <p>Loading portfolio…</p>}

      {!portfolioQ.isLoading && (portfolioQ.data ?? []).length === 0 && (
        <p>No active projects. Create a project to start tracking programme.</p>
      )}

      {(portfolioQ.data ?? []).length > 0 && (
        <TableContainer>
          <Table size="md">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Current stage</TableHeader>
                <TableHeader>Progress</TableHeader>
                <TableHeader>Overdue</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(portfolioQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to={`/projects/${p.id}?tab=programme`}>
                      {p.ref} — {p.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}
                  </TableCell>
                  <TableCell>{p.currentPhaseLabel}</TableCell>
                  <TableCell style={{ minWidth: 160 }}>
                    <ProgressBar label="Progress" value={p.scheduleProgressPct} max={100} size="small" />
                    <span>{p.scheduleProgressPct}%</span>
                  </TableCell>
                  <TableCell>
                    {p.overdueCount > 0 ?
                      <Tag type="red" size="sm">
                        {p.overdueCount}
                      </Tag>
                    : <Tag type="green" size="sm">0</Tag>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
