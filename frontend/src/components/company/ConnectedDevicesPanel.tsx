import {
  Button,
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import { trpc } from "../../lib/trpc.js";

export function ConnectedDevicesPanel() {
  const utils = trpc.useUtils();
  const devicesQ = trpc.companion.listDevices.useQuery();
  const revoke = trpc.companion.revokeDevice.useMutation({
    onSuccess: () => utils.companion.listDevices.invalidate(),
  });

  const rows = devicesQ.data ?? [];

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={4}>
        <h2>Connected devices</h2>
        <p>
          ESTICAD desktop sessions with active device tokens. Revoke a session if a
          laptop is lost or a staff member leaves.
        </p>
        {devicesQ.isLoading && <p className="esti-label">Loading…</p>}
        {devicesQ.isError && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not load devices"
            subtitle={devicesQ.error.message}
            hideCloseButton
          />
        )}
        {!devicesQ.isLoading && rows.length === 0 && (
          <p className="esti-label">No active ESTICAD device sessions.</p>
        )}
        {rows.length > 0 && (
          <TableContainer title="Active sessions">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Device</TableHeader>
                  <TableHeader>User</TableHeader>
                  <TableHeader>Last used</TableHeader>
                  <TableHeader />
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
                      {row.lastUsedAt ?
                        new Date(row.lastUsedAt).toLocaleString()
                      : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        kind="danger--ghost"
                        size="sm"
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
          </TableContainer>
        )}
      </Stack>
    </Tile>
  );
}
