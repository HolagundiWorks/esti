import { useEffect, useState } from "react";
import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;

const fmt = (n: number | null) => (n === null ? "∞" : String(n));

export default function ProductsTab() {
  const [products, setProducts] = useState<Products>([]);

  useEffect(() => {
    void trpc.admin.products.list.query().then(setProducts);
  }, []);

  return (
    <Stack gap={7}>
      {products.map((p) => (
        <Stack key={p.id} gap={3}>
          <Stack gap={2} orientation="horizontal">
            <h3 className="esti-grow">{p.name}</h3>
            <Tag type={p.kind === "API" ? "purple" : "blue"} size="md">
              {p.kind}
            </Tag>
          </Stack>
          <Table size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>Plan</TableHeader>
                <TableHeader>Seats</TableHeader>
                <TableHeader>Devices</TableHeader>
                <TableHeader>Meter</TableHeader>
                <TableHeader>Features</TableHeader>
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
