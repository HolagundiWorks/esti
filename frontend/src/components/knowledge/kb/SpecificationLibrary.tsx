import { useEffect, useState } from "react";
import { InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import type {
  KbSpecificationCreate,
  KbSpecificationUpdate,
} from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { KbLibraryTable, type KbField, type KbRow } from "./KbLibraryTable.js";

const FIELDS: KbField[] = [
  { key: "name", label: "Specification", type: "text", required: true, placeholder: "e.g. 1:6 Mortar" },
  { key: "isDefault", label: "Default for this item", type: "boolean" },
  { key: "description", label: "Description", type: "textarea" },
];

/** Item-mapped specification library — pick an item, manage its method/mix specs. */
export function SpecificationLibrary() {
  const utils = trpc.useUtils();
  const itemsQ = trpc.kb.items.list.useQuery();
  const [itemId, setItemId] = useState("");
  useEffect(() => {
    if (!itemId && itemsQ.data && itemsQ.data.length > 0) {
      setItemId(itemsQ.data[0]!.id);
    }
  }, [itemsQ.data, itemId]);

  const specsQ = trpc.kb.specifications.listByItem.useQuery(
    { itemId },
    { enabled: !!itemId },
  );
  const inval = () => utils.kb.specifications.listByItem.invalidate({ itemId });
  const create = trpc.kb.specifications.create.useMutation({ onSuccess: inval });
  const update = trpc.kb.specifications.update.useMutation({ onSuccess: inval });
  const remove = trpc.kb.specifications.remove.useMutation({ onSuccess: inval });
  const bulk = trpc.kb.specifications.bulkCreate.useMutation({ onSuccess: inval });

  const items = itemsQ.data ?? [];

  return (
    <Stack gap={5}>
      <Select
        id="kb-spec-item"
        labelText="Item"
        value={itemId}
        disabled={items.length === 0}
        onChange={(e) => setItemId(e.target.value)}
      >
        <SelectItem value="" text="Select an item…" />
        {items.map((it) => (
          <SelectItem key={it.id} value={it.id} text={`${it.name} (${it.unit})`} />
        ))}
      </Select>

      {items.length === 0 ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No items yet"
          subtitle="Add items in the Items tab first — specifications attach to an item."
        />
      ) : itemId ? (
        <KbLibraryTable
          title="Specifications"
          description="Method / mix variants of the selected item (e.g. Brickwork → 1:4, 1:6). Material and labour recipes attach to a specification next."
          newLabel="New specification"
          fields={FIELDS}
          rows={(specsQ.data ?? []) as KbRow[]}
          loading={specsQ.isLoading}
          saving={create.isPending || update.isPending}
          onSubmit={(values, id) =>
            id
              ? update.mutate({ id, ...values } as KbSpecificationUpdate)
              : create.mutate({ itemId, ...values } as KbSpecificationCreate)
          }
          onRemove={(id) => remove.mutate({ id })}
          onImport={(rows) =>
            bulk.mutate(
              rows.map((r) => ({ itemId, ...r })) as KbSpecificationCreate[],
            )
          }
        />
      ) : null}
    </Stack>
  );
}
