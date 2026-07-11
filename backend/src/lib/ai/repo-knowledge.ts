import { asc, eq } from "drizzle-orm";
import type { AiSourceRef } from "@esti/contracts";
import type { DB } from "../../db/index.js";
import { repoSections, repoSources } from "../../db/schema.js";

const REPO_KNOWLEDGE_CHAR_CAP = 24_000;

/** Published Knowledge Bank portal library — injected into ESTI agent context. */
export async function loadPublishedRepoKnowledge(
  db: DB,
): Promise<{ block: string; sources: AiSourceRef[] }> {
  const sources = await db
    .select()
    .from(repoSources)
    .where(eq(repoSources.status, "PUBLISHED"))
    .orderBy(asc(repoSources.title));

  if (!sources.length) {
    return { block: "", sources: [] };
  }

  const refs: AiSourceRef[] = [];
  const parts: string[] = [];
  let used = 0;

  for (const src of sources) {
    const sections = await db
      .select()
      .from(repoSections)
      .where(eq(repoSections.sourceId, src.id))
      .orderBy(asc(repoSections.seq));

    const header = `### ${src.title}${src.author ? ` — ${src.author}` : ""}${src.category ? ` (${src.category})` : ""}`;
    let body = src.executiveSummary ? `${header}\n${src.executiveSummary}\n` : `${header}\n`;

    for (const sec of sections) {
      const chunk = `\n#### ${sec.title}\n**Summary:** ${sec.summary}\n${sec.rephrased}\n`;
      if (used + body.length + chunk.length > REPO_KNOWLEDGE_CHAR_CAP) break;
      body += chunk;
    }

    if (used + body.length > REPO_KNOWLEDGE_CHAR_CAP) break;
    parts.push(body);
    used += body.length;
    refs.push({
      entityType: "REPO_SOURCE",
      entityId: src.id,
      label: src.title,
      excerpt: src.executiveSummary?.slice(0, 200) ?? undefined,
    });
  }

  const block = parts.length
    ? `## Validated reference library (Knowledge Bank portal — EmOI-processed textbooks)\n${parts.join("\n")}`
    : "";

  return { block, sources: refs };
}
