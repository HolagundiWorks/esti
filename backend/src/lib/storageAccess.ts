import { sql } from "drizzle-orm";
import type { AuthUser } from "../auth/session.js";
import type { DB } from "../db/index.js";

const PORTAL_ROLES = new Set<AuthUser["role"]>(["CLIENT", "CONSULTANT", "CONTRACTOR"]);

/** Reject path traversal and odd keys before hitting storage. */
export function isSafeStorageKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.startsWith("/")) return false;
  return /^[\w./-]+$/.test(key);
}

type ExistsRow = { exists: boolean };

/** Staff / firm-wide: key must be referenced in the install database. */
async function firmReferencesKey(db: DB, key: string): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM esti_firm WHERE logo_key = ${key}
      UNION ALL SELECT 1 FROM esti_user WHERE photo_key = ${key}
      UNION ALL SELECT 1 FROM esti_drawing WHERE storage_key = ${key} OR svg_key = ${key} OR issue_pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_invoice WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_proposal WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_letter WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_inspection WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_specsheet WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_transmittal WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_mom WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_document_issue WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_feasibility_report WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_client_onboarding WHERE agreement_doc_key = ${key} OR id_doc_key = ${key}
      UNION ALL SELECT 1 FROM esti_expense WHERE receipt_key = ${key}
      UNION ALL SELECT 1 FROM esti_inspection_photo WHERE storage_key = ${key}
      UNION ALL SELECT 1 FROM esti_reconcile WHERE storage_key = ${key}
      UNION ALL SELECT 1 FROM esti_compliance_doc WHERE file_key = ${key}
      UNION ALL SELECT 1 FROM esti_master_plan WHERE file_key = ${key}
      UNION ALL SELECT 1 FROM esti_standard_file WHERE file_key = ${key}
      UNION ALL SELECT 1 FROM esti_repo_source WHERE file_key = ${key}
      UNION ALL SELECT 1 FROM esti_hr_document WHERE s3_key = ${key}
      UNION ALL SELECT 1 FROM esti_payslip WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_progress_report WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_site_instruction WHERE pdf_key = ${key}
      UNION ALL SELECT 1 FROM esti_cost_report WHERE pdf_key = ${key}
    ) AS exists
  `)) as unknown as ExistsRow[];
  return rows[0]?.exists === true;
}

/** Client portal — keys on projects owned by this client. */
async function clientReferencesKey(db: DB, clientId: string, key: string): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM esti_invoice i
      INNER JOIN esti_projectoffice p ON p.id = i.project_id
      WHERE p.client_id = ${clientId}::uuid AND i.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_drawing d
      INNER JOIN esti_projectoffice p ON p.id = d.project_id
      WHERE p.client_id = ${clientId}::uuid
        AND (d.storage_key = ${key} OR d.svg_key = ${key} OR d.issue_pdf_key = ${key})
      UNION ALL
      SELECT 1 FROM esti_transmittal t
      INNER JOIN esti_projectoffice p ON p.id = t.project_id
      WHERE p.client_id = ${clientId}::uuid AND t.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_mom m
      INNER JOIN esti_projectoffice p ON p.id = m.project_id
      WHERE p.client_id = ${clientId}::uuid AND m.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_proposal pr
      INNER JOIN esti_projectoffice p ON p.id = pr.project_id
      WHERE p.client_id = ${clientId}::uuid AND pr.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_inspection ins
      INNER JOIN esti_projectoffice p ON p.id = ins.project_id
      WHERE p.client_id = ${clientId}::uuid AND ins.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_inspection_photo ph
      INNER JOIN esti_inspection ins ON ins.id = ph.inspection_id
      INNER JOIN esti_projectoffice p ON p.id = ins.project_id
      WHERE p.client_id = ${clientId}::uuid AND ph.storage_key = ${key}
    ) AS exists
  `)) as unknown as ExistsRow[];
  return rows[0]?.exists === true;
}

/** Consultant portal — keys on engaged projects. */
async function consultantReferencesKey(db: DB, consultantId: string, key: string): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM esti_drawing d
      INNER JOIN esti_engagement e ON e.project_id = d.project_id
      WHERE e.consultant_id = ${consultantId}::uuid
        AND (d.storage_key = ${key} OR d.svg_key = ${key} OR d.issue_pdf_key = ${key})
      UNION ALL
      SELECT 1 FROM esti_transmittal t
      INNER JOIN esti_engagement e ON e.project_id = t.project_id
      WHERE e.consultant_id = ${consultantId}::uuid AND t.pdf_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_mom m
      INNER JOIN esti_engagement e ON e.project_id = m.project_id
      WHERE e.consultant_id = ${consultantId}::uuid AND m.pdf_key = ${key}
    ) AS exists
  `)) as unknown as ExistsRow[];
  return rows[0]?.exists === true;
}

/** Contractor portal — keys on site visits assigned to this contractor. */
async function contractorReferencesKey(db: DB, contractorId: string, key: string): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM esti_inspection_photo ph
      INNER JOIN esti_inspection ins ON ins.id = ph.inspection_id
      INNER JOIN esti_site_visit sv ON sv.project_id = ins.project_id
      WHERE sv.contractor_id = ${contractorId}::uuid AND ph.storage_key = ${key}
      UNION ALL
      SELECT 1 FROM esti_inspection ins
      INNER JOIN esti_site_visit sv ON sv.project_id = ins.project_id
      WHERE sv.contractor_id = ${contractorId}::uuid AND ins.pdf_key = ${key}
    ) AS exists
  `)) as unknown as ExistsRow[];
  return rows[0]?.exists === true;
}

/** Whether the authenticated user may read an object at `key` via GET /files/*. */
export async function canAccessStorageKey(db: DB, user: AuthUser, key: string): Promise<boolean> {
  if (!isSafeStorageKey(key)) return false;
  if (user.photoKey === key) return true;

  if (user.role === "CLIENT" && user.clientId) {
    return clientReferencesKey(db, user.clientId, key);
  }
  if (user.role === "CONSULTANT" && user.consultantId) {
    return consultantReferencesKey(db, user.consultantId, key);
  }
  if (user.role === "CONTRACTOR" && user.contractorId) {
    return contractorReferencesKey(db, user.contractorId, key);
  }
  if (PORTAL_ROLES.has(user.role)) return false;

  return firmReferencesKey(db, key);
}
