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
  Typography,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { trpc } from "../../lib/trpc.js";

/** Grouped BOQ from modelled elements. */
export function EstimationBoqPanel({ projectId }: { projectId: string }) {
  const boqQ = trpc.cms.boq.byProject.useQuery({ projectId });
  const finalSet = trpc.cms.finalSet.markFinal.useMutation();

  const lines = boqQ.data?.boq ?? [];
  const totalPaise = boqQ.data?.totalPaise ?? 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h2" className="esti-grow">
          BOQ abstract
        </Typography>
        <Button
          variant="contained"
          size="small"
          disabled={lines.length === 0 || finalSet.isPending}
          onClick={() => void finalSet.mutateAsync({ projectId, title: "Estimation freeze" })}
        >
          Freeze final estimation set
        </Button>
      </Stack>

      {lines.length === 0 ? (
        <Alert severity="info">Enter measurements to generate BOQ lines.</Alert>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Elements</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.unit ?? "—"}</TableCell>
                  <TableCell align="right">{line.totalQuantity}</TableCell>
                  <TableCell align="right">{formatINR(line.ratePaise)}</TableCell>
                  <TableCell align="right">{formatINR(line.totalAmountPaise)}</TableCell>
                  <TableCell align="right">{line.elementCount}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} />
                <TableCell align="right">
                  <strong>{formatINR(totalPaise)}</strong>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary">
        Material take-off and cost intelligence remain under the project Cost Management tabs.
      </Typography>
    </Stack>
  );
}
