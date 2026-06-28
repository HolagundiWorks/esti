import type { KbBrandCreate, KbBrandUpdate } from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { KbLibraryTable, type KbField, type KbRow } from "./KbLibraryTable.js";

const FIELDS: KbField[] = [
  { key: "name", label: "Brand", type: "text", required: true, placeholder: "e.g. UltraTech" },
  { key: "category", label: "Category", type: "text", placeholder: "e.g. Cement" },
  { key: "website", label: "Website", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export function BrandLibrary() {
  const utils = trpc.useUtils();
  const q = trpc.kb.brands.list.useQuery();
  const inval = () => utils.kb.brands.list.invalidate();
  const create = trpc.kb.brands.create.useMutation({ onSuccess: inval });
  const update = trpc.kb.brands.update.useMutation({ onSuccess: inval });
  const remove = trpc.kb.brands.remove.useMutation({ onSuccess: inval });
  const bulk = trpc.kb.brands.bulkCreate.useMutation({ onSuccess: inval });

  return (
    <KbLibraryTable
      title="Brand library"
      description="Manufacturers, kept independent of the generic material (Cement ≠ UltraTech). Material → brand variants + vendor rates attach in later phases."
      newLabel="New brand"
      fields={FIELDS}
      rows={(q.data ?? []) as KbRow[]}
      loading={q.isLoading}
      saving={create.isPending || update.isPending}
      onSubmit={(values, id) =>
        id
          ? update.mutate({ id, ...values } as KbBrandUpdate)
          : create.mutate(values as KbBrandCreate)
      }
      onRemove={(id) => remove.mutate({ id })}
      onImport={(rows) => bulk.mutate(rows as KbBrandCreate[])}
    />
  );
}
