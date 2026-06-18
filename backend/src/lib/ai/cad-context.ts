import type { AiCadContext, AiSourceRef, CadAiDraftKind } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { drawings, measurements, projectOffices } from "../../db/schema.js";
import { buildCadProposalTemplate, serializeCadProposal } from "./cad-proposals.js";
import type { AiContextBundle } from "./templates.js";

type UserCtx = { id: string; role: string };

function formatCadContextBlock(cad?: AiCadContext): string {
  if (!cad) return "No ESTICAD context payload supplied.";
  const parts: string[] = [];
  if (cad.selectionSummary) parts.push(`Selection:\n${cad.selectionSummary}`);
  if (cad.layers?.length) {
    parts.push(
      "Layers:",
      ...cad.layers.slice(0, 40).map((l) => `- ${l.name}${l.entityCount != null ? ` (${l.entityCount})` : ""}`),
    );
  }
  if (cad.blocks?.length) parts.push(`Blocks: ${cad.blocks.slice(0, 30).join(", ")}`);
  if (cad.quantitiesSummary) parts.push(`Quantities:\n${cad.quantitiesSummary}`);
  if (cad.revisionLabel) parts.push(`Revision: ${cad.revisionLabel}`);
  if (cad.plotSheetSize) parts.push(`Plot sheet: ${cad.plotSheetSize}`);
  if (cad.clientVersion) parts.push(`ESTICAD: ${cad.clientVersion}`);
  return parts.join("\n");
}

export async function assembleCadAiContext(
  db: DB,
  user: UserCtx,
  input: {
    kind: CadAiDraftKind;
    projectId?: string;
    drawingId?: string;
    prompt?: string;
    context?: AiCadContext;
  },
): Promise<AiContextBundle & { templateJson: string }> {
  const sources: AiSourceRef[] = [];
  let projectRef: string | undefined;
  let drawingRef: string | undefined;
  let drawingTitle: string | undefined;
  let measurementCount = 0;

  if (input.projectId) {
    const [project] = await db
      .select({ id: projectOffices.id, ref: projectOffices.ref, title: projectOffices.title })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId))
      .limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    projectRef = project.ref;
    sources.push({
      entityType: "PROJECT",
      entityId: project.id,
      label: `${project.ref} — ${project.title}`,
    });
  }

  if (input.drawingId) {
    const [drawing] = await db
      .select({
        id: drawings.id,
        ref: drawings.ref,
        title: drawings.title,
        projectId: drawings.projectId,
      })
      .from(drawings)
      .where(eq(drawings.id, input.drawingId))
      .limit(1);
    if (!drawing) throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found" });
    if (input.projectId && drawing.projectId !== input.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Drawing does not belong to project" });
    }
    drawingRef = drawing.ref;
    drawingTitle = drawing.title;
    sources.push({
      entityType: "DRAWING",
      entityId: drawing.id,
      label: `${drawing.ref} — ${drawing.title}`,
    });

    const [row] = await db
      .select({ n: count() })
      .from(measurements)
      .where(eq(measurements.drawingId, drawing.id));
    measurementCount = Number(row?.n ?? 0);
    if (measurementCount > 0) {
      sources.push({
        entityType: "MEASUREMENT",
        entityId: drawing.id,
        label: `${measurementCount} takeoff measurement(s) on drawing`,
      });
    }
  }

  const template = buildCadProposalTemplate(input.kind, {
    projectRef,
    drawingRef,
    drawingTitle,
    measurementCount,
    cad: input.context,
    userPrompt: input.prompt,
  });
  const templateJson = serializeCadProposal(template);
  const cadBlock = formatCadContextBlock(input.context);

  return {
    systemPrompt:
      "You are ESTI CAD assistant for ESTICAD (architecture CAD). Respond with valid JSON only matching the schema: { kind, summary, proposals: [{ id, label, detail, confidence? }] }. Proposals are suggestions for human reconciliation — never imply automatic drawing mutation.",
    userPrompt: [
      `Draft kind: ${input.kind}`,
      projectRef ? `Project: ${projectRef}` : null,
      drawingRef ? `Drawing: ${drawingRef} — ${drawingTitle}` : null,
      `Cloud measurements on drawing: ${measurementCount}`,
      "",
      "## ESTICAD context",
      cadBlock,
      "",
      "## Reference template (improve but keep JSON shape)",
      templateJson,
      input.prompt?.trim() ? `\n## User prompt\n${input.prompt.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    sources,
    promptSummary: `ESTICAD ${input.kind}${drawingRef ? ` · ${drawingRef}` : ""}`.slice(0, 200),
    templateJson,
  };
}
