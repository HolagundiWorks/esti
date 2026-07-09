import type { CmsBbsElement, CmsLocationKind, CmsStructureClass } from "@esti/contracts";

export const STRUCTURE_CLASS_LABEL: Record<CmsStructureClass, string> = {
  SUBSTRUCTURE: "Substructure",
  SUPERSTRUCTURE: "Superstructure",
  FINISHES: "Finishes",
  SERVICES: "Services",
};

export const STRUCTURE_CLASSES = Object.keys(STRUCTURE_CLASS_LABEL) as CmsStructureClass[];

export const LOCATION_KIND_LABEL: Record<CmsLocationKind, string> = {
  ZONE: "Zone",
  BUILDING: "Building",
  FLOOR: "Floor",
  ROOM: "Room",
  SECTION: "Section",
};

export const BBS_ELEMENT_LABEL: Record<CmsBbsElement, string> = {
  SLAB: "Slab (IS 456)",
  BEAM: "Beam (IS 456)",
  COLUMN: "Column (IS 456)",
  FOOTING: "Footing (IS 456)",
};

export type EstimationPhase = "model" | "measure" | "boq" | "bbs";

export const ESTIMATION_PHASES: { id: EstimationPhase; label: string; detail: string }[] = [
  {
    id: "model",
    label: "Structure model",
    detail: "Map substructure, superstructure, items, and dependencies (ER-style).",
  },
  {
    id: "measure",
    label: "Measurements",
    detail: "Enter dimensions per element; derive quantities from the rate library.",
  },
  {
    id: "boq",
    label: "BOQ & materials",
    detail: "Review abstract, material take-off, and export the estimate.",
  },
  {
    id: "bbs",
    label: "BBS / steel",
    detail: "Map reinforced members to IS-code bar arrangements and steel schedule.",
  },
];

export function phaseFromParam(raw: string | null): EstimationPhase {
  if (raw === "measure" || raw === "boq" || raw === "bbs") return raw;
  return "model";
}
