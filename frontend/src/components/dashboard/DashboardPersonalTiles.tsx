import {
  Button,
  InlineLoading,
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
import { ArrowRight } from "@carbon/icons-react";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@esti/contracts";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "../../lib/trpc.js";
import { edge } from "./dashboardUi.js";

const MY_PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "blue",
  LOW: "gray",
};

export function MyTasksTile() {
  const navigate = useNavigate();
  const tasksQ = trpc.tasks.list.useQuery({ myTasks: true });
  const today = new Date().toISOString().slice(0, 10);
  const open = (tasksQ.data ?? []).filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);

  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={3}>
          <h3 className="esti-grow">My tasks</h3>
          {!tasksQ.isLoading && <Tag type={overdue.length ? "red" : "blue"} size="sm">{open.length} open</Tag>}
        </Stack>
        {tasksQ.isLoading ? (
          <InlineLoading description="Loading…" />
        ) : open.length === 0 ? (
          <p>No open tasks assigned to you.</p>
        ) : (
          <>
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Task</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Due</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {open.slice(0, 6).map((t) => {
                    const isOverdue = t.dueDate ? t.dueDate < today : false;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>
                          {t.projectId
                            ? <Link to={`/projects/${t.projectId}`}>{t.projectRef ?? "—"}</Link>
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {isOverdue
                            ? <Tag type="red" size="sm">Overdue · {t.dueDate}</Tag>
                            : (t.dueDate ?? "—")}
                        </TableCell>
                        <TableCell>
                          <Tag type={MY_PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                            {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          <Tag type="gray" size="sm">
                            {TASK_STATUS_LABEL[t.status] ?? t.status}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {open.length > 6 && (
              <span className="esti-label esti-label--helper">+{open.length - 6} more</span>
            )}
          </>
        )}
        <Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={() => navigate("/tasks?tab=tasks")}>Open Work</Button>
      </Stack>
    </Tile>
  );
}

export function PendingLeavesTile({ canManage }: { canManage: boolean }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const leavesQ = trpc.leaves.list.useQuery();
  const setStatus = trpc.leaves.setStatus.useMutation({ onSuccess: () => utils.leaves.list.invalidate() });
  const pending = (leavesQ.data ?? []).filter((l) => l.status !== "APPROVED" && l.status !== "REJECTED");

  return (
    <Tile className="esti-fill" style={edge(pending.length ? "watch" : "ok")}>
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={3}>
          <h3 className="esti-grow">Pending leaves</h3>
          {!leavesQ.isLoading && (
            <Tag type={pending.length ? "magenta" : "green"} size="sm">{pending.length} pending</Tag>
          )}
        </Stack>
        {leavesQ.isLoading ? (
          <InlineLoading description="Loading…" />
        ) : pending.length === 0 ? (
          <p>No leave requests awaiting approval.</p>
        ) : (
          <Stack gap={3}>
            {pending.slice(0, 4).map((l) => (
              <Stack key={l.id} orientation="horizontal" gap={3}>
                <div className="esti-grow">
                  <p>{l.name}</p>
                  <span className="esti-label esti-label--helper">
                    {l.type} · {l.fromDate} → {l.toDate} · {l.days}d
                  </span>
                </div>
                {canManage ? (
                  <Stack orientation="horizontal" gap={2}>
                    <Button kind="ghost" size="sm" disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: l.id, status: "APPROVED" })}>Approve</Button>
                    <Button kind="danger--ghost" size="sm" disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: l.id, status: "REJECTED" })}>Reject</Button>
                  </Stack>
                ) : (
                  <Tag type="magenta" size="sm">Pending</Tag>
                )}
              </Stack>
            ))}
            {pending.length > 4 && <span className="esti-label esti-label--helper">+{pending.length - 4} more</span>}
          </Stack>
        )}
        <Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={() => navigate("/hr")}>Open HR</Button>
      </Stack>
    </Tile>
  );
}
