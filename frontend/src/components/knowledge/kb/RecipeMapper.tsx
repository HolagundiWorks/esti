import { useEffect, useState } from "react";
import { InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { trpc } from "../../../lib/trpc.js";
import { MappingPanel, type MappingRow } from "./MappingPanel.js";

/** Recipe data-mapper: pick item → specification, then connect materials + labour
 *  (quantity per item unit) to that specification. */
export function RecipeMapper() {
  const utils = trpc.useUtils();
  const itemsQ = trpc.kb.items.list.useQuery();
  const materialsQ = trpc.kb.materials.list.useQuery();
  const laborQ = trpc.kb.labor.list.useQuery();

  const [itemId, setItemId] = useState("");
  useEffect(() => {
    if (!itemId && itemsQ.data && itemsQ.data.length > 0) setItemId(itemsQ.data[0]!.id);
  }, [itemsQ.data, itemId]);

  const specsQ = trpc.kb.specifications.listByItem.useQuery(
    { itemId },
    { enabled: !!itemId },
  );
  const [specId, setSpecId] = useState("");
  useEffect(() => {
    if (specsQ.data && specsQ.data.length > 0) {
      if (!specsQ.data.some((s) => s.id === specId)) setSpecId(specsQ.data[0]!.id);
    } else setSpecId("");
  }, [specsQ.data, specId]);

  const matQ = trpc.kb.recipes.materials.listBySpec.useQuery(
    { specificationId: specId },
    { enabled: !!specId },
  );
  const labQ = trpc.kb.recipes.labor.listBySpec.useQuery(
    { specificationId: specId },
    { enabled: !!specId },
  );
  const invalMat = () =>
    utils.kb.recipes.materials.listBySpec.invalidate({ specificationId: specId });
  const invalLab = () =>
    utils.kb.recipes.labor.listBySpec.invalidate({ specificationId: specId });
  const addMat = trpc.kb.recipes.materials.add.useMutation({ onSuccess: invalMat });
  const remMat = trpc.kb.recipes.materials.remove.useMutation({ onSuccess: invalMat });
  const addLab = trpc.kb.recipes.labor.add.useMutation({ onSuccess: invalLab });
  const remLab = trpc.kb.recipes.labor.remove.useMutation({ onSuccess: invalLab });

  const items = itemsQ.data ?? [];
  const specs = specsQ.data ?? [];

  const matRows: MappingRow[] = (matQ.data ?? []).map((r) => ({
    id: r.id,
    targetLabel: r.materialName,
    targetSub: r.materialUnit,
    values: { quantityPerUnit: r.quantityPerUnit, wastageFactor: r.wastageFactor },
  }));
  const labRows: MappingRow[] = (labQ.data ?? []).map((r) => ({
    id: r.id,
    targetLabel: r.laborName,
    targetSub: r.laborUnit,
    values: { quantityPerUnit: r.quantityPerUnit },
  }));

  if (items.length === 0) {
    return (
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="No items yet"
        subtitle="Add items + specifications first — recipes connect materials and labour to a specification."
      />
    );
  }

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={4} style={{ flexWrap: "wrap" }}>
        <Select
          id="recipe-item"
          labelText="Item"
          value={itemId}
          onChange={(e) => {
            setItemId(e.target.value);
            setSpecId("");
          }}
        >
          {items.map((it) => (
            <SelectItem key={it.id} value={it.id} text={`${it.name} (${it.unit})`} />
          ))}
        </Select>
        <Select
          id="recipe-spec"
          labelText="Specification"
          value={specId}
          disabled={specs.length === 0}
          onChange={(e) => setSpecId(e.target.value)}
        >
          <SelectItem value="" text={specs.length ? "Select…" : "No specifications"} />
          {specs.map((s) => (
            <SelectItem key={s.id} value={s.id} text={s.name} />
          ))}
        </Select>
      </Stack>

      {specId ? (
        <>
          <MappingPanel
            title="Material consumption (per item unit)"
            selectLabel="Material"
            addLabel="Add material"
            options={(materialsQ.data ?? []).map((m) => ({
              id: m.id,
              label: `${m.name} (${m.unit})`,
            }))}
            numFields={[
              { key: "quantityPerUnit", label: "Qty / unit" },
              { key: "wastageFactor", label: "Wastage" },
            ]}
            rows={matRows}
            loading={matQ.isLoading}
            saving={addMat.isPending}
            onAdd={(materialId, v) =>
              addMat.mutate({
                specificationId: specId,
                materialId,
                quantityPerUnit: v.quantityPerUnit ?? 0,
                wastageFactor: v.wastageFactor ?? 0,
              })
            }
            onRemove={(id) => remMat.mutate({ id })}
          />

          <MappingPanel
            title="Labour consumption (per item unit)"
            selectLabel="Labour"
            addLabel="Add labour"
            options={(laborQ.data ?? []).map((l) => ({
              id: l.id,
              label: `${l.name} (${l.unit})`,
            }))}
            numFields={[{ key: "quantityPerUnit", label: "Qty / unit" }]}
            rows={labRows}
            loading={labQ.isLoading}
            saving={addLab.isPending}
            onAdd={(laborId, v) =>
              addLab.mutate({
                specificationId: specId,
                laborId,
                quantityPerUnit: v.quantityPerUnit ?? 0,
              })
            }
            onRemove={(id) => remLab.mutate({ id })}
          />
        </>
      ) : (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No specification selected"
          subtitle="Pick (or add) a specification for this item to map its recipe."
        />
      )}
    </Stack>
  );
}
