import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

type Visibility = "STAFF" | "ALL";

function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ActivityCenter() {
  const [visibility, setVisibility] = useState<Visibility>("STAFF");
  const listQ = trpc.activity.listOffice.useInfiniteQuery(
    { limit: 25, visibility },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );
  const items = listQ.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Activity Center</h1>
        <p>
          Office-wide timeline for changes, notes, and future change-control
          signals.
        </p>
      </Stack>

      <Grid condensed>
        <Column sm={4} md={3} lg={4}>
          <Select
            id="activity-visibility"
            labelText="Visibility"
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as Visibility)
            }
          >
            <SelectItem value="STAFF" text="Staff activity" />
            <SelectItem value="ALL" text="All activity" />
          </Select>
        </Column>
      </Grid>

      {listQ.error && (
        <InlineNotification
          kind="error"
          title="Activity feed unavailable"
          subtitle={listQ.error.message}
          hideCloseButton
          lowContrast
        />
      )}

      <DataState
        loading={listQ.isLoading && items.length === 0}
        isEmpty={!listQ.error && items.length === 0}
        columnCount={4}
        empty={{
          title: "No activity yet",
          description:
            "Project changes and internal notes will appear here as the office works.",
        }}
      >
        <Stack gap={4}>
          {items.map((item) => (
            <Tile key={item.id}>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={4}>
                  <Tag
                    type={item.visibility === "ALL" ? "purple" : "blue"}
                    size="sm"
                  >
                    {item.visibility}
                  </Tag>
                  <Tag type="gray" size="sm">
                    {item.eventType}
                  </Tag>
                  <span>{formatWhen(item.createdAt)}</span>
                </Stack>
                <p>{item.summary}</p>
                <p>
                  {item.actorName ?? "System"}
                  {item.projectId && (
                    <>
                      {" "}
                      ·{" "}
                      <Link to={`/projects/${item.projectId}`}>
                        {item.projectRef ?? item.projectTitle ?? "Project"}
                      </Link>
                    </>
                  )}
                </p>
              </Stack>
            </Tile>
          ))}

          {listQ.hasNextPage && (
            <Button
              kind="secondary"
              disabled={listQ.isFetchingNextPage}
              onClick={() => listQ.fetchNextPage()}
            >
              {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
            </Button>
          )}
        </Stack>
      </DataState>
    </Stack>
  );
}
