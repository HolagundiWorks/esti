export type TokenExportJson = {
    $description: string;
    $extensions: {
        "com.hcw.ui-kit": {
            version: string;
            source: string;
        };
    };
    color: Record<string, Record<string, {
        $type: "color";
        $value: string;
    }>>;
    size: Record<string, {
        $type: "dimension" | "number";
        $value: string | number;
    }>;
    typography: Record<string, {
        $type: "dimension" | "fontFamily";
        $value: string;
    }>;
    motion: Record<string, {
        $type: "duration" | "cubicBezier" | "number";
        $value: string | number | number[];
    }>;
    capacity: Record<string, {
        $type: "number";
        $value: number;
    }>;
    dataViz: Record<string, unknown>;
};
/** Build the Figma Variables / Tokens Studio JSON payload. */
export declare function buildTokensJson(kitVersion?: string): TokenExportJson;
/** CSS custom properties for every scheme (Figma → code parity check). */
export declare function buildTokensCss(): string;
/** One-shot export for build scripts. */
export declare function buildTokenExport(kitVersion?: string): {
    json: TokenExportJson;
    css: string;
};
//# sourceMappingURL=token-export.d.ts.map