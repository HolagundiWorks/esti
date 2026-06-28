import type { KbMaterialCreate, KbMaterialUpdate } from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { KbLibraryTable, type KbField, type KbRow } from "./KbLibraryTable.js";

const FIELDS: KbField[] = [
  { key: "name", label: "Material", type: "text", required: true, placeholder: "e.g. Cement" },
  { key: "unit", label: "Unit", type: "text", required: true, placeholder: "e.g. Bag" },
  { key: "category", label: "Category", type: "text", placeholder: "e.g. Binder" },
  { key: "wastageFactor", label: "Wastage", type: "number", helper: "Fraction — 0.05 = 5%" },
  { key: "density", label: "Density", type: "number", helper: "Optional (kg / unit)" },
  { key: "defaultRatePaise", label: "Default rate", type: "money" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export function MaterialLibrary() {
  const utils = trpc.useUtils();
  const q = trpc.kb.materials.list.useQuery();
  const inval = () => utils.kb.materials.list.invalidate();
  const create = trpc.kb.materials.create.useMutation({ onSuccess: inval });
  const update = trpc.kb.materials.update.useMutation({ onSuccess: inval });
  const remove = trpc.kb.materials.remove.useMutation({ onSuccess: inval });

  return (
    <KbLibraryTable
      title="Material library"
      description="Generic raw materials — unit, wastage, density, and a default rate. Brands and live vendor rates attach in later phases."
      newLabel="New material"
      fields={FIELDS}
      rows={(q.data ?? []) as KbRow[]}
      loading={q.isLoading}
      saving={create.isPending || update.isPending}
      onSubmit={(values, id) =>
        id
          ? update.mutate({ id, ...values } as KbMaterialUpdate)
          : create.mutate(values as KbMaterialCreate)
      }
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}
