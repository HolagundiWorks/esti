import { asc, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { submissionMessages } from "../db/schema.js";

type ThreadRef =
  | { portalSubmissionId: string }
  | { consultantSubmissionId: string };

/** List the message thread for a portal or consultant submission, oldest first. */
export async function listMessages(db: DB, ref: ThreadRef) {
  const where =
    "portalSubmissionId" in ref
      ? eq(submissionMessages.portalSubmissionId, ref.portalSubmissionId)
      : eq(submissionMessages.consultantSubmissionId, ref.consultantSubmissionId);
  return db
    .select({
      id: submissionMessages.id,
      authorName: submissionMessages.authorName,
      authorSide: submissionMessages.authorSide,
      body: submissionMessages.body,
      createdAt: submissionMessages.createdAt,
    })
    .from(submissionMessages)
    .where(where)
    .orderBy(asc(submissionMessages.createdAt));
}

/** Append a message to a submission thread. */
export async function addMessage(
  db: DB,
  ref: ThreadRef,
  author: { id: string; name: string; side: "FIRM" | "CLIENT" | "CONSULTANT" },
  body: string,
): Promise<void> {
  await db.insert(submissionMessages).values({
    portalSubmissionId: "portalSubmissionId" in ref ? ref.portalSubmissionId : null,
    consultantSubmissionId: "consultantSubmissionId" in ref ? ref.consultantSubmissionId : null,
    authorId: author.id,
    authorName: author.name,
    authorSide: author.side,
    body,
  });
}
