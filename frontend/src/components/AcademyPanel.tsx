import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CheckCircle from "@mui/icons-material/CheckCircle";
import { useState } from "react";
import {
  ACADEMY_CURRICULUM,
  ACADEMY_PARTS,
  type AcademyModule,
  type AcademyModuleProgress,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

function ModuleRow({
  mod,
  progress,
  onMarkTheoryRead,
  onAttestPractical,
  pending,
}: {
  mod: AcademyModule;
  progress: AcademyModuleProgress | undefined;
  onMarkTheoryRead: (sopCode: string) => void;
  onAttestPractical: (sopCode: string, note: string) => void;
  pending: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const theoryDone = !!progress?.theoryReadAt;
  const practicalDone = !!progress?.practicalAt;
  const complete = !!progress?.completedAt;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: 1, flexWrap: "wrap" }}>
          {complete && <CheckCircle color="success" fontSize="small" />}
          <Typography sx={{ fontWeight: 600 }}>{mod.code}</Typography>
          <Typography sx={{ flex: 1 }}>{mod.title}</Typography>
          <Chip
            size="small"
            variant={theoryDone ? "filled" : "outlined"}
            color={theoryDone ? "success" : "default"}
            label="Theory"
          />
          <Chip
            size="small"
            variant={practicalDone ? "filled" : "outlined"}
            color={practicalDone ? "success" : "default"}
            label="Practical"
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">Theory</Typography>
            <Typography variant="body2">{mod.theory}</Typography>
            {theoryDone ? (
              <Typography variant="caption" color="text.secondary">
                Read {new Date(progress!.theoryReadAt!).toLocaleDateString()}
              </Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={pending}
                  onClick={() => onMarkTheoryRead(mod.code)}
                >
                  Mark theory read
                </Button>
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Practical</Typography>
            <Typography variant="body2">{mod.practical}</Typography>
            {practicalDone ? (
              <Typography variant="caption" color="text.secondary">
                {progress!.practicalSource === "AUTO" ? "Detected" : "Marked done"}{" "}
                {new Date(progress!.practicalAt!).toLocaleDateString()}
                {progress!.practicalNote ? ` — “${progress!.practicalNote}”` : ""}
              </Typography>
            ) : mod.signal === "AUTO" ? (
              <Typography variant="caption" color="text.secondary">
                Detected automatically the first time you do this for real — nothing to click here.
              </Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" disabled={pending} onClick={() => setNoteOpen(true)}>
                  Mark practical done
                </Button>
              </Box>
            )}
          </Box>
        </Stack>
      </AccordionDetails>
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{mod.code} — mark practical done</DialogTitle>
        <DialogContent>
          <TextField
            id={`academy-note-${mod.code}`}
            label="Note (optional)"
            multiline
            rows={2}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              onAttestPractical(mod.code, note);
              setNoteOpen(false);
              setNote("");
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
}

/** LXOS Academy — SOP.md as theory, real workspace usage as practical. */
export function AcademyPanel() {
  const utils = trpc.useUtils();
  const progressQ = trpc.academy.myProgress.useQuery();

  const invalidate = () => utils.academy.myProgress.invalidate();
  const markTheoryRead = trpc.academy.markTheoryRead.useMutation({ onSuccess: invalidate });
  const attestPractical = trpc.academy.attestPractical.useMutation({ onSuccess: invalidate });

  const pending = markTheoryRead.isPending || attestPractical.isPending;
  const byCode = new Map((progressQ.data ?? []).map((p) => [p.sopCode, p]));
  const totalComplete = (progressQ.data ?? []).filter((p) => p.completedAt).length;

  if (progressQ.isLoading) return <CircularProgress aria-label="Loading academy progress" />;

  return (
    <Stack spacing={3}>
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {totalComplete} / {ACADEMY_CURRICULUM.length} SOPs complete — theory (read) + practical (done for real
            in this workspace, auto-detected where possible).
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(totalComplete / ACADEMY_CURRICULUM.length) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        {(markTheoryRead.error || attestPractical.error) && (
          <Alert severity="error">
            {(markTheoryRead.error ?? attestPractical.error)?.message}
          </Alert>
        )}
        {ACADEMY_PARTS.map((part) => {
          const mods = ACADEMY_CURRICULUM.filter((m) => m.part === part.id);
          const partComplete = mods.filter((m) => byCode.get(m.code)?.completedAt).length;
          return (
            <Box key={part.id}>
              <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                Part {part.id} — {part.title}{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  ({partComplete}/{mods.length})
                </Typography>
              </Typography>
              <Stack spacing={0.5}>
                {mods.map((m) => (
                  <ModuleRow
                    key={m.code}
                    mod={m}
                    progress={byCode.get(m.code)}
                    pending={pending}
                    onMarkTheoryRead={(sopCode) => markTheoryRead.mutate({ sopCode })}
                    onAttestPractical={(sopCode, note) =>
                      attestPractical.mutate({ sopCode, note: note || undefined })
                    }
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
    </Stack>
  );
}
