/**
 * LXOS Academy — SOP-as-curriculum (theory) + real-usage-as-practical, per
 * docs/holagundi/SOP.md. One row per (user, SOP code); a module counts as
 * complete once both `theoryReadAt` and `practicalAt` are set. The curriculum
 * itself (parts, titles, theory/practical text, AUTO vs SELF signal) lives in
 * `@esti/contracts` (`ACADEMY_CURRICULUM`) — this table only tracks progress.
 */
import { users } from "./org-auth.js";
import { createdAt, id, pgTable, text, timestamp, uniqueIndex, updatedAt, uuid } from "./_helpers.js";

export const sopProgress = pgTable(
  "esti_sop_progress",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sopCode: text("sop_code").notNull(),
    theoryReadAt: timestamp("theory_read_at", { withTimezone: true }),
    /** AUTO — detected from a real audit-logged action; SELF — self-attested. */
    practicalSource: text("practical_source"),
    practicalAt: timestamp("practical_at", { withTimezone: true }),
    practicalNote: text("practical_note"),
    /** Set once both theory and practical are present; drives the growth-event push. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ userSopIdx: uniqueIndex("esti_sop_progress_user_sop_idx").on(t.userId, t.sopCode) }),
);
