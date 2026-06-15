import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { ACTIVITY_DOMAIN_TAG, activityDomain } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../DataState.js";
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
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <div className="esti-grow">
          <p>Office-wide timeline for changes and notes.</p>
        </div>
        <Select id="act-vis" labelText="Visibility" hideLabel size="sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "STAFF" | "ALL")}
        >
          <SelectItem value="STAFF" text="Staff activity" />
          <SelectItem value="ALL" text="All activity" />
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Activity feed unavailable"
          subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading && items.length === 0}
        isEmpty={!listQ.error && items.length === 0}
        columnCount={4}
        empty={{ title: "No activity yet", description: "Project changes and internal notes will appear here." }}
      >
        <Stack gap={4}>
          {items.map((item) => (
            <Tile key={item.id}>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <Tag type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]} size="sm">
                    {activityDomain(item.eventType)}
                  </Tag>
                  <Tag type="gray" size="sm">{item.eventType}</Tag>
                  <span>{formatWhen(item.createdAt as unknown as string)}</span>
                </Stack>
                <p>{item.summary}</p>
                <p>
                  {item.actorName ?? "System"}
                  {item.projectId && (
                    <> · <Link to={`/projects/${item.projectId}`}>{item.projectRef ?? item.projectTitle ?? "Project"}</Link></>
                  )}
                </p>
              </Stack>
            </Tile>
          ))}
          {listQ.hasNextPage && (
            <Button kind="secondary" disabled={listQ.isFetchingNextPage}
              onClick={() => listQ.fetchNextPage()}>
              {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
            </Button>
          )}
        </Stack>
      </DataState>
    </Stack>
  );
}
