import {
  Alert,
  AlertTitle,
  Autocomplete,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  BUILDING_LEVEL_MAX_INDEX,
  DEFAULT_STOREY_HEIGHT_MM,
  LVL0_FLOOR_NAME_SUGGESTIONS,
  buildingLevelCode,
  computeLevelElevations,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

type DraftRow = {
  levelIndex: number;
  floorName: string;
  /** metres, edited as text for UX */
  storeyHeightM: string;
  /** blank = inherit project default */
  beamDepthM: string;
  /** blank = inherit project default */
  lintelHeightM: string;
};

const DEFAULT_NAMES = [
  "Ground",
  "First floor",
  "Second floor",
  "Third floor",
  "Fourth floor",
  "Fifth floor",
  "Sixth floor",
  "Seventh floor",
  "Eighth floor",
  "Ninth floor",
  "Tenth floor",
];

function defaultName(index: number): string {
  if (index === 0) return "Ground";
  return DEFAULT_NAMES[index] ?? `Floor ${index}`;
}

function metresToMmPositive(value: string): number | null {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000);
}

function metresToMmOptional(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000);
}

function mmToMetres(mm: number): string {
  return (mm / 1000).toFixed(3);
}

function buildDrafts(count: number, existing?: DraftRow[]): DraftRow[] {
  const prev = new Map((existing ?? []).map((r) => [r.levelIndex, r]));
  return Array.from({ length: count }, (_, i) => {
    const old = prev.get(i);
    return {
      levelIndex: i,
      floorName: old?.floorName || defaultName(i),
      storeyHeightM: old?.storeyHeightM || mmToMetres(DEFAULT_STOREY_HEIGHT_MM),
      beamDepthM: old?.beamDepthM ?? "",
      lintelHeightM: old?.lintelHeightM ?? "",
    };
  });
}

