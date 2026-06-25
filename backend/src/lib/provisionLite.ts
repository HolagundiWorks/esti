import { DEFAULT_PHASE_PLAN } from "@esti/contracts";
import type { DB } from "../db/index.js";
import {
  clients,
  consultants,
  contractors,
  phases,
  projectOffices,
} from "../db/schema.js";
import { nextRef } from "./numbering.js";

/**
 * Seed the AORMS-Lite workspace: 5 clients (inactive), 5 contractors,
 * 5 consultants, and 5 empty projects. The admin activates/renames these rows
 * but cannot add more. Staff logins are NOT pre-seeded — the Lite admin creates
 * its own staff (up to the 3-seat cap) directly from the Users page. Run inside
 * the bootstrap transaction, after the OWNER is created.
 */
export async function provisionLiteWorkspace(db: DB, ownerId: string): Promise<void> {
  // 5 client records — disabled until the admin fills in real details.
  await db.insert(clients).values(
    [1, 2, 3, 4, 5].map((n) => ({
      name: `Client ${n}`,
      disabled: true,
    })),
  );

  // 5 contractor records.
  await db.insert(contractors).values(
    [1, 2, 3, 4, 5].map((n) => ({
      name: `Contractor ${n}`,
      category: "General",
    })),
  );

  // 5 consultant records — no portal login; mapped to projects via engagements.
  await db.insert(consultants).values(
    [1, 2, 3, 4, 5].map((n) => ({
      name: `Consultant ${n}`,
      discipline: "OTHER",
    })),
  );

  // 5 empty projects in the ENQUIRY (new/empty) state, each with the default
  // phase plan so the workspace is immediately navigable.
  for (let n = 1; n <= 5; n++) {
    const { ref } = await nextRef(db, "projectoffice", "PRJ");
    const [p] = await db
      .insert(projectOffices)
      .values({
        ref,
        title: `Project ${n}`,
        projectType: "Residential Architecture",
        workType: "ARCHITECTURE",
        jurisdiction: "OTHER",
        contractValuePaise: 0,
        createdById: ownerId,
      })
      .returning({ id: projectOffices.id });
    await db.insert(phases).values(
      DEFAULT_PHASE_PLAN.map((s, i) => ({
        projectId: p!.id,
        code: s.code,
        label: s.label,
        billingPct: s.billingPct,
        sortOrder: (i + 1) * 10,
      })),
    );
  }
}
