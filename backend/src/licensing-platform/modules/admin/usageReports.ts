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
