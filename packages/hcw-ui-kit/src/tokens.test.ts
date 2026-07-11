import { describe, expect, it } from "vitest";
import {
  BUTTON_RADIUS,
  DARK_RECIPES,
  DIALOG_RADIUS,
  ELEVATION,
  HIGH_CONTRAST_RECIPES,
  MOTION,
  RADIUS,
  SCHEMES,
  STATUS_COLORS,
  TYPE_SCALE,
  colors,
  recipesFor,
} from "./tokens.js";

describe("colour schemes", () => {
  it("every scheme carries every semantic role of the light scheme", () => {
    const roles = Object.keys(colors).sort();
    for (const [name, scheme] of Object.entries(SCHEMES)) {
      expect(Object.keys(scheme).sort(), `scheme ${name}`).toEqual(roles);
    }
  });

  it("light scheme IS the base colors object (backward compatibility)", () => {
    expect(SCHEMES.light).toBe(colors);
  });

  it("dark scheme lifts the accent for dark grounds", () => {
    expect(SCHEMES.dark.accent).not.toBe(colors.accent);
    expect(SCHEMES.dark.background).not.toBe(colors.background);
  });
});

describe("recipesFor", () => {
  it("resolves the matching recipe set per scheme and defaults to light", () => {
    expect(recipesFor("dark")).toBe(DARK_RECIPES);
    expect(recipesFor("highContrast")).toBe(HIGH_CONTRAST_RECIPES);
    // Light recipes reference the standalone constants — spot-check identity.
    expect(recipesFor("light").GLASS_SURFACE.background).toContain("rgba(255, 255, 255");
  });

  it("high contrast carries no frosts or soft shadows", () => {
    expect(HIGH_CONTRAST_RECIPES.GLASS_SURFACE.backdropFilter).toBe("none");
    expect(HIGH_CONTRAST_RECIPES.GLASS_SURFACE.boxShadow).toBe("none");
  });

  it("all recipe sets expose the same surface keys", () => {
    const keys = Object.keys(recipesFor("light")).sort();
    expect(Object.keys(DARK_RECIPES).sort()).toEqual(keys);
    expect(Object.keys(HIGH_CONTRAST_RECIPES).sort()).toEqual(keys);
  });
});

describe("shape + scale contracts", () => {
  it("surfaces are square; only buttons/dialogs round", () => {
    expect(RADIUS).toBe(0);
    expect(BUTTON_RADIUS).toBe(4);
    expect(DIALOG_RADIUS).toBe(8);
  });

  it("elevation ladder is ordered flat → glass", () => {
    expect(ELEVATION[0]).toBe("none");
    expect(ELEVATION[1]).not.toBe("none");
    expect(ELEVATION[3]).not.toBe("none");
  });

  it("motion + type scales expose the documented steps", () => {
    expect(MOTION.duration.fast).toBe(130);
    expect(Object.keys(TYPE_SCALE)).toContain("micro");
    expect(STATUS_COLORS.green).toBeTruthy();
  });
});
