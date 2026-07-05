import Logout from "@mui/icons-material/Logout";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { AlertsBell } from "../AlertsBell.js";
import { HeaderPomodoro } from "../HeaderPomodoro.js";
import { UserIdCard } from "../UserIdCard.js";

/**
 * Footer bar — the former top nav bar, moved to the bottom (shell brief). Carries
 * the brand mark plus the utility cluster (clock, pomodoro, search, alerts, ID card,
 * sign out). Liquid glass, fixed height = top nav bar. Sits below the floating dock.
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
  plan,
  logoSrc,
  planClass,
  onSearch,
  onSignOut,
}: {
  firmName: string;
  plan: string;
  logoSrc: string;
  planClass?: string;
  onSearch: () => void;
  onSignOut: () => void;
}) {
  return (
    <Box component="footer" className={`esti-app-footer ${planClass ?? ""}`}>
      <span className="esti-app-brand">
        <img src={logoSrc} alt="AORMS" className="esti-app-brand__logo" />
        <span className="esti-app-brand__tier">{plan}</span>
        <span className="esti-app-brand__firm">{firmName}</span>
      </span>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <FooterClock />
        <HeaderPomodoro />
        <Tooltip title="Search">
          <IconButton size="small" onClick={onSearch} aria-label="Search">
            <SearchOutlined />
          </IconButton>
        </Tooltip>
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
