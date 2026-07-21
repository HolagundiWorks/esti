import { describe, expect, it } from "vitest";
import {
  aggregateUsageReports,
  usagePeriodStart,
  type UsageReportRow,
} from "./usageReports.js";

describe("usagePeriodStart", () => {
  it("returns the UTC month's first day", () => {
    expect(usagePeriodStart(new Date("2026-07-21T15:00:00Z"))).toBe("2026-07-01");
    expect(usagePeriodStart(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("aggregateUsageReports", () => {
  const rows: UsageReportRow[] = [
    {
      orgId: "org-a",
      orgName: "Alpha",
      productCode: "AORMS",
      periodStart: "2026-07-01",
      storageUsedBytes: 1_000,
      storageQuotaBytes: 5_000,
      storagePurchasedBytes: 0,
      aiTokensThisMonth: 10,
      reportedAt: "2026-07-21T10:00:00Z",
    },
    {
      orgId: "org-b",
      orgName: "Beta",
      productCode: "AORMS",
      periodStart: "2026-07-01",
      storageUsedBytes: 2_500,
      storageQuotaBytes: 5_000,
      storagePurchasedBytes: 1_000,
      aiTokensThisMonth: 5,
      reportedAt: "2026-07-20T10:00:00Z",
    },
    {
      orgId: "org-a",
      orgName: "Alpha",
      productCode: "LXOS",
      periodStart: "2026-07-01",
      storageUsedBytes: 200,
      storageQuotaBytes: 1_000,
      storagePurchasedBytes: 0,
      aiTokensThisMonth: 3,
      reportedAt: "2026-07-22T10:00:00Z",
    },
  ];

  it("sums across orgs and collapses multi-product orgs", () => {
    const agg = aggregateUsageReports(rows);
    expect(agg.reportedOrgCount).toBe(2);
    expect(agg.storageUsedBytes).toBe(3_700);
    expect(agg.storageQuotaBytes).toBe(11_000);
    expect(agg.storagePurchasedBytes).toBe(1_000);
    expect(agg.aiTokensThisMonth).toBe(18);
    expect(agg.reports[0]!.orgId).toBe("org-b"); // highest storage first
    const alpha = agg.reports.find((r) => r.orgId === "org-a")!;
    expect(alpha.storageUsedBytes).toBe(1_200);
    expect(alpha.aiTokensThisMonth).toBe(13);
  });

  it("returns zeros for an empty set", () => {
    expect(aggregateUsageReports([])).toEqual({
      storageUsedBytes: 0,
      storageQuotaBytes: 0,
      storagePurchasedBytes: 0,
      aiTokensThisMonth: 0,
      reportedOrgCount: 0,
      reports: [],
    });
  });
});
