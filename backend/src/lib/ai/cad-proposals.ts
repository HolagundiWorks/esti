import type { AiCadContext, AiCadProposalPayload, CadAiDraftKind } from "@esti/contracts";

function proposalId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/** Deterministic template proposals when Ollama is offline (ESTICAD reconciliation UX). */
export function buildCadProposalTemplate(
  kind: CadAiDraftKind,
  ctx: {
    drawingRef?: string;
    drawingTitle?: string;
    projectRef?: string;
    measurementCount?: number;
    cad?: AiCadContext;
    userPrompt?: string;
  },
): AiCadProposalPayload {
  const drawing = ctx.drawingRef ? `${ctx.drawingRef} — ${ctx.drawingTitle ?? "Drawing"}` : "active drawing";
  const extra = ctx.userPrompt?.trim() ? ` User note: ${ctx.userPrompt.trim()}` : "";

  switch (kind) {
    case "CAD_DIMENSION_SUGGEST":
      return {
        kind,
        summary: `Dimension suggestions for ${drawing}.${extra}`,
        proposals: [
          {
            id: proposalId("dim", 1),
            label: "Overall length chain",
            detail: "Place aligned dimension along the longest exterior wall axis; use 2.5 mm text height on A-DIMS layer.",
            confidence: 0.72,
          },
          {
            id: proposalId("dim", 2),
            label: "Grid references",
            detail: "Add grid bubble dimensions at column lines A–D; offset 8 mm from building outline.",
            confidence: 0.68,
          },
        ],
      };
    case "CAD_NAMING":
      return {
        kind,
        summary: `Naming conventions for ${drawing}.${extra}`,
        proposals: [
          {
            id: proposalId("name", 1),
            label: "Layer prefix A-WALL",
            detail: "Rename generic WALL layers to A-WALL-230-EXT / A-WALL-115-INT per office CAD standard.",
            confidence: 0.8,
          },
          {
            id: proposalId("name", 2),
            label: "Block refs",
            detail: "Use DOOR-{width} and WIN-{width}x{height} for insert names; avoid numeric-only handles.",
            confidence: 0.75,
          },
        ],
      };
    case "CAD_DOCUMENTATION":
      return {
        kind,
        summary: `Documentation notes for ${drawing}.${extra}`,
        proposals: [
          {
            id: proposalId("note", 1),
            label: "General note — levels",
            detail: "All dimensions are in millimetres unless noted. Floor levels refer to finished floor level (FFL).",
            confidence: 0.9,
          },
          {
            id: proposalId("note", 2),
            label: "Revision tag",
            detail: ctx.cad?.revisionLabel ?
              `Current revision: ${ctx.cad.revisionLabel}. Update title block before issue.`
            : "Add revision cloud on changed geometry before re-issue.",
            confidence: 0.7,
          },
        ],
      };
    case "CAD_QUANTITY_EXTRACT":
      return {
        kind,
        summary: `Quantity extraction hints for ${drawing} (${ctx.measurementCount ?? 0} cloud measurements).${extra}`,
        proposals: [
          {
            id: proposalId("qty", 1),
            label: "Wall linear metres",
            detail: "Sum WALL_* takeoff rows; verify 230 mm vs 115 mm types before BOQ export.",
            confidence: 0.77,
          },
          {
            id: proposalId("qty", 2),
            label: "Slab area",
            detail: "Close polygon on SLAB layer; cross-check against architectural plan area on sheet.",
            confidence: 0.71,
          },
        ],
      };
    case "CAD_LAYER_AUDIT":
      return {
        kind,
        summary: `Layer audit for ${drawing}.${extra}`,
        proposals: (ctx.cad?.layers?.slice(0, 4) ?? [{ name: "0", entityCount: 0 }]).map((layer, i) => ({
          id: proposalId("layer", i + 1),
          label: layer.name,
          detail:
            layer.name === "0" ?
              "Move stray geometry off layer 0 to discipline layers (A-WALL, A-DIMS, A-HATCH)."
            : `${layer.entityCount ?? "?"} entities — confirm colour/linetype matches office template.`,
          confidence: 0.65,
        })),
      };
    case "CAD_REVISION_SUMMARY":
      return {
        kind,
        summary: `Revision summary for ${ctx.projectRef ?? "project"} / ${drawing}.${extra}`,
        proposals: [
          {
            id: proposalId("rev", 1),
            label: "Scope of change",
            detail: ctx.cad?.revisionLabel ?
              `Revision ${ctx.cad.revisionLabel}: document layout, dimension, and annotation updates.`
            : "Capture changed disciplines and affected sheets in CRIF decision register.",
            confidence: 0.7,
          },
        ],
      };
    case "CAD_PLOT_ASSIST":
      return {
        kind,
        summary: `Plot layout for ${drawing}.${extra}`,
        proposals: [
          {
            id: proposalId("plot", 1),
            label: "Sheet size",
            detail: ctx.cad?.plotSheetSize ?
              `Target sheet: ${ctx.cad.plotSheetSize}. Scale viewports to fit title block inner frame.`
            : "Use A1 for general arrangement; A3 details on separate layout tabs.",
            confidence: 0.74,
          },
        ],
      };
    case "CAD_BOQ_DRAFT":
      return {
        kind,
        summary: `BOQ narrative from takeoff for ${ctx.projectRef ?? "project"}.${extra}`,
        proposals: [
          {
            id: proposalId("boq", 1),
            label: "Masonry",
            detail: "Brick masonry 230 mm thick in CM (1:6) — quantity from ESTICAD wall measurements (cloud).",
            confidence: 0.76,
          },
          {
            id: proposalId("boq", 2),
            label: "RCC slab",
            detail: "M25 grade RCC slab — area from slab polygon takeoff; verify thickness in spec sheet.",
            confidence: 0.73,
          },
        ],
      };
    default:
      return { kind, summary: `CAD assistant (${kind})`, proposals: [] };
  }
}

export function serializeCadProposal(payload: AiCadProposalPayload): string {
  return JSON.stringify(payload, null, 2);
}
