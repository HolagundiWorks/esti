import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { emailMatches, normalizeEmail } from "./email.js";

describe("normalizeEmail", () => {
  it("trims surrounding whitespace and lowercases", () => {
    expect(normalizeEmail("  Ravi.Kumar@Firm.IN ")).toBe("ravi.kumar@firm.in");
  });

  it("is idempotent on an already-normalized address", () => {
    expect(normalizeEmail("owner@firm.in")).toBe("owner@firm.in");
  });
});

describe("emailMatches", () => {
  // The matcher must compare on lower(column) against the *normalized* input so
  // that (a) a login typed in any case finds a row stored in any case, and
  // (b) the uniqueness guard on create rejects case-variant duplicates. It must
  // never leak the raw input as a LIKE pattern (no `_`/`%` wildcards).
  const dialect = new PgDialect();

  it("compares lower(column) to the normalized address with no LIKE wildcards", () => {
    const { sql, params } = dialect.sqlToQuery(
      emailMatches({ name: "email" } as never, "  Ravi_Kumar@Firm.IN "),
    );
    expect(sql.toLowerCase()).toContain("lower");
    expect(sql).not.toContain("like");
    expect(sql).not.toContain("%");
    expect(params).toContain("ravi_kumar@firm.in");
  });
});
