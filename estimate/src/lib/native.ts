/**
 * Bridge to the native C++ host. When the SPA runs inside the AORMS Estimate
 * desktop app, the webview host binds these functions onto `window.*` — calling
 * them runs the C++ engine + SQLite in-process (no server, no network). In a
 * plain browser (dev) the bindings are absent and `isNative()` is false, so the
 * app falls back to its offline export-only flow.
 */
import type { EstimateModel } from "../core/model.js";

/** Row shape returned by the native `esti_list` summary. */
export interface SavedSummary {
  id: string;
  name: string;
  projectName?: string;
  grandTotalPaise: number;
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}

/** Full saved record (model + freshly-computed costed views). */
export interface SavedEstimate extends SavedSummary {
  model: EstimateModel;
  costed: unknown;
}

// The functions the C++ host binds. Each resolves to parsed JSON.
type NativeBinding = (...args: unknown[]) => Promise<unknown>;
interface NativeWindow {
  esti_list?: NativeBinding;
  esti_create?: NativeBinding;
  esti_get?: NativeBinding;
  esti_update?: NativeBinding;
  esti_delete?: NativeBinding;
  esti_file?: NativeBinding;
}

function w(): NativeWindow {
  return window as unknown as NativeWindow;
}

/** True when running inside the native desktop host (bindings present). */
export function isNative(): boolean {
  return typeof w().esti_list === "function";
}

// The host resolves with the raw JSON value; an error surfaces as `{error}`.
async function unwrap<T>(p: Promise<unknown> | undefined): Promise<T> {
  if (!p) throw new Error("native bridge unavailable");
  const r = (await p) as { error?: string };
  if (r && typeof r === "object" && "error" in r && r.error) throw new Error(String(r.error));
  return r as T;
}

export const native = {
  async list(): Promise<SavedSummary[]> {
    const r = await unwrap<{ estimates: SavedSummary[] }>(w().esti_list?.());
    return r.estimates;
  },
  create(model: EstimateModel): Promise<SavedEstimate> {
    return unwrap<SavedEstimate>(w().esti_create?.(model));
  },
  get(id: string): Promise<SavedEstimate> {
    return unwrap<SavedEstimate>(w().esti_get?.(id));
  },
  update(id: string, model: EstimateModel): Promise<SavedEstimate> {
    return unwrap<SavedEstimate>(w().esti_update?.(id, model));
  },
  remove(id: string): Promise<{ deleted: boolean }> {
    return unwrap<{ deleted: boolean }>(w().esti_delete?.(id));
  },
  file(id: string): Promise<Record<string, unknown>> {
    return unwrap<Record<string, unknown>>(w().esti_file?.(id));
  },
};
