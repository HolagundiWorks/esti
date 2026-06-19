import {
  InlineNotification,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
} from "@carbon/react";
import { useQuery } from "@tanstack/react-query";

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

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={4}>
        <h2>Release &amp; readiness</h2>
        <p>Build revision and backing-service checks for production operations.</p>
        {releaseQ.isLoading && <p className="esti-label">Loading…</p>}
        {releaseQ.isError && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not load release metadata"
            subtitle={releaseQ.error instanceof Error ? releaseQ.error.message : "Unknown error"}
            hideCloseButton
          />
        )}
        {releaseQ.data && (
          <>
            <StructuredListWrapper isCondensed>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell>Application</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.app}</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Version</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.version}</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Revision</StructuredListCell>
                  <StructuredListCell noWrap>
                    <code>{releaseQ.data.revision}</code>
                  </StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>Environment</StructuredListCell>
                  <StructuredListCell noWrap>{releaseQ.data.nodeEnv}</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>
            <Stack orientation="horizontal" gap={3}>
              <Tag type={releaseQ.data.checks.db ? "green" : "red"} size="sm">
                Database {releaseQ.data.checks.db ? "OK" : "down"}
              </Tag>
              <Tag type={releaseQ.data.checks.redis ? "green" : "red"} size="sm">
                Redis {releaseQ.data.checks.redis ? "OK" : "down"}
              </Tag>
              <Tag type={releaseQ.data.checks.storage ? "green" : "red"} size="sm">
                Storage {releaseQ.data.checks.storage ? "OK" : "down"}
              </Tag>
            </Stack>
            <p className="esti-label esti-label--helper">
              Public liveness: <code>/health</code> · dependency probe: <code>/readyz</code>
            </p>
          </>
        )}
      </Stack>
    </Tile>
  );
}
