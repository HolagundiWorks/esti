import Logout from "@mui/icons-material/Logout";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { Box, IconButton, InputAdornment, Stack, TextField, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertsBell } from "../AlertsBell.js";
import { HeaderPomodoro } from "../HeaderPomodoro.js";
import { UserIdCard } from "../UserIdCard.js";

/**
 * Footer bar — the former top nav bar, moved to the bottom (shell brief). There is
 * no header bar; the firm name lives in the ribbon and the AORMS logo floats top-
 * right. The footer carries the utility cluster (clock, pomodoro, alerts, ID card,
 * sign out) with the open Search bar centered. Liquid glass, compact height.
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
  planClass,
  onSignOut,
}: {
  planClass?: string;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const runSearch = () => {
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <Box component="footer" className={`esti-app-footer ${planClass ?? ""}`}>
      {/* Left utilities */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flex: 1 }}>
        <FooterClock />
        <HeaderPomodoro />
      </Stack>

      {/* Centered open search */}
      <TextField
        className="esti-app-footer__search"
        size="small"
        variant="standard"
        placeholder="Search AORMS…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && runSearch()}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Right utilities */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
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
