import {
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { PhaseStatus, formatINR } from "@esti/contracts";
import { Link, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "teal" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  CLIENT_REVIEW: "purple",
  APPROVED: "teal",
  COMPLETE: "green",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const utils = trpc.useUtils();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const update = trpc.phases.update.useMutation({
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId: id }),
  });

  if (project.isLoading) return <p>Loading…</p>;
  if (!project.data) return <p>Project not found. <Link to="/projects">Back</Link></p>;

  const p = project.data;

  return (
    <div>
      <Link to="/projects">← Projects</Link>
      <h1 style={{ marginTop: 8 }}>
        {p.ref} — {p.title}
      </h1>
      <p style={{ color: "var(--cds-text-secondary)" }}>
        {p.projectType} · {p.jurisdiction} · {p.status} · {formatINR(p.contractValuePaise, { paise: false })}
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>COA phases</h3>
      <TableContainer title="Conditions of Engagement" description="Phase plan & billing schedule">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Billing %</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Update</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(phasesQ.data ?? []).map((ph) => (
              <TableRow key={ph.id}>
                <TableCell>{ph.label}</TableCell>
                <TableCell>{ph.billingPct}%</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[ph.status] ?? "gray"}>{ph.status}</Tag>
                </TableCell>
                <TableCell>
                  <Select
                    id={`st-${ph.id}`}
                    labelText=""
                    hideLabel
                    size="sm"
                    value={ph.status}
                    onChange={(e) => update.mutate({ id: ph.id, status: e.target.value as (typeof PhaseStatus.options)[number] })}
                  >
                    {PhaseStatus.options.map((s) => (
                      <SelectItem key={s} value={s} text={s} />
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
