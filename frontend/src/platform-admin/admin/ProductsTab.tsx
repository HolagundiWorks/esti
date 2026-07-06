import { useEffect, useState } from "react";
import { Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { trpc } from "../lib/trpc";

type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;

const fmt = (n: number | null) => (n === null ? "∞" : String(n));
const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

export default function ProductsTab() {
  const [products, setProducts] = useState<Products>([]);

  useEffect(() => {
    void trpc.admin.products.list.query().then(setProducts);
  }, []);

  return (
    <Stack spacing={4}>
      {products.map((p) => (
        <Stack key={p.id} spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6" sx={{ flex: 1 }}>{p.name}</Typography>
            <Chip size="small" label={p.kind} sx={chipSx(p.kind === "API" ? "purple" : "blue")} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Plan</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Devices</TableCell>
                <TableCell>Meter</TableCell>
                <TableCell>Features</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {p.plans.map((pl) => (
                <TableRow key={pl.id}>
                  <TableCell>{pl.name}</TableCell>
                  <TableCell>{fmt(pl.seats)}</TableCell>
                  <TableCell>{fmt(pl.deviceLimit)}</TableCell>
                  <TableCell>
                    {pl.meterUnit === "seats" ? "—" : `${fmt(pl.meterLimit)} ${pl.meterUnit}`}
                  </TableCell>
                  <TableCell>{pl.featureCodes.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ))}
    </Stack>
  );
}
