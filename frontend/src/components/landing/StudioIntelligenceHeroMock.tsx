import { Box, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography } from "@mui/material";
import { OfficeHealthGlyph } from "../shell/OfficeHealthGlyph.js";
import { StatusDot } from "../StatusTag.js";
import type { ZoneState } from "../dashboard/zoneState.js";

const ZONES: { label: string; state: ZoneState }[] = [
  { label: "Client", state: "watch" },
  { label: "Finance", state: "stable" },
  { label: "Projects", state: "friction" },
  { label: "Team", state: "stable" },
];

const PRIORITIES = [
  {
    rank: 1,
    task: "Complete fee proposal revision",
    detail: "PRJ-042 · Action today",
    band: "red" as const,
    priority: "P92",
    conf: "84%",
    state: "critical" as ZoneState,
  },
  {
    rank: 2,
    task: "Review MoM sign-off",
    detail: "PRJ-018 · Watch",
    band: "warm-gray" as const,
    priority: "P78",
    conf: "71%",
    state: "watch" as ZoneState,
  },
  {
    rank: 3,
    task: "Upload inspection photos",
    detail: "PRJ-031 · Watch",
    band: "warm-gray" as const,
    priority: "P65",
    conf: "68%",
    state: "watch" as ZoneState,
  },
];

const FILING = [
  { name: "TDS payment", date: "07 Jul", days: 4 },
  { name: "GSTR-1", date: "11 Jul", days: 8 },
  { name: "GSTR-3B", date: "20 Jul", days: 17 },
];

/** Static Studio Intelligence surface — matches `StudioAbstract` rail · stage · ESTI tab. */
export function StudioIntelligenceHeroMock() {
  return (
    <div className="lp2-hero__studio-mock esti-glass-dash" aria-hidden>
      <div className="esti-si-breath lp2-hero__studio-breath">
        <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <g className="esti-si-breath__rings">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse
                key={i}
                className="esti-si-breath__ring"
                cx={300}
                cy={300}
                rx={40 + i * 34}
                ry={36 + i * 32}
              />
            ))}
          </g>
        </svg>
      </div>

      <Box className="lp2-hero__studio-body" sx={{ display: "flex", flex: 1, minHeight: 0, gap: 1 }}>
        <Box className="esti-dash-rail lp2-hero__studio-rail" sx={{ flex: "0 0 28%", minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 300, lineHeight: 1.15, display: "block", fontSize: "0.72rem" }}>
            Good afternoon,
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.15, display: "block", fontSize: "0.78rem" }}>
            Priya
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontSize: "0.58rem" }}>
            Meridian Advisory
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: "0.58rem", lineHeight: 1.35 }}>
            2 approvals waiting — review client sign-off
          </Typography>

          <Box sx={{ mt: 0.75 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.52rem", letterSpacing: "0.1em" }}>
              Today
            </Typography>
            <Box sx={{ mt: 0.25, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {[
                { label: "Tasks", value: "8" },
                { label: "Meetings", value: "2" },
                { label: "Visits", value: "1" },
              ].map((item, i) => (
                <Box
                  key={item.label}
                  sx={{
                    minWidth: 0,
                    px: 0.25,
                    textAlign: "center",
                    borderLeft: i > 0 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.5rem" }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontWeight: 300, fontSize: "0.72rem", lineHeight: 1.1 }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              mt: 0.5,
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>
              Office health
            </Typography>
            <Box sx={{ flex: 1 }} />
            <OfficeHealthGlyph state="watch" variant="glass" size={10} />
            <Typography sx={{ fontWeight: 300, fontSize: "0.62rem", textTransform: "capitalize" }}>Watch</Typography>
          </Box>

          <Box sx={{ mt: 0.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>
              Due dates
            </Typography>
            <Box sx={{ mt: 0.25, display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {FILING.map((f, i) => (
                <Box key={f.name} sx={{ minWidth: 0, px: 0.25, borderLeft: i > 0 ? 1 : 0, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.48rem", display: "block" }}>
                    {f.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 300, fontSize: "0.62rem", lineHeight: 1.1 }} noWrap>
                    {f.date}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      fontSize: "0.48rem",
                      color: f.days <= 7 ? "warning.main" : "text.secondary",
                    }}
                  >
                    {f.days}d
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box className="esti-dash-stage lp2-hero__studio-stage" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Tabs value="priorities" variant="scrollable" scrollButtons={false} sx={{ minHeight: 28, borderBottom: 1, borderColor: "divider" }}>
            <Tab value="priorities" label="ESTI" sx={{ minHeight: 28, py: 0.25, px: 0.75, fontSize: "0.62rem" }} />
            <Tab value="projects" label="Projects" sx={{ minHeight: 28, py: 0.25, px: 0.75, fontSize: "0.62rem" }} disabled />
            <Tab value="work" label="Work" sx={{ minHeight: 28, py: 0.25, px: 0.75, fontSize: "0.62rem" }} disabled />
            <Tab value="team" label="Team" sx={{ minHeight: 28, py: 0.25, px: 0.75, fontSize: "0.62rem" }} disabled />
          </Tabs>

          <Box
            sx={{
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ flexShrink: 0, fontSize: "0.5rem", letterSpacing: "0.08em" }}>
              Zone health
            </Typography>
            <Box className="esti-dash-stage-head__zones" sx={{ flex: 1, display: "flex", justifyContent: "space-evenly", minWidth: 0 }}>
              {ZONES.map((z) => (
                <Box key={z.label} className="esti-zone-health__item" sx={{ textAlign: "center", px: 0.25 }}>
                  <OfficeHealthGlyph state={z.state} variant="glass" size={8} />
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.48rem", display: "block" }}>
                    {z.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 0.35 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>
              Finance snapshot
            </Typography>
          </Box>

          <Box className="esti-priorities-focus" sx={{ flex: 1, minHeight: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>
              ESTI priorities
            </Typography>
            <Table size="small" sx={{ mt: 0.35, "& .MuiTableCell-root": { py: 0.35, px: 0.5, fontSize: "0.56rem", borderColor: "divider" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Conf.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PRIORITIES.map((row) => (
                  <TableRow key={row.rank}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: "0.52rem", fontWeight: 600 }}>
                          {row.rank}
                        </Typography>
                        <OfficeHealthGlyph state={row.state} size={7} />
                        <span>{row.task}</span>
                      </Box>
                    </TableCell>
                    <TableCell>{row.detail}</TableCell>
                    <TableCell>
                      <StatusDot color={row.band} label={row.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusDot color="green" label={row.conf} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>
    </div>
  );
}
