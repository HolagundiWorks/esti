import type { KbLaborCreate, KbLaborUpdate } from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";
import { KbLibraryTable, type KbField, type KbRow } from "./KbLibraryTable.js";

const FIELDS: KbField[] = [
  { key: "name", label: "Labour", type: "text", required: true, placeholder: "e.g. Mason" },
  { key: "unit", label: "Unit", type: "text", required: true, placeholder: "e.g. Day" },
  { key: "rateType", label: "Rate type", type: "text", placeholder: "e.g. Daily" },
  { key: "productivityFactor", label: "Productivity", type: "number", helper: "Optional output / day" },
  { key: "defaultRatePaise", label: "Default rate", type: "money" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export function LaborLibrary() {
  const utils = trpc.useUtils();
  const q = trpc.kb.labor.list.useQuery();
  const inval = () => utils.kb.labor.list.invalidate();
  const create = trpc.kb.labor.create.useMutation({ onSuccess: inval });
  const update = trpc.kb.labor.update.useMutation({ onSuccess: inval });
  const remove = trpc.kb.labor.remove.useMutation({ onSuccess: inval });

  return (
    <KbLibraryTable
      title="Labour library"
      description="Labour resources — unit, rate type, productivity, and a default day rate."
      newLabel="New labour"
      fields={FIELDS}
      rows={(q.data ?? []) as KbRow[]}
      loading={q.isLoading}
      saving={create.isPending || update.isPending}
      onSubmit={(values, id) =>
        id
          ? update.mutate({ id, ...values } as KbLaborUpdate)
          : create.mutate(values as KbLaborCreate)
      }
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}
