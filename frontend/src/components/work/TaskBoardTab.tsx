import {
  Checkbox,
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TaskStatus,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { BOARD_COLUMNS, PRIORITY_TAG } from "./workHelpers.js";

export function TaskBoardTab() {
  const utils = trpc.useUtils();
  const [myTasks, setMyTasks] = useState(false);
  const listQ = trpc.tasks.list.useQuery({ myTasks });
  const update = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.list.invalidate() });
  const today = new Date().toISOString().slice(0, 10);

  const tasks = listQ.data ?? [];
  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={5}>
        <div className="esti-grow">
          <p>Drag-free status board — move a task with its column menu.</p>
        </div>
        <Checkbox id="b-mine" labelText="My tasks" checked={myTasks}
          onChange={(_e, { checked }) => setMyTasks(checked)} />
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={tasks.length === 0}
        columnCount={4}
        empty={{ title: "No tasks", description: "Create a task on the Tasks tab to see it on the board." }}
      >
        <Grid fullWidth>
          {BOARD_COLUMNS.map(({ status, tag }) => {
            const colTasks = byStatus(status);
            return (
              <Column key={status} sm={4} md={2} lg={4}>
                <Stack gap={4}>
                  <Stack orientation="horizontal" gap={3}>
                    <Tag type={tag}>{TASK_STATUS_LABEL[status] ?? status}</Tag>
                    <span className="esti-label esti-label--secondary">{colTasks.length}</span>
                  </Stack>
                  {colTasks.length === 0 ? (
                    <p className="esti-label esti-label--helper">No tasks</p>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                      return (
                        <Tile key={t.id}>
                          <Stack gap={3}>
                            <strong>{t.title}</strong>
                            <Stack orientation="horizontal" gap={3}>
                              <Tag type={PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                                {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                              </Tag>
                              {t.projectId && (
                                <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>
                              )}
                            </Stack>
                            {t.assignee && (
                              <span className="esti-label esti-label--secondary">{t.assignee}</span>
                            )}
                            {t.dueDate && (
                              overdue
                                ? <Tag type="red" size="sm">Overdue · {t.dueDate}</Tag>
                                : <span className="esti-label esti-label--helper">Due {t.dueDate}</span>
                            )}
                            <Select id={`bs-${t.id}`} labelText="Move to" hideLabel size="sm"
                              value={t.status}
                              onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}>
                              {TaskStatus.options.map((s) => (
                                <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                              ))}
                            </Select>
                          </Stack>
                        </Tile>
                      );
                    })
                  )}
                </Stack>
              </Column>
            );
          })}
        </Grid>
      </DataState>
    </Stack>
  );
}
