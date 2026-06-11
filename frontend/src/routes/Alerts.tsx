import {
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
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

const KIND_LABEL: Record<string, string> = {
  approval: "Client decision",
  followup: "Follow-up",
  permit: "Permit",
};

export function Alerts() {
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const alerts = alertsQ.data ?? [];

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <h1>Alerts</h1>
        <p>Stale client decisions, due follow-ups and overdue statutory permits.</p>
      </Stack>

      <TableContainer title={`Action needed (${alerts.length})`}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Severity</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Alert</TableHeader>
              <TableHeader>Project</TableHeader>
              <TableHeader>Date</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Nothing needs attention. 🎉</TableCell>
              </TableRow>
            )}
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Tag type={a.severity === "high" ? "red" : "magenta"}>
                    {a.severity}
                  </Tag>
                </TableCell>
                <TableCell>{KIND_LABEL[a.kind] ?? a.kind}</TableCell>
                <TableCell>
                  {a.title}
                  <div>{a.detail}</div>
                </TableCell>
                <TableCell>
                  <Link to={`/projects/${a.projectId}`}>{a.projectRef}</Link>
                </TableCell>
                <TableCell>{a.date ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
