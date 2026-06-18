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
  Tile,
} from "@carbon/react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

const KIND_LABEL: Record<string, string> = {
  approval: "Client decision",
  followup: "Follow-up",
  permit: "Permit",
  submission: "Portal request",
  task: "Overdue task",
  leave: "Leave impact",
  tender: "Tender closing",
  construction: "Site coordination",
};

function AlertTable({
  title,
  alerts,
}: {
  title: string;
  alerts: {
    id: string;
    kind: string;
    severity: string;
    title: string;
    detail: string;
    projectId: string | null;
    projectRef: string | null;
    date: string | null;
  }[];
}) {
  return (
    <TableContainer title={title}>
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
              <TableCell colSpan={5}>Nothing in this view.</TableCell>
            </TableRow>
          )}
          {alerts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Tag type={a.severity === "high" ? "red" : a.severity === "medium" ? "magenta" : "gray"}>
                  {a.severity}
                </Tag>
              </TableCell>
              <TableCell>{KIND_LABEL[a.kind] ?? a.kind}</TableCell>
              <TableCell>
                {a.title}
                <div>{a.detail}</div>
              </TableCell>
              <TableCell>
                {a.projectId && a.projectRef ? (
                  <Link to={`/projects/${a.projectId}`}>{a.projectRef}</Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{a.date ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function Alerts() {
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const digestQ = trpc.notifications.digest.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const alerts = alertsQ.data ?? [];
  const digest = digestQ.data;

  return (
    <Stack gap={6}>
      <PageHeader
        title="Alerts"
        description="Immediate items needing action, plus a daily digest of lower-priority follow-ups."
      />

      <AlertTable title={`Immediate action (${alerts.length})`} alerts={alerts} />

      {digest && (
        <Tile>
          <Stack gap={4}>
            <h3>Daily digest · {digest.date}</h3>
            <p>
              Medium-priority follow-ups and upcoming leave — configured in Company → Alert
              escalation.
            </p>
            <AlertTable
              title={`Digest items (${digest.count})`}
              alerts={digest.items}
            />
          </Stack>
        </Tile>
      )}
    </Stack>
  );
}
