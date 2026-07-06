import {
  Box,
  Button,
  Chip,
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
  APPROVAL_CHANNELS,
  APPROVAL_ENTITY_TYPES,
  type ApprovalChannelCode,
  type ApprovalEntityTypeCode,
  ApprovalStatus,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<
  string,
  "gray" | "blue" | "green" | "magenta" | "red" | "cool-gray"
> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  REVISIONS: "magenta",
  REJECTED: "red",
  SUPERSEDED: "cool-gray",
};

const tagSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

export function ProjectApprovals({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.approvals.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () =>
    utils.approvals.listByProject.invalidate({ projectId });
  const update = trpc.approvals.update.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] =
    useState<ApprovalEntityTypeCode>("DRAWING");
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<ApprovalChannelCode>("EMAIL");
  const [sentDate, setSentDate] = useState("");

  const create = trpc.approvals.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTitle("");
      setRecipient("");
      setSentDate("");
    },
  });

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 4,
        }}
      >
        <Typography variant="h6" component="h3">
          Approvals &amp; issues
        </Typography>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>
          Record issue
        </Button>
      </Box>
      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Typography variant="subtitle1" component="h4">
          Issue / approval log
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign-off tracking with revisions
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Set status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data?.rows ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>
                    {APPROVAL_ENTITY_TYPES[
                      a.entityType as ApprovalEntityTypeCode
                    ] ?? a.entityType}
                  </TableCell>
                  <TableCell>{a.recipient ?? "—"}</TableCell>
                  <TableCell>
                    {APPROVAL_CHANNELS[a.channel as ApprovalChannelCode] ??
                      a.channel}
                  </TableCell>
                  <TableCell>{a.sentDate ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={a.status}
                      sx={tagSx(STATUS_TAG[a.status] ?? "gray")}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      id={`ap-${a.id}`}
                      select
                      hiddenLabel
                      size="small"
                      value={a.status}
                      disabled={a.status === "SUPERSEDED"}
                      slotProps={{
                        htmlInput: { "aria-label": "Update approval status" },
                      }}
                      onChange={(e) => {
                        const status = e.target
                          .value as (typeof ApprovalStatus.options)[number];
                        const decided = [
                          "APPROVED",
                          "REJECTED",
                          "REVISIONS",
                        ].includes(status);
                        update.mutate({
                          id: a.id,
                          status,
                          ...(decided && !a.responseDate
                            ? {
                                responseDate: new Date()
                                  .toISOString()
                                  .slice(0, 10),
                              }
                            : {}),
                        });
                      }}
                    >
                      {ApprovalStatus.options.map((st) => (
                        <MenuItem key={st} value={st}>
                          {st}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record an issue for sign-off</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="ap-type"
              select
              label="What was issued"
              value={entityType}
              onChange={(e) =>
                setEntityType(e.target.value as ApprovalEntityTypeCode)
              }
              fullWidth
            >
              {(
                Object.keys(APPROVAL_ENTITY_TYPES) as ApprovalEntityTypeCode[]
              ).map((k) => (
                <MenuItem key={k} value={k}>
                  {APPROVAL_ENTITY_TYPES[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="ap-title"
              label="Title / reference"
              placeholder="e.g. GF plan rev B"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              id="ap-recipient"
              label="Recipient (optional)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              fullWidth
            />
            <TextField
              id="ap-channel"
              select
              label="Channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ApprovalChannelCode)}
              fullWidth
            >
              {(Object.keys(APPROVAL_CHANNELS) as ApprovalChannelCode[]).map(
                (k) => (
                  <MenuItem key={k} value={k}>
                    {APPROVAL_CHANNELS[k]}
                  </MenuItem>
                ),
              )}
            </TextField>
            <TextField
              id="ap-sent"
              label="Sent date (optional — leave blank to keep as draft)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={sentDate}
              onChange={(e) => setSentDate(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!title || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                entityType,
                title,
                recipient: recipient || undefined,
                channel,
                sentDate: sentDate || null,
              })
            }
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
