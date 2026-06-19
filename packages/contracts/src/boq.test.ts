import { describe, expect, it } from "vitest";
import { parseDsrCsvText } from "./boq.js";

describe("parseDsrCsvText", () => {
  it("parses header and data rows with rates in rupees", () => {
    const text = `code,description,unit,rate
BM-230,Brick masonry,cum,8500
EXC-SITE,Excavation,cum,480`;
    const rows = parseDsrCsvText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      code: "BM-230",
      description: "Brick masonry",
      unit: "cum",
      ratePaise: 850_000,
    });
  });

  it("skips invalid lines", () => {
    expect(parseDsrCsvText("BM-230,Only two cols")).toHaveLength(0);
  });
});
