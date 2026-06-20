import { z } from "zod";
export const DsrImportRow = z.object({
    code: z.string().min(1).max(40),
    description: z.string().min(1).max(400),
    unit: z.string().min(1).max(20),
    ratePaise: z.number().int().nonnegative(),
});
export const DsrImportCsv = z.object({
    versionId: z.string().uuid(),
    rows: z.array(DsrImportRow).min(1).max(500),
    replace: z.boolean().default(false),
});
/** Parse CSV/TSV text: code, description, unit, rate (₹). Header row optional. */
export function parseDsrCsvText(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0)
        return [];
    let start = 0;
    const header = lines[0].split(/[\t,;]/).map((c) => c.trim().toLowerCase());
    if (header[0] === "code" || header.includes("description"))
        start = 1;
    const rows = [];
    for (const line of lines.slice(start)) {
        const cols = line.split(/[\t,;]/).map((c) => c.trim());
        const [code, description, unit, rateStr] = cols;
        if (!code || !description || !unit)
            continue;
        const rateNum = Number(String(rateStr ?? "0").replace(/[,₹]/g, ""));
        if (!Number.isFinite(rateNum))
            continue;
        rows.push({
            code,
            description,
            unit,
            ratePaise: Math.round(rateNum * 100),
        });
    }
    return rows;
}
