import { z } from "zod";
export declare const DsrImportRow: z.ZodObject<{
    code: z.ZodString;
    description: z.ZodString;
    unit: z.ZodString;
    ratePaise: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    code: string;
    description: string;
    unit: string;
    ratePaise: number;
}, {
    code: string;
    description: string;
    unit: string;
    ratePaise: number;
}>;
export type DsrImportRow = z.infer<typeof DsrImportRow>;
export declare const DsrImportCsv: z.ZodObject<{
    versionId: z.ZodString;
    rows: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
        unit: z.ZodString;
        ratePaise: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        code: string;
        description: string;
        unit: string;
        ratePaise: number;
    }, {
        code: string;
        description: string;
        unit: string;
        ratePaise: number;
    }>, "many">;
    replace: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    versionId: string;
    rows: {
        code: string;
        description: string;
        unit: string;
        ratePaise: number;
    }[];
    replace: boolean;
}, {
    versionId: string;
    rows: {
        code: string;
        description: string;
        unit: string;
        ratePaise: number;
    }[];
    replace?: boolean | undefined;
}>;
export type DsrImportCsv = z.infer<typeof DsrImportCsv>;
/** Parse CSV/TSV text: code, description, unit, rate (₹). Header row optional. */
export declare function parseDsrCsvText(text: string): DsrImportRow[];
//# sourceMappingURL=dsr-import.d.ts.map