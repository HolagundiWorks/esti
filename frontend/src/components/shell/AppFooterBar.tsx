import Logout from "@mui/icons-material/Logout";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { AlertsBell } from "../AlertsBell.js";
import { HeaderPomodoro } from "../HeaderPomodoro.js";
import { UserIdCard } from "../UserIdCard.js";

/**
 * Footer bar — the former top nav bar, moved to the bottom (shell brief). Shows
 * the company name (left) plus the utility cluster (clock, pomodoro, alerts, ID
 * card, sign out). Search + the AORMS brand live in the top ribbon now. Liquid
 * glass, compact height. Sits below the floating dock.
 */
function FooterClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return <span className="esti-header-clock">{date} · {time}</span>;
}

export function AppFooterBar({
  firmName,
  planClass,
  onSignOut,
}: {
  firmName: string;
  planClass?: string;
  onSignOut: () => void;
}) {
  return (
    <Box component="footer" className={`esti-app-footer ${planClass ?? ""}`}>
      <span className="esti-app-brand__firm">{firmName}</span>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <FooterClock />
        <HeaderPomodoro />
        <AlertsBell />
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onSignOut} aria-label="Sign out">
            <Logout />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
