import { describe, expect, it } from "vitest";
import { isMachineAuthRoute, originDenial, parseAllowedOrigins } from "./origin.js";

const allowed = parseAllowedOrigins("http://localhost:5173, https://esti.example.com/path");

describe("origin protection", () => {
  it("normalizes configured origins", () => {
    expect([...allowed]).toEqual(["http://localhost:5173", "https://esti.example.com"]);
  });

  it("does not block safe requests", () => {
    expect(originDenial("GET", undefined, allowed)).toBeNull();
    expect(originDenial("OPTIONS", "https://attacker.example", allowed)).toBeNull();
  });

  it("accepts an allowed unsafe request", () => {
    expect(originDenial("POST", "http://localhost:5173", allowed)).toBeNull();
  });

  it("rejects missing, malformed, and foreign origins", () => {
    expect(originDenial("POST", undefined, allowed)).toBe("origin header required");
    expect(originDenial("PATCH", "not-a-url", allowed)).toBe("origin not allowed");
    expect(originDenial("DELETE", "https://attacker.example", allowed)).toBe("origin not allowed");
  });

  it("exempts token-authenticated (Bearer) machine requests with no Origin", () => {
    // Firm node → /platform/v1/* sends no Origin but
    // carry an Authorization header; they must not be 403'd.
    expect(originDenial("POST", undefined, allowed, true)).toBeNull();
    expect(originDenial("POST", "https://attacker.example", allowed, true)).toBeNull();
  });
});

describe("isMachineAuthRoute", () => {
  it("matches the bearer-authenticated machine routes", () => {
    expect(isMachineAuthRoute("/platform/v1/validate")).toBe(true);
    expect(isMachineAuthRoute("/platform/v1/activate?x=1")).toBe(true);
    expect(isMachineAuthRoute("/api/sync/ingest")).toBe(true);
  });

  it("does NOT match cookie-authenticated routes", () => {
    // These are the ones the Origin check defends. A stray Authorization
    // header on any of them must not buy an exemption.
    for (const url of [
      "/trpc/auth.login",
      "/trpc/estimates.importFromMeasurementBook",
      "/upload/drawing",
      "/files/pdf/x.pdf",
      "/platform/auth/register",
      "/platform/trpc/admin.dashboard.usage",
    ]) {
      expect(isMachineAuthRoute(url), url).toBe(false);
    }
  });

  it("is not fooled by a machine path appearing later in the URL", () => {
    expect(isMachineAuthRoute("/trpc/x?next=/platform/v1/validate")).toBe(false);
    expect(isMachineAuthRoute("/evil/platform/v1/validate")).toBe(false);
  });
});
