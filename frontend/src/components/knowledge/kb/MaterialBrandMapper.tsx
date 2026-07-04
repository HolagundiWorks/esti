import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { DataState } from "../../DataState.js";

/** Material → approved brands mapper: pick a material, connect branded variants
 *  (grade/variant, quality) with one preferred pick. Feeds vendor-rate resolution. */
export function MaterialBrandMapper() {
  const utils = trpc.useUtils();
  const materialsQ = trpc.kb.materials.list.useQuery();
  const brandsQ = trpc.kb.brands.list.useQuery();
  const [materialId, setMaterialId] = useState("");
  useEffect(() => {
    if (!materialId && materialsQ.data && materialsQ.data.length > 0) {
      setMaterialId(materialsQ.data[0]!.id);
    }
  }, [materialsQ.data, materialId]);

  const mapQ = trpc.kb.materialBrands.listByMaterial.useQuery(
    { materialId },
    { enabled: !!materialId },
  );
  const inval = () =>
    utils.kb.materialBrands.listByMaterial.invalidate({ materialId });
  const add = trpc.kb.materialBrands.add.useMutation({ onSuccess: inval });
  const remove = trpc.kb.materialBrands.remove.useMutation({ onSuccess: inval });

  const [brandId, setBrandId] = useState("");
  const [grade, setGrade] = useState("");
  const [quality, setQuality] = useState("");
  const [rate, setRate] = useState("");
  const [preferred, setPreferred] = useState(false);

  const materials = materialsQ.data ?? [];
  const brands = brandsQ.data ?? [];

  function submit() {
    if (!materialId || !brandId) return;
    add.mutate({
      materialId,
      brandId,
      gradeOrVariant: grade || undefined,
      qualityLevel: quality || undefined,
      ratePaise: rate ? Math.round(Number(rate) * 100) : undefined,
      preferred,
    });
    setBrandId("");
    setGrade("");
    setQuality("");
    setRate("");
    setPreferred(false);
  }

  if (materials.length === 0) {
    return (
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="No materials yet"
        subtitle="Add materials first — brands map to a generic material."
      />
    );
  }

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h3>Material → approved brands</h3>
        <p>
          Which branded variants supply a generic material (Cement → UltraTech OPC 53),
          with grade/variant and a preferred pick. Feeds vendor-rate resolution.
        </p>
      </Stack>

      <Select
        id="mb-material"
        labelText="Material"
        value={materialId}
        onChange={(e) => setMaterialId(e.target.value)}
      >
        {materials.map((m) => (
          <SelectItem key={m.id} value={m.id} text={`${m.name} (${m.unit})`} />
        ))}
      </Select>

      <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <Select
          id="mb-brand"
          labelText="Brand"
          value={brandId}
          disabled={brands.length === 0}
          onChange={(e) => setBrandId(e.target.value)}
        >
          <SelectItem value="" text={brands.length ? "Select…" : "No brands — add some in the library above"} />
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id} text={b.name} />
          ))}
        </Select>
        <TextInput
          id="mb-grade"
          labelText="Grade / variant"
          placeholder="e.g. OPC 53"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <TextInput
          id="mb-quality"
          labelText="Quality"
          placeholder="optional"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
        />
        <TextInput
          id="mb-rate"
          labelText="Brand rate (₹)"
          type="number"
          placeholder="optional"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <Checkbox
          id="mb-preferred"
          labelText="Preferred"
          checked={preferred}
          onChange={(_evt, { checked }) => setPreferred(checked)}
        />
        <Button renderIcon={Add} onClick={submit} disabled={!brandId || add.isPending}>
          Add brand
        </Button>
      </Stack>

      <DataState
        loading={!!materialId && mapQ.isLoading}
        isEmpty={(mapQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: "No brands mapped",
          description: "Pick a brand above and add it.",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Brand</TableHeader>
                <TableHeader>Grade / variant</TableHeader>
                <TableHeader>Quality</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Preferred</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(mapQ.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.brandName}</TableCell>
                  <TableCell>{r.gradeOrVariant ?? "—"}</TableCell>
                  <TableCell>{r.qualityLevel ?? "—"}</TableCell>
                  <TableCell>{r.ratePaise != null ? formatINR(r.ratePaise, { paise: false }) : "—"}</TableCell>
                  <TableCell>
                    {r.preferred ? (
                      <Tag type="green" size="sm">Preferred</Tag>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Remove"
                      tooltipPosition="left"
                      onClick={() => remove.mutate({ id: r.id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
