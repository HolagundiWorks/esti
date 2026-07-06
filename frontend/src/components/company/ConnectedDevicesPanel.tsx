import {
  Alert,
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { trpc } from "../../lib/trpc.js";

export function ConnectedDevicesPanel() {
  const utils = trpc.useUtils();
  const devicesQ = trpc.companion.listDevices.useQuery();
  const revoke = trpc.companion.revokeDevice.useMutation({
    onSuccess: () => utils.companion.listDevices.invalidate(),
  });

  const rows = devicesQ.data ?? [];

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">Connected devices</Typography>
        <Typography variant="body2">
          ESTICAD desktop sessions with active device tokens. Revoke a session if a
          laptop is lost or a staff member leaves.
        </Typography>
        {devicesQ.isLoading && <Typography variant="body2">Loading…</Typography>}
        {devicesQ.isError && <Alert severity="error">{devicesQ.error.message}</Alert>}
        {!devicesQ.isLoading && rows.length === 0 && (
          <Typography variant="body2">No active ESTICAD device sessions.</Typography>
        )}
        {rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Last used</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.deviceName}</TableCell>
                  <TableCell>
                    {row.userFullName}
                    <br />
                    <span className="esti-label">{row.userEmail}</span>
                  </TableCell>
                  <TableCell>
                    {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      variant="text"
                      size="small"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate({ sessionId: row.id })}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Box>
  );
}