export function ProjectFloorsPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const levelsQ = trpc.measurement.listLevels.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const defaultsQ = trpc.measurement.getStructuralDefaults.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const [syncedRows, setSyncedRows] = useState(0);
  const configure = trpc.measurement.configureFloors.useMutation({
    onSuccess: (res) => {
      utils.measurement.listLevels.invalidate({ projectId });
      utils.measurement.getBook.invalidate({ projectId });
      setSyncedRows(res.syncedRows ?? 0);
      setSaved(true);
      setError(null);
    },
    onError: (e) => {
      setError(e.message);
      setSaved(false);
    },
  });

  const [floorCount, setFloorCount] = useState(1);
  const [rows, setRows] = useState<DraftRow[]>(() => buildDrafts(1));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !levelsQ.data) return;
    if (levelsQ.data.length === 0) {
      setFloorCount(1);
      setRows(buildDrafts(1));
    } else {
      const sorted = [...levelsQ.data].sort((a, b) => a.levelIndex - b.levelIndex);
      const count = Math.min(
        BUILDING_LEVEL_MAX_INDEX + 1,
        Math.max(...sorted.map((l) => l.levelIndex)) + 1,
      );
      setFloorCount(count);
      setRows(
        buildDrafts(
          count,
          sorted.map((l) => ({
            levelIndex: l.levelIndex,
            floorName: l.name,
            storeyHeightM: mmToMetres(l.storeyHeightMm),
            beamDepthM: l.beamDepthMm != null ? mmToMetres(l.beamDepthMm) : "",
            lintelHeightM: l.lintelHeightMm != null ? mmToMetres(l.lintelHeightMm) : "",
          })),
        ),
      );
    }
    setHydrated(true);
  }, [levelsQ.data, hydrated]);

  const elevations = useMemo(() => {
    const parsed = rows.map((r) => ({
      levelIndex: r.levelIndex,
      storeyHeightMm: metresToMmPositive(r.storeyHeightM) ?? DEFAULT_STOREY_HEIGHT_MM,
    }));
    return computeLevelElevations(parsed);
  }, [rows]);

  const projectBeam = defaultsQ.data ? mmToMetres(defaultsQ.data.beamDepthMm) : "0.450";
  const projectLintel = defaultsQ.data ? mmToMetres(defaultsQ.data.lintelHeightMm) : "0.150";

  const setCount = (n: number) => {
    const count = Math.max(1, Math.min(BUILDING_LEVEL_MAX_INDEX + 1, n));
    setFloorCount(count);
    setRows((prev) => buildDrafts(count, prev));
    setSaved(false);
  };

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.levelIndex === index ? { ...r, ...patch } : r)));
    setSaved(false);
  };

  const save = () => {
    setError(null);
    const levels = rows.map((r) => {
      const storeyHeightMm = metresToMmPositive(r.storeyHeightM);
      if (!storeyHeightMm) {
        throw new Error(`${buildingLevelCode(r.levelIndex)} needs a positive FFL height (m).`);
      }
      if (!r.floorName.trim()) {
        throw new Error(`${buildingLevelCode(r.levelIndex)} needs a floor name.`);
      }
      return {
        levelIndex: r.levelIndex,
        floorName: r.floorName.trim(),
        storeyHeightMm,
        beamDepthMm: metresToMmOptional(r.beamDepthM),
        lintelHeightMm: metresToMmOptional(r.lintelHeightM),
      };
    });
    try {
      configure.mutate({ projectId, levels });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid floor data");
    }
  };

  const nameOptions = useMemo(() => {
    const set = new Set<string>([...LVL0_FLOOR_NAME_SUGGESTIONS, ...DEFAULT_NAMES]);
    for (const r of rows) if (r.floorName.trim()) set.add(r.floorName.trim());
    return [...set];
  }, [rows]);

  return (
    <Stack spacing={2} sx={{ mt: 3, maxWidth: 960 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" component="h3">
          Building floors
        </Typography>
        <Typography variant="body2" className="esti-label--secondary">
          Each level owns the storey above its FFL: <strong>LVL 0</strong> is the floor between LVL
          0 → LVL 1, <strong>LVL 1</strong> is between LVL 1 → LVL 2, and so on. Beam depth and
          lintel can vary per level — leave blank to use project defaults ({projectBeam} m beam /{" "}
          {projectLintel} m lintel).
        </Typography>
      </Stack>

      <TextField
        select
        label="Number of floors (levels)"
        value={floorCount}
        onChange={(e) => setCount(Number.parseInt(e.target.value, 10))}
        sx={{ maxWidth: 280 }}
        helperText={`Creates LVL 0 through LVL ${floorCount - 1}`}
      >
        {Array.from({ length: BUILDING_LEVEL_MAX_INDEX + 1 }, (_, i) => i + 1).map((n) => (
          <MenuItem key={n} value={n}>
            {n} {n === 1 ? "level" : "levels"} (LVL 0–{n - 1})
          </MenuItem>
        ))}
      </TextField>

      <Stack spacing={1.5}>
        {rows.map((row) => {
          const elevMm = elevations.get(row.levelIndex) ?? 0;
          const isTop = row.levelIndex === floorCount - 1;
          const spanLabel = isTop
            ? `${buildingLevelCode(row.levelIndex)} → roof`
            : `${buildingLevelCode(row.levelIndex)} → ${buildingLevelCode(row.levelIndex + 1)}`;
          return (
            <Stack
              key={row.levelIndex}
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                "& > *": { flexShrink: 0 },
              }}
            >
              <TextField
                label="Level"
                value={buildingLevelCode(row.levelIndex)}
                InputProps={{ readOnly: true }}
                sx={{ width: 100 }}
                size="small"
                helperText={spanLabel}
              />
              <Autocomplete
                freeSolo
                options={
                  row.levelIndex === 0
                    ? [...LVL0_FLOOR_NAME_SUGGESTIONS]
                    : nameOptions.filter((n) => !LVL0_FLOOR_NAME_SUGGESTIONS.includes(n as never))
                }
                value={row.floorName}
                onInputChange={(_e, value) => updateRow(row.levelIndex, { floorName: value })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Floor name"
                    placeholder={row.levelIndex === 0 ? "Basement / Ground / Stilt" : "First floor"}
                    size="small"
                  />
                )}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <TextField
                label="Storey H (m)"
                value={row.storeyHeightM}
                onChange={(e) => updateRow(row.levelIndex, { storeyHeightM: e.target.value })}
                size="small"
                sx={{ width: 110 }}
                helperText={isTop ? "→ roof" : "FFL→FFL"}
              />
              <TextField
                label="Beam (m)"
                value={row.beamDepthM}
                onChange={(e) => updateRow(row.levelIndex, { beamDepthM: e.target.value })}
                size="small"
                sx={{ width: 100 }}
                placeholder={projectBeam}
                helperText={row.beamDepthM.trim() ? "Level override" : `Default ${projectBeam}`}
              />
              <TextField
                label="Lintel (m)"
                value={row.lintelHeightM}
                onChange={(e) => updateRow(row.levelIndex, { lintelHeightM: e.target.value })}
                size="small"
                sx={{ width: 100 }}
                placeholder={projectLintel}
                helperText={row.lintelHeightM.trim() ? "Level override" : `Default ${projectLintel}`}
              />
              <TextField
                label="FFL elev."
                value={mmToMetres(elevMm)}
                InputProps={{ readOnly: true }}
                size="small"
                sx={{ width: 100 }}
                helperText={row.levelIndex === 0 ? "Datum" : "From LVL 0"}
              />
            </Stack>
          );
        })}
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Could not save floors</AlertTitle>
          {error}
        </Alert>
      )}
      {saved && !error && (
        <Alert severity="success" onClose={() => setSaved(false)}>
          <AlertTitle>Floors saved</AlertTitle>
          Levels are linked to the Measurement sheet
          {syncedRows > 0 ? ` — updated height on ${syncedRows} row${syncedRows === 1 ? "" : "s"}` : ""}.{" "}
          <Link to={`/projects/${projectId}?tab=measurement`}>Open Measurement</Link>
        </Alert>
      )}

      <div>
        <Button
          variant="contained"
          disabled={configure.isPending || rows.some((r) => !r.floorName.trim())}
          onClick={() => {
            try {
              save();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Invalid floor data");
            }
          }}
        >
          {configure.isPending ? "Saving…" : "Save floor stack"}
        </Button>
      </div>
    </Stack>
  );
}
