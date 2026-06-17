import { Select, SelectItem, Stack } from "@carbon/react";
import {
  DEFAULT_SNAP_GRID_MM,
  TAKEOFF_CATALOG,
  TakeoffCategory,
  takeoffElement,
  takeoffElementsForCategory,
  type TakeoffElementSpec,
} from "@esti/contracts";
import { useEffect, useMemo } from "react";

const CATEGORIES: { id: TakeoffCategory; label: string }[] = [
  { id: "WALL", label: "Wall" },
  { id: "SLAB", label: "Slab" },
  { id: "BEAM", label: "Beam" },
  { id: "COLUMN", label: "Column" },
  { id: "FOOTING", label: "Footing" },
];

type Props = {
  category: TakeoffCategory;
  elementTypeId: string;
  onCategoryChange: (c: TakeoffCategory) => void;
  onElementChange: (el: TakeoffElementSpec) => void;
};

export function TakeoffComponentPicker({
  category,
  elementTypeId,
  onCategoryChange,
  onElementChange,
}: Props) {
  const types = useMemo(() => takeoffElementsForCategory(category), [category]);

  useEffect(() => {
    const current = takeoffElement(elementTypeId);
    if (!current || current.category !== category) {
      const first = types[0];
      if (first) onElementChange(first);
    }
  }, [category, elementTypeId, types, onElementChange]);

  return (
    <Stack orientation="horizontal" gap={4} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <Select
        id="takeoff-cat"
        labelText="Component"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as TakeoffCategory)}
        size="sm"
      >
        {CATEGORIES.map((c) => (
          <SelectItem key={c.id} value={c.id} text={c.label} />
        ))}
      </Select>
      <Select
        id="takeoff-type"
        labelText="Type / size"
        value={elementTypeId}
        onChange={(e) => {
          const el = takeoffElement(e.target.value);
          if (el) onElementChange(el);
        }}
        size="sm"
      >
        {types.map((t) => (
          <SelectItem key={t.id} value={t.id} text={t.label} />
        ))}
      </Select>
    </Stack>
  );
}

export { DEFAULT_SNAP_GRID_MM, TAKEOFF_CATALOG };
