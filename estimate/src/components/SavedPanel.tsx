/**
 * Saved estimates — the native persistence panel. Renders only inside the C++
 * desktop host (where `isNative()` is true and the SQLite-backed bindings exist);
 * in a plain browser it renders nothing and the app stays export-only.
 */
import { Add, Save, TrashCan, DocumentBlank } from "@carbon/icons-react";
import { Button, InlineNotification, Stack, Tag, Tile } from "@carbon/react";
import { useCallback, useEffect, useState } from "react";
import { inr } from "../lib/download.js";
import { isNative, native, type SavedSummary } from "../lib/native.js";
import { useStore } from "../store.js";

export function SavedPanel() {
  const model = useStore((s) => s.model);
  const setModel = useStore((s) => s.setModel);
  const reset = useStore((s) => s.reset);

  const [rows, setRows] = useState<SavedSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await native.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "list failed");
    }
  }, []);

  useEffect(() => {
    if (isNative()) void refresh();
  }, [refresh]);

  if (!isNative()) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(false);
    }
  };

  const onSave = () =>
    run(async () => {
      const saved = currentId
        ? await native.update(currentId, model)
        : await native.create(model);
      setCurrentId(saved.id);
      await refresh();
    });

  const onOpen = (id: string) =>
    run(async () => {
      const rec = await native.get(id);
      setModel(rec.model);
      setCurrentId(id);
    });

  const onDelete = (id: string) =>
    run(async () => {
      await native.remove(id);
      if (id === currentId) setCurrentId(null);
      await refresh();
    });

  const onNew = () => {
    reset();
    setCurrentId(null);
  };

  return (
    <Tile className="est-saved">
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
          <strong>Saved estimates</strong>
          <Tag type="green" size="sm">on this machine</Tag>
          <Button size="sm" kind="primary" renderIcon={Save} disabled={busy} onClick={onSave}>
            {currentId ? "Save" : "Save new"}
          </Button>
          <Button size="sm" kind="tertiary" renderIcon={Add} disabled={busy} onClick={onNew}>
            New
          </Button>
        </Stack>

        {error && (
          <InlineNotification kind="error" lowContrast title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} />
        )}

        {rows.length === 0 ? (
          <p className="est-help">No saved estimates yet — enter items and press Save.</p>
        ) : (
          <Stack gap={2}>
            {rows.map((r) => (
              <div key={r.id} className="est-row-between">
                <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
                  <DocumentBlank size={16} aria-hidden />
                  <span>{r.name || "(untitled)"}</span>
                  {r.id === currentId && <Tag type="blue" size="sm">open</Tag>}
                  <Tag type="cool-gray" size="sm">{inr(r.grandTotalPaise)}</Tag>
                </Stack>
                <Stack orientation="horizontal" gap={2}>
                  <Button size="sm" kind="ghost" disabled={busy} onClick={() => onOpen(r.id)}>
                    Open
                  </Button>
                  <Button size="sm" kind="danger--ghost" hasIconOnly iconDescription="Delete" renderIcon={TrashCan} disabled={busy} onClick={() => onDelete(r.id)} />
                </Stack>
              </div>
            ))}
          </Stack>
        )}
      </Stack>
    </Tile>
  );
}
