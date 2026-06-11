import { describe, expect, it } from "vitest";
import { originDenial, parseAllowedOrigins } from "./origin.js";

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
});
