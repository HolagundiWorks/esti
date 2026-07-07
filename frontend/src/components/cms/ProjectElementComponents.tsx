import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type Pick = { checked: boolean; qty: number };

export function ProjectElementComponents({
  parentElementId,
  parentCode,
  open,
  onClose,
  onGenerated,
}: {
  parentElementId: string | null;
  parentCode: string;
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const suggestQ = trpc.cms.elements.suggestComponents.useQuery(
    { parentElementId: parentElementId! },
    { enabled: open && !!parentElementId },
  );
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const generate = trpc.cms.elements.generateComponents.useMutation({
    onSuccess: () => {
      onGenerated();
      onClose();
    },
  });

  const suggestions = suggestQ.data ?? [];

  // seed picks from suggestions (default-check mandatory, not-yet-existing)
  useEffect(() => {
    if (!open) return;
    const seed: Record<string, Pick> = {};
    for (const s of suggestions) {
      seed[s.childItemId] = {
        checked: !s.alreadyExists && s.dependencyType === "MANDATORY",
        qty: s.suggestedQty,
      };
    }
    setPicks(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestQ.data]);

  const chosen = suggestions.filter((s) => picks[s.childItemId]?.checked);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{`Components — ${parentCode}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <p className="esti-label esti-label--secondary">
            Suggested child elements from this element's item dependencies. Quantities are derived
            (parent qty × ratio) and editable before generating.
          </p>
          <DataState
            loading={suggestQ.isLoading}
            isEmpty={!suggestQ.isLoading && suggestions.length === 0}
            columnCount={6}
            empty={{
              title: "No component suggestions",
              description: "This element's item has no dependencies. Add them in Knowledge Bank → Items → Dependencies.",
            }}
          >
            {/* Per-row checkbox + qty inputs — stays an MUI Table (not DataGrid). */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Use</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Ratio</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suggestions.map((s) => {
                    const p = picks[s.childItemId] ?? { checked: false, qty: s.suggestedQty };
                    return (
                      <TableRow key={s.childItemId}>
                        <TableCell>
                          <Checkbox
                            id={`pc-${s.childItemId}`}
                            size="small"
                            checked={p.checked}
                            onChange={(e) =>
                              setPicks((x) => ({ ...x, [s.childItemId]: { ...p, checked: e.target.checked } }))
                            }
                            slotProps={{ input: { "aria-label": `Use ${s.description}` } }}
                          />
                        </TableCell>
                        <TableCell>
                          {s.description}{" "}
                          {s.alreadyExists && <StatusDot color="cool-gray" label="exists" />}
                        </TableCell>
                        <TableCell>
                          <StatusDot
                            color={s.dependencyType === "MANDATORY" ? "blue" : "gray"}
                            label={s.dependencyType}
                          />
                        </TableCell>
                        <TableCell>{s.ratio}</TableCell>
                        <TableCell>
                          <Box className="esti-input-sm">
                            <TextField
                              id={`pq-${s.childItemId}`}
                              type="number"
                              size="small"
                              hiddenLabel
                              value={p.qty}
                              onChange={(e) =>
                                setPicks((x) => ({ ...x, [s.childItemId]: { ...p, qty: Number(e.target.value) } }))
                              }
                              slotProps={{ htmlInput: { min: 0, step: 0.001, "aria-label": "Quantity" } }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{formatINR(Math.round(p.qty * s.ratePaise))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
          {generate.error && (
            <Alert severity="error">
              <AlertTitle>Could not generate</AlertTitle>
              {generate.error.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={generate.isPending || chosen.length === 0 || !parentElementId}
          onClick={() => {
            if (!parentElementId) return;
            generate.mutate({
              parentElementId,
              picks: chosen.map((s) => ({ childItemId: s.childItemId, quantity: picks[s.childItemId]!.qty })),
            });
          }}
        >
          {generate.isPending ? "Generating…" : `Generate ${chosen.length} components`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
