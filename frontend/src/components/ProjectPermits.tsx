import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  PERMIT_TYPES,
  type PermitDueTier,
  PermitStatus,
  PermitType,
  permitDueTier,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

const TIER_TAG: Record<
  PermitDueTier,
  { type: "red" | "magenta" | "blue" | "gray"; label: string }
> = {
  overdue: { type: "red", label: "Overdue" },
  due_soon: { type: "magenta", label: "Due ≤14d" },
  upcoming: { type: "blue", label: "Due ≤30d" },
  none: { type: "gray", label: "" },
};

export function ProjectPermits({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const permitsQ = trpc.permits.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const update = trpc.permits.update.useMutation({
    meta: { errorTitle: "Couldn't update the permit" },
    onSuccess: () => utils.permits.listByProject.invalidate({ projectId }),
  });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("BPAS");
  const [authority, setAuthority] = useState<string>(
    PERMIT_TYPES.BPAS.authorities[0],
  );
  const [appNo, setAppNo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const create = trpc.permits.create.useMutation({
    meta: { errorTitle: "Couldn't create the permit" },
    onSuccess: () => {
      utils.permits.listByProject.invalidate({ projectId });
      setOpen(false);
      setAppNo("");
      setDueDate("");
    },
  });

  const authorities =
    PERMIT_TYPES[type as keyof typeof PERMIT_TYPES].authorities;

  return (
    <>
      <Box
        className="esti-row-between"
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}
      >
        <Typography variant="h6" component="h3">Permits &amp; compliance</Typography>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>
          New permit
        </Button>
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" component="h4">
          Statutory approvals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tracking with due-date alerts
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Authority</TableCell>
                <TableCell>Application #</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(permitsQ.data ?? []).map((p) => {
                const tier = permitDueTier(p.dateDue, p.status);
                const tag = TIER_TAG[tier];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {PERMIT_TYPES[p.permitType as keyof typeof PERMIT_TYPES]
                        ?.label ?? p.permitType}
                    </TableCell>
                    <TableCell>{p.authority}</TableCell>
                    <TableCell>{p.applicationNo ?? "—"}</TableCell>
                    <TableCell>
                      {p.dateDue ?? "—"}{" "}
                      {tier !== "none" && (
                        <StatusDot color={tag.type} label={tag.label} />
                      )}
                    </TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>
                      <TextField
                        id={`pm-${p.id}`}
                        select
                        aria-label="Permit status"
                        size="small"
                        value={p.status}
                        onChange={(e) =>
                          update.mutate({
                            id: p.id,
                            status: e.target
                              .value as (typeof PermitStatus.options)[number],
                          })
                        }
                      >
                        {PermitStatus.options.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog aria-labelledby="project-permits-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="project-permits-create-title">New permit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="pm-type"
              select
              label="Permit type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setAuthority(
                  PERMIT_TYPES[e.target.value as keyof typeof PERMIT_TYPES]
                    .authorities[0],
                );
              }}
            >
              {PermitType.options.map((t) => (
                <MenuItem key={t} value={t}>{PERMIT_TYPES[t].label}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="pm-auth"
              select
              label="Authority"
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
            >
              {authorities.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="pm-appno"
              label="Application number (optional)"
              value={appNo}
              onChange={(e) => setAppNo(e.target.value)}
            />
            <TextField
              id="pm-due"
              label="Due date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {create.error && (
              <Alert severity="error">
                <AlertTitle>Could not create</AlertTitle>
                {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!authority || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                permitType: type as (typeof PermitType.options)[number],
                authority,
                applicationNo: appNo || undefined,
                dateDue: dueDate || undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
