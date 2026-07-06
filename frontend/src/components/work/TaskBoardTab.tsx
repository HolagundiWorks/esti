import {
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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

const tagSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

export function TaskBoardTab() {
  const utils = trpc.useUtils();
  const [myTasks, setMyTasks] = useState(false);
  const listQ = trpc.tasks.list.useQuery({ myTasks });
  const update = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.list.invalidate() });
  const today = new Date().toISOString().slice(0, 10);

  const tasks = listQ.data ?? [];
  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          Drag-free status board — move a task with its column menu.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              id="b-mine"
              checked={myTasks}
              onChange={(e) => setMyTasks(e.target.checked)}
            />
          }
          label="My tasks"
        />
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={tasks.length === 0}
        columnCount={4}
        empty={{ title: "No tasks", description: "Create a task on the Tasks tab to see it on the board." }}
      >
        <Grid container spacing={2}>
          {BOARD_COLUMNS.map(({ status, tag }) => {
            const colTasks = byStatus(status);
            return (
              <Grid key={status} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Chip size="small" label={TASK_STATUS_LABEL[status] ?? status} sx={tagSx(tag)} />
                    <span className="esti-label esti-label--secondary">{colTasks.length}</span>
                  </Stack>
                  {colTasks.length === 0 ? (
                    <p className="esti-label esti-label--helper">No tasks</p>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                      return (
                        <Paper key={t.id} sx={{ p: 2 }}>
                          <Stack spacing={1}>
                            <strong>{t.title}</strong>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Chip
                                size="small"
                                label={TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                                sx={tagSx(PRIORITY_TAG[t.priority] ?? "gray")}
                              />
                              {t.projectId && (
                                <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>
                              )}
                            </Stack>
                            {t.assignee && (
                              <span className="esti-label esti-label--secondary">{t.assignee}</span>
                            )}
                            {t.dueDate && (
                              overdue
                                ? (
                                  <Chip
                                    size="small"
                                    label={`Overdue · ${t.dueDate}`}
                                    sx={{ ...tagSx("red"), alignSelf: "flex-start" }}
                                  />
                                )
                                : <span className="esti-label esti-label--helper">Due {t.dueDate}</span>
                            )}
                            <TextField
                              id={`bs-${t.id}`}
                              select
                              size="small"
                              value={t.status}
                              onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}
                              slotProps={{ htmlInput: { "aria-label": "Move to" } }}
                            >
                              {TaskStatus.options.map((s) => (
                                <MenuItem key={s} value={s}>{TASK_STATUS_LABEL[s] ?? s}</MenuItem>
                              ))}
                            </TextField>
                          </Stack>
                        </Paper>
                      );
                    })
                  )}
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </DataState>
    </Stack>
  );
}
