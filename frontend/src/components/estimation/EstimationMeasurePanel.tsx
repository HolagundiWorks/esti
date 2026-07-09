import {
  Alert,
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { trpc } from "../../lib/trpc.js";
import { STRUCTURE_CLASS_LABEL } from "./constants.js";

function dimField(
  label: string,
  value: number | undefined,
  onChange: (v: number) => void,
) {
  return (
    <TextField
      size="small"
      label={label}
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      sx={{ width: 100 }}
    />
  );
}

/** Enter element dimensions (mm) — quantities derive from measurement type. */
export function EstimationMeasurePanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const updateElement = trpc.cms.elements.update.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });

  const elements = elementsQ.data?.elements ?? [];
  const totalPaise = elementsQ.data?.totalPaise ?? 0;

  function updateDims(
    id: string,
    patch: Partial<{ length: number; height: number; thickness: number; nos: number }>,
  ) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const dims = { ...(el.dimensions as Record<string, number>), ...patch };
    void updateElement.mutateAsync({ id, dimensions: dims });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6" component="h2">
        Measurements
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Enter dimensions in millimetres. Quantities and amounts update from the linked
        specification rate and measurement type.
      </Typography>

      {elements.length === 0 ? (
        <Alert severity="info">Complete the structure model and add elements first.</Alert>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>L (mm)</TableCell>
                <TableCell>H (mm)</TableCell>
                <TableCell>T (mm)</TableCell>
                <TableCell>Nos</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {elements.map((el) => {
                const d = (el.dimensions ?? {}) as Record<string, number>;
                return (
                  <TableRow key={el.id} hover>
                    <TableCell>{el.code}</TableCell>
                    <TableCell>{el.description}</TableCell>
                    <TableCell>
                      {el.structureClass
                        ? STRUCTURE_CLASS_LABEL[el.structureClass as keyof typeof STRUCTURE_CLASS_LABEL]
                        : "—"}
                    </TableCell>
                    <TableCell>{el.measurementType}</TableCell>
                    <TableCell>
                      {dimField("L", d.length, (v) => updateDims(el.id, { length: v }))}
                    </TableCell>
                    <TableCell>
                      {dimField("H", d.height, (v) => updateDims(el.id, { height: v }))}
                    </TableCell>
                    <TableCell>
                      {dimField("T", d.thickness, (v) => updateDims(el.id, { thickness: v }))}
                    </TableCell>
                    <TableCell>
                      {dimField("Nos", d.nos, (v) => updateDims(el.id, { nos: v }))}
                    </TableCell>
                    <TableCell align="right">
                      {el.quantity} {el.unit ?? ""}
                    </TableCell>
                    <TableCell align="right">{formatINR(el.amountPaise)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle1">Running total: {formatINR(totalPaise)}</Typography>
        <Button
          variant="outlined"
          size="small"
          component="a"
          href={`/projects/${projectId}?tab=estimation`}
        >
          Import / rate book (project)
        </Button>
      </Stack>
    </Stack>
  );
}
