import { Alert, Box, Skeleton, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { StatusDot } from "../StatusTag.js";

export function ReleaseMetadataPanel() {
  // Same payload as GET /health — avoids a separate tRPC route and matches deploy probes.
  const releaseQ = useQuery({
    queryKey: ["release-health"],
    queryFn: async () => {
      const res = await fetch("/health");
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json() as Promise<{
        ok: boolean;
        app: string;
        version: string;
        revision: string;
        nodeEnv: string;
        builtAt: string | null;
        checks: { db: boolean; redis: boolean; storage: boolean };
      }>;
    },
    staleTime: 30_000,
  });

  const check = (ok: boolean, label: string) => {
    const color = ok ? "green" : "red";
    return <StatusDot color={color} label={`${label} ${ok ? "OK" : "down"}`} />;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">Release &amp; readiness</Typography>
        <Typography variant="body2">Build revision and backing-service checks for production operations.</Typography>
        {releaseQ.isLoading && (
          <Stack spacing={0.5}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={32} />
            ))}
          </Stack>
        )}
        {releaseQ.isError && (
          <Alert severity="error">
            {releaseQ.error instanceof Error ? releaseQ.error.message : "Unknown error"}
          </Alert>
        )}
        {releaseQ.data && (
          <>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Application</TableCell>
                  <TableCell>{releaseQ.data.app}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>{releaseQ.data.version}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Revision</TableCell>
                  <TableCell><code>{releaseQ.data.revision}</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Environment</TableCell>
                  <TableCell>{releaseQ.data.nodeEnv}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Stack direction="row" spacing={1}>
              {check(releaseQ.data.checks.db, "Database")}
              {check(releaseQ.data.checks.redis, "Redis")}
              {check(releaseQ.data.checks.storage, "Storage")}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Public liveness: <code>/health</code> · dependency probe: <code>/readyz</code>
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
