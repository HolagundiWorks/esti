import { describe, expect, it } from "vitest";
import { looksLikeDwg, looksLikeDxf } from "./filetype.js";

const ASCII_DXF = Buffer.from(
  "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nEOF\n",
  "utf8",
);

describe("looksLikeDxf", () => {
  it("accepts minimal ASCII DXF", () => {
    expect(looksLikeDxf(ASCII_DXF)).toBe(true);
  });

  it("accepts ASCII DXF with leading comment groups", () => {
    const withComment = Buffer.from(
      "999\nDXF written by test\n  0\nSECTION\n  2\nHEADER\n  0\nEOF\n",
      "utf8",
    );
    expect(looksLikeDxf(withComment)).toBe(true);
  });

  it("accepts binary DXF sentinel", () => {
    const bin = Buffer.from("AutoCAD Binary DXF\r\n\x1a\x00", "latin1");
    expect(looksLikeDxf(bin)).toBe(true);
  });

  it("rejects empty and random buffers", () => {
    expect(looksLikeDxf(Buffer.alloc(0))).toBe(false);
    expect(looksLikeDxf(Buffer.from("hello world"))).toBe(false);
  });
});

describe("looksLikeDwg", () => {
  it("detects AC10xx DWG magic", () => {
    expect(looksLikeDwg(Buffer.from("AC1032", "ascii"))).toBe(true);
  });

  it("does not flag ASCII DXF as DWG", () => {
    expect(looksLikeDwg(ASCII_DXF)).toBe(false);
  });
});
