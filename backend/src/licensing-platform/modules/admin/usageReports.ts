/**
 * P7 — pure helpers for platform usage reports (no DB).
 * Product nodes upsert monthly snapshots; the admin dashboard aggregates them.
 */
export type UsageReportRow = {
  orgId: string;
  orgName: string;
  productCode: string;
  periodStart: string; // YYYY-MM-DD
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePurchasedBytes: number;
  aiTokensThisMonth: number;
  reportedAt: Date | string;
};

/** UTC calendar month start as YYYY-MM-01. */
export function usagePeriodStart(asOf: Date = new Date()): string {
  const y = asOf.getUTCFullYear();
  const m = String(asOf.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Sum storage + AI tokens across org reports for one period.
 * One row per (org, product); orgs with multiple products are summed.
 */
export function aggregateUsageReports(rows: readonly UsageReportRow[]): {
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePurchasedBytes: number;
  aiTokensThisMonth: number;
  reportedOrgCount: number;
  reports: UsageReportRow[];
} {
  const byOrg = new Map<string, UsageReportRow>();
  for (const r of rows) {
    const prev = byOrg.get(r.orgId);
    if (!prev) {
      byOrg.set(r.orgId, { ...r });
      continue;
    }
    byOrg.set(r.orgId, {
      ...prev,
      storageUsedBytes: prev.storageUsedBytes + r.storageUsedBytes,
      storageQuotaBytes: prev.storageQuotaBytes + r.storageQuotaBytes,
      storagePurchasedBytes: prev.storagePurchasedBytes + r.storagePurchasedBytes,
      aiTokensThisMonth: prev.aiTokensThisMonth + r.aiTokensThisMonth,
      reportedAt:
        new Date(r.reportedAt).getTime() > new Date(prev.reportedAt).getTime()
          ? r.reportedAt
          : prev.reportedAt,
    });
  }
  const reports = [...byOrg.values()].sort((a, b) => b.storageUsedBytes - a.storageUsedBytes);
  return {
    storageUsedBytes: reports.reduce((a, r) => a + r.storageUsedBytes, 0),
    storageQuotaBytes: reports.reduce((a, r) => a + r.storageQuotaBytes, 0),
    storagePurchasedBytes: reports.reduce((a, r) => a + r.storagePurchasedBytes, 0),
    aiTokensThisMonth: reports.reduce((a, r) => a + r.aiTokensThisMonth, 0),
    reportedOrgCount: reports.length,
    reports,
  };
}

/** CSV escape for India manual invoice export. */
export function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function usageReportsToCsv(
  rows: ReadonlyArray<{
    periodStart: string;
    orgName: string;
    productCode: string;
    storageUsedBytes: number;
    storageQuotaBytes: number;
    storagePurchasedBytes: number;
    aiTokensThisMonth: number;
    reportedAt: Date | string | null;
    billedAt: Date | string | null;
    billedBy: string | null;
    billingNote: string | null;
  }>,
): string {
  const header = [
    "period_start",
    "org_name",
    "product_code",
    "storage_used_bytes",
    "storage_quota_bytes",
    "storage_purchased_bytes",
    "ai_tokens_this_month",
    "reported_at",
    "billed_at",
    "billed_by",
    "billing_note",
  ].join(",");
  const lines = rows.map((r) =>
    [
      csvEscape(r.periodStart),
      csvEscape(r.orgName),
      csvEscape(r.productCode),
      csvEscape(r.storageUsedBytes),
      csvEscape(r.storageQuotaBytes),
      csvEscape(r.storagePurchasedBytes),
      csvEscape(r.aiTokensThisMonth),
      csvEscape(r.reportedAt ? new Date(r.reportedAt).toISOString() : ""),
      csvEscape(r.billedAt ? new Date(r.billedAt).toISOString() : ""),
      csvEscape(r.billedBy),
      csvEscape(r.billingNote),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
