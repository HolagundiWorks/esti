import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ACTIVITY_DOMAIN_TAG, activityDomain } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../DataState.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";
import { formatWhen } from "./workHelpers.js";

export function ActivityTab() {
  const [visibility, setVisibility] = useState<"STAFF" | "ALL">("STAFF");
  const listQ = trpc.activity.listOffice.useInfiniteQuery(
    { limit: 25, visibility },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const items = listQ.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="body2" sx={{ flex: 1 }}>Office-wide timeline for changes and notes.</Typography>
        <TextField
          id="act-vis"
          select
          size="small"
          label="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "STAFF" | "ALL")}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="STAFF">Staff activity</MenuItem>
          <MenuItem value="ALL">All activity</MenuItem>
        </TextField>
      </Stack>

      {listQ.error && <Alert severity="error">{listQ.error.message}</Alert>}

      <DataState
        loading={listQ.isLoading && items.length === 0}
        isEmpty={!listQ.error && items.length === 0}
        columnCount={4}
        empty={{ title: "No activity yet", description: "Project changes and internal notes will appear here." }}
      >
        <Stack spacing={2}>
          {items.map((item) => {
            const domain = activityDomain(item.eventType);
            const dcolor = ACTIVITY_DOMAIN_TAG[domain];
            return (
              <Box key={item.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <StatusDot color={dcolor} label={domain} />
                    <StatusDot color="gray" label={item.eventType} />
                    <Typography variant="caption" color="text.secondary">
                      {formatWhen(item.createdAt as unknown as string)}
                    </Typography>
                  </Stack>
                  <p>{item.summary}</p>
                  <p>
                    {item.actorName ?? "System"}
                    {item.projectId && (
                      <> · <Link to={`/projects/${item.projectId}`}>{item.projectRef ?? item.projectTitle ?? "Project"}</Link></>
                    )}
                  </p>
                </Stack>
              </Box>
            );
          })}
          {listQ.hasNextPage && (
            <Button variant="outlined" disabled={listQ.isFetchingNextPage} onClick={() => listQ.fetchNextPage()}>
              {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
            </Button>
          )}
        </Stack>
      </DataState>
    </Stack>
  );
}
