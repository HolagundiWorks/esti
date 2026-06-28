import type { KbItemCreate, KbItemUpdate } from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { KbLibraryTable, type KbField, type KbRow } from "./KbLibraryTable.js";

const FIELDS: KbField[] = [
  { key: "name", label: "Item", type: "text", required: true, placeholder: "e.g. Brickwork 230mm" },
  { key: "category", label: "Category", type: "text", placeholder: "e.g. Masonry" },
  { key: "unit", label: "Unit", type: "text", required: true, placeholder: "e.g. Cum" },
  { key: "description", label: "Description", type: "textarea" },
];

export function ItemLibrary() {
  const utils = trpc.useUtils();
  const q = trpc.kb.items.list.useQuery();
  const inval = () => utils.kb.items.list.invalidate();
  const create = trpc.kb.items.create.useMutation({ onSuccess: inval });
  const update = trpc.kb.items.update.useMutation({ onSuccess: inval });
  const remove = trpc.kb.items.remove.useMutation({ onSuccess: inval });

  return (
    <KbLibraryTable
      title="Item library"
      description="Master list of construction activities. Specifications, recipes, and formulas attach to these items in later phases."
      newLabel="New item"
      fields={FIELDS}
      rows={(q.data ?? []) as KbRow[]}
      loading={q.isLoading}
      saving={create.isPending || update.isPending}
      onSubmit={(values, id) =>
        id
          ? update.mutate({ id, ...values } as KbItemUpdate)
          : create.mutate(values as KbItemCreate)
      }
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}
