import { Button, ProgressBar, Stack, Tag, Tile } from "@carbon/react";
import { ArrowRight, Time } from "@carbon/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/** Live clock + today's date; leave balance when Team & HR is enabled. */
export function ClockLeavesWidget({ hrEnabled = false }: { hrEnabled?: boolean }) {
  const navigate = useNavigate();
  const meQ = trpc.dashboard.me.useQuery();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const date = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const leave = hrEnabled ? meQ.data?.leave ?? null : null;

  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <Tag type="blue" renderIcon={Time}>
          Today
        </Tag>
        <h3>{time}</h3>
        <p>{date}</p>
        {hrEnabled && (
          leave ? (
            <Stack gap={3}>
              <h4>
                {leave.remaining} of {leave.allowance} leave days remaining
              </h4>
              <ProgressBar
                label="Annual leave used"
                value={leave.used}
                max={leave.allowance}
                helperText={`${leave.used} day(s) taken`}
              />
            </Stack>
          ) : (
            <p>No leave record linked to your login.</p>
          )
        )}
        {hrEnabled && (
          <Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={() => navigate("/hr")}>
            Open HR
          </Button>
        )}
      </Stack>
    </Tile>
  );
}
