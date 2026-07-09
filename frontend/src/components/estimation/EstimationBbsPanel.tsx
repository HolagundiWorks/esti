import {
  Alert,
  Box,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { computeMemberBBS, type MemberInput } from "@esti/contracts";
import type { CmsBbsElement } from "@esti/contracts";
import { useMemo } from "react";
import { trpc } from "../../lib/trpc.js";
import { BBS_ELEMENT_LABEL } from "./constants.js";

const DEFAULT_PARAMS: Record<CmsBbsElement, Record<string, number>> = {
  SLAB: {
    lengthMm: 5000,
    widthMm: 4000,
    mainDiaMm: 10,
    mainSpacingMm: 150,
    distDiaMm: 8,
    distSpacingMm: 200,
    concreteGradeMpa: 25,
  },
  BEAM: {
    clearSpanMm: 5000,
    widthMm: 230,
    depthMm: 450,
    bottomDiaMm: 16,
    bottomNos: 3,
    topDiaMm: 12,
    topNos: 2,
    stirrupDiaMm: 8,
    stirrupSpacingMm: 150,
    concreteGradeMpa: 25,
  },
  COLUMN: {
    heightMm: 3000,
    widthMm: 300,
    depthMm: 450,
    verticalDiaMm: 16,
    verticalNos: 8,
    tieDiaMm: 8,
    tieSpacingMm: 150,
    concreteGradeMpa: 25,
  },
  FOOTING: {
    lengthMm: 2000,
    widthMm: 2000,
    thicknessMm: 450,
    xBarDiaMm: 12,
    xBarSpacingMm: 150,
    yBarDiaMm: 12,
    yBarSpacingMm: 150,
    concreteGradeMpa: 25,
  },
};

function toMemberInput(
  bbsElement: CmsBbsElement,
  ref: string,
  params: Record<string, unknown>,
): MemberInput | null {
  const steelGrade = "Fe500" as const;
  const base = { ref, concreteGradeMpa: 25, steelGrade, ...params };
  switch (bbsElement) {
    case "SLAB":
      return { element: "SLAB", ...base } as MemberInput;
    case "BEAM":
      return { element: "BEAM", ...base } as MemberInput;
    case "COLUMN":
      return { element: "COLUMN", ...base } as MemberInput;
    case "FOOTING":
      return { element: "FOOTING", ...base } as MemberInput;
    default:
      return null;
  }
}

/** BBS schedule from elements mapped to IS-code member types. */
export function EstimationBbsPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const updateElement = trpc.cms.elements.update.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });

  const steelElements = (elementsQ.data?.elements ?? []).filter((e) => e.bbsElement);

  const schedules = useMemo(() => {
    return steelElements.map((el) => {
      const kind = el.bbsElement as CmsBbsElement;
      const params = {
        ...DEFAULT_PARAMS[kind],
        ...((el.bbsParams as Record<string, number>) ?? {}),
      };
      const input = toMemberInput(kind, el.code, params);
      const schedule = input ? computeMemberBBS(input) : null;
      return { el, schedule, params };
    });
  }, [steelElements]);

  const totalKg = schedules.reduce((s, x) => s + (x.schedule?.totalWeightKg ?? 0), 0);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" component="h2">
        BBS / steel schedule
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Elements mapped to slab, beam, column, or footing use IS 456 / IS 2502 detailing
        defaults from the rate library engine.
      </Typography>

      {steelElements.length === 0 ? (
        <Alert severity="info">
          Assign a BBS member type (Slab, Beam, Column, Footing) to elements in the structure model.
        </Alert>
      ) : (
        schedules.map(({ el, schedule }) => (
          <Box key={el.id} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">
                {el.code} — {BBS_ELEMENT_LABEL[el.bbsElement as CmsBbsElement]}
              </Typography>
              <TextField
                select
                size="small"
                label="Member type"
                value={el.bbsElement ?? ""}
                onChange={(e) =>
                  void updateElement.mutateAsync({
                    id: el.id,
                    bbsElement: (e.target.value || null) as CmsBbsElement | null,
                  })
                }
                sx={{ maxWidth: 220 }}
              >
                {(Object.keys(BBS_ELEMENT_LABEL) as CmsBbsElement[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {BBS_ELEMENT_LABEL[k]}
                  </MenuItem>
                ))}
              </TextField>
              {schedule && (
                <>
                  <Typography variant="body2">
                    Total steel: {schedule.totalWeightKg.toFixed(2)} kg
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mark</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Dia</TableCell>
                        <TableCell align="right">Nos</TableCell>
                        <TableCell align="right">Cut (mm)</TableCell>
                        <TableCell align="right">Wt (kg)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedule.bars.map((b) => (
                        <TableRow key={b.mark}>
                          <TableCell>{b.mark}</TableCell>
                          <TableCell>{b.role}</TableCell>
                          <TableCell>{b.diaMm}</TableCell>
                          <TableCell align="right">{b.nos}</TableCell>
                          <TableCell align="right">{b.cutLengthMm}</TableCell>
                          <TableCell align="right">{b.weightKg.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Stack>
          </Box>
        ))
      )}

      {totalKg > 0 && (
        <Typography variant="subtitle1">Project steel total: {totalKg.toFixed(2)} kg</Typography>
      )}
    </Stack>
  );
}
