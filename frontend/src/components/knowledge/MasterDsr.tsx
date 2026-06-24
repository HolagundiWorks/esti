import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { formatINR, parseDsrCsvText, parseRupeeInput, type DsrImportRow } from "@esti/contracts";
import { useEffect, useState } from "react";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const DEMO_CSV_URL = "/dsr-import-demo.csv";

const emptyVForm = () => ({
  label: "",
  description: "",
  copyFromVersionId: "",
  csvText: "",
});

export function MasterDsr({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const versionsQ = trpc.dsr.listVersions.useQuery();
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!versionId && versionsQ.data && versionsQ.data.length > 0)
      setVersionId(versionsQ.data[0]!.id);
  }, [versionsQ.data, versionId]);

  const itemsQ = trpc.dsr.listItems.useQuery(
    { versionId },
    { enabled: !!versionId },
  );

  // Spec → rate-book finder: type a trade/material (e.g. "brick") to see the
  // related rate-book items (code, description, unit, rate) you can map to.
  const [itemSearch, setItemSearch] = useState("");
  const itemRows = itemsQ.data ?? [];
  const itemFilter = itemSearch.trim().toLowerCase();
  const filteredItems = itemFilter
    ? itemRows.filter(
        (it) =>
          it.code.toLowerCase().includes(itemFilter) ||
          it.description.toLowerCase().includes(itemFilter),
      )
    : itemRows;

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState(emptyVForm);
  const [vError, setVError] = useState<string | null>(null);
  const [vBusy, setVBusy] = useState(false);

  const createVersion = trpc.dsr.createVersion.useMutation();
  const setActive = trpc.dsr.setActiveVersion.useMutation({
    onSuccess: () => utils.dsr.listVersions.invalidate(),
  });
  const publishVersion = trpc.dsr.publishVersion.useMutation({
    onSuccess: () => utils.dsr.listVersions.invalidate(),
  });
  const importCsv = trpc.dsr.importCsv.useMutation({
    onSuccess: () => utils.dsr.listItems.invalidate({ versionId }),
  });

  async function submitNewVersion(status: "DRAFT" | "PUBLISHED") {
    setVError(null);
    let importRows: DsrImportRow[] | undefined;
    if (vForm.csvText.trim()) {
      importRows = parseDsrCsvText(vForm.csvText);
      if (importRows.length === 0) {
        setVError("No valid rows in CSV. Use code, description, unit, rate (₹) columns.");
        return;
      }
    }
    setVBusy(true);
    try {
      const row = await createVersion.mutateAsync({
        label: vForm.label,
        description: vForm.description || undefined,
        copyFromVersionId: vForm.copyFromVersionId || undefined,
        status,
        importRows,
      });
      utils.dsr.listVersions.invalidate();
      setVersionId(row.id);
      setVOpen(false);
      setVForm(emptyVForm());
    } catch (e) {
      setVError(e instanceof Error ? e.message : "Could not create version");
    } finally {
      setVBusy(false);
    }
  }

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState({
    code: "",
    description: "",
    unit: "",
    rate: "",
  });
  const createItem = trpc.dsr.createItem.useMutation({
    onSuccess: () => {
      utils.dsr.listItems.invalidate({ versionId });
      setIOpen(false);
      setIForm({ code: "", description: "", unit: "", rate: "" });
    },
  });
  const removeItem = trpc.dsr.removeItem.useMutation({
    onSuccess: () => utils.dsr.listItems.invalidate({ versionId }),
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importReplace, setImportReplace] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  async function readCsvFile(file: File | null) {
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    setImportText(text);
  }

  async function submitImport() {
    setImportError(null);
    const rows = parseDsrCsvText(importText);
    if (rows.length === 0) {
      setImportError("No valid rows. Expected: code, description, unit, rate (₹).");
      return;
    }
    try {
      await importCsv.mutateAsync({ versionId, rows, replace: importReplace });
      setImportOpen(false);
      setImportText("");
      setImportReplace(false);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    }
  }

  const activeVersion = versionsQ.data?.find((v) => v.id === versionId);
  const isDraft = activeVersion?.status === "DRAFT";
  const isReadOnly =
    activeVersion?.readOnly === true || activeVersion?.origin === "HCW_OFFICIAL";

  const exportCsvQ = trpc.dsr.exportCsv.useQuery(
    { versionId },
    { enabled: false },
  );

  async function downloadExportCsv() {
    if (!versionId || isReadOnly) return;
    const result = await exportCsvQ.refetch();
    if (!result.data) return;
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={4}>
        <Stack gap={2} className="esti-grow">
          {embedded ? <h2>Rate Books</h2> : <h1>Rate Books</h1>}
          <p>
            Versioned rate books (schedules of rates) used by estimates and purchase
            orders. Official HCW seeds are read-only; create a custom rate book to edit or import/export CSV.
          </p>
        </Stack>
        <Button onClick={() => { setVOpen(true); setVError(null); }}>New rate book</Button>
      </Stack>

      <Stack orientation="horizontal" gap={4}>
        <Select
          id="dsr-ver"
          labelText="Rate book"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
        >
          <SelectItem value="" text="Select…" />
          {(versionsQ.data ?? []).map((v) => (
            <SelectItem
              key={v.id}
              value={v.id}
              text={`${v.label}${v.active ? " (active)" : ""}${v.status === "DRAFT" ? " (draft)" : ""}${v.origin === "HCW_OFFICIAL" ? " (HCW)" : ""}`}
            />
          ))}
        </Select>
        {activeVersion && isReadOnly && (
          <Tag type="purple">HCW read-only</Tag>
        )}
        {activeVersion && isDraft && (
          <Tag type="gray">Draft</Tag>
        )}
        {activeVersion && isDraft && (
          <Button
            kind="tertiary"
            disabled={publishVersion.isPending}
            onClick={() => publishVersion.mutate({ id: versionId })}
          >
            {publishVersion.isPending ? "Publishing…" : "Publish"}
          </Button>
        )}
        {activeVersion && !activeVersion.active && !isDraft && (
          <Button
            kind="tertiary"
            onClick={() => setActive.mutate({ id: versionId })}
          >
            Set active
          </Button>
        )}
        <Button disabled={!versionId || isReadOnly} onClick={() => setIOpen(true)}>
          Add item
        </Button>
        <Button
          kind="tertiary"
          disabled={!versionId || isReadOnly}
          onClick={() => {
            setImportOpen(true);
            setImportError(null);
            setImportText("");
            setImportReplace(false);
          }}
        >
          Import CSV
        </Button>
        <Button
          kind="tertiary"
          disabled={!versionId || isReadOnly}
          onClick={() => void downloadExportCsv()}
        >
          Export CSV
        </Button>
      </Stack>

      {versionId && (itemsQ.data ?? []).length > 0 && (
        <TextInput
          id="dsr-item-search"
          labelText="Find a specification (e.g. brickwork, RCC, plaster)"
          placeholder="Type a trade or material to see the related rate-book items"
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
        />
      )}

      <DataState
        loading={!!versionId && itemsQ.isLoading}
        isEmpty={!versionId || (itemsQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: versionId
            ? "No rate items in this rate book"
            : "Select or create a rate book",
          description: versionId
            ? "Add schedule-of-rates items, copy from an existing version, or import a CSV."
            : undefined,
          action: versionId ? (
            <Stack orientation="horizontal" gap={3}>
              <Button size="sm" onClick={() => setIOpen(true)}>
                Add item
              </Button>
              <Button size="sm" kind="tertiary" onClick={() => setImportOpen(true)}>
                Import CSV
              </Button>
            </Stack>
          ) : undefined,
        }}
      >
        <TableContainer
          title={itemFilter ? `Related rate items (${filteredItems.length})` : "Rate items"}
          description={activeVersion?.description ?? ""}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {itemFilter && filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No rate items match “{itemSearch.trim()}”.</TableCell>
                </TableRow>
              )}
              {filteredItems.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.code}</TableCell>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell>{formatINR(it.ratePaise)}</TableCell>
                  <TableCell>
                    {!isReadOnly && !it.fromKit && (
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        onClick={() => setConfirmId(it.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove rate item?"
        body="This removes the item from this rate book."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmId) removeItem.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={vOpen}
        modalHeading="New rate book"
        primaryButtonText={vBusy ? "Publishing…" : "Publish"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!vForm.label || vBusy}
        onRequestClose={() => setVOpen(false)}
        onRequestSubmit={() => submitNewVersion("PUBLISHED")}
      >
        <Stack gap={5}>
          <TextInput
            id="v-label"
            labelText="Version label"
            placeholder="e.g. 2026-27"
            value={vForm.label}
            onChange={(e) => setVForm((f) => ({ ...f, label: e.target.value }))}
          />
          <TextInput
            id="v-desc"
            labelText="Description (optional)"
            value={vForm.description}
            onChange={(e) =>
              setVForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Select
            id="v-copy"
            labelText="Copy from existing version (optional)"
            value={vForm.copyFromVersionId}
            onChange={(e) =>
              setVForm((f) => ({ ...f, copyFromVersionId: e.target.value }))
            }
          >
            <SelectItem value="" text="Start empty" />
            {(versionsQ.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id} text={v.label} />
            ))}
          </Select>
          <Stack gap={3}>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Import rate items from CSV (optional). Columns:{" "}
              <code>code, description, unit, rate</code> — rate in ₹. Imported rows
              override copied items with the same code.
            </p>
            <Stack orientation="horizontal" gap={3}>
              <FileUploaderButton
                labelText="Choose CSV"
                accept={[".csv"]}
                disableLabelChanges
                buttonKind="tertiary"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) void file.text().then((text) => setVForm((f) => ({ ...f, csvText: text })));
                }}
              />
              <a className="cds--btn cds--btn--ghost cds--btn--sm" href={DEMO_CSV_URL} download>
                Download demo CSV
              </a>
            </Stack>
            {vForm.csvText.trim() ? (
              <Tag type="blue">{parseDsrCsvText(vForm.csvText).length} rows ready to import</Tag>
            ) : null}
          </Stack>
          {vError && (
            <InlineNotification kind="error" title="Error" subtitle={vError} hideCloseButton />
          )}
          <Button
            kind="secondary"
            disabled={!vForm.label || vBusy}
            onClick={() => submitNewVersion("DRAFT")}
          >
            {vBusy ? "Saving…" : "Save draft"}
          </Button>
        </Stack>
      </Modal>

      <Modal
        open={importOpen}
        modalHeading="Import rate-book items from CSV"
        primaryButtonText={importCsv.isPending ? "Importing…" : "Import"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!importText.trim() || importCsv.isPending}
        onRequestClose={() => setImportOpen(false)}
        onRequestSubmit={() => void submitImport()}
      >
        <Stack gap={5}>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Columns: <code>code, description, unit, rate</code> (rate in ₹). Header row optional.
          </p>
          <Stack orientation="horizontal" gap={3}>
            <FileUploaderButton
              labelText="Choose CSV file"
              accept={[".csv"]}
              disableLabelChanges
              buttonKind="tertiary"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                void readCsvFile(e.target.files?.[0] ?? null)
              }
            />
            <a className="cds--btn cds--btn--ghost cds--btn--sm" href={DEMO_CSV_URL} download>
              Download demo CSV
            </a>
          </Stack>
          {importText.trim() ? (
            <Tag type="blue">{parseDsrCsvText(importText).length} rows parsed</Tag>
          ) : null}
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={importReplace}
              onChange={(e) => setImportReplace(e.target.checked)}
            />
            Replace all existing items in this version
          </label>
          {importError && (
            <InlineNotification kind="error" title="Import failed" subtitle={importError} hideCloseButton />
          )}
        </Stack>
      </Modal>

      <Modal
        open={iOpen}
        modalHeading="Add rate item"
        primaryButtonText={createItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !iForm.code ||
          !iForm.description ||
          !iForm.unit ||
          createItem.isPending
        }
        onRequestClose={() => setIOpen(false)}
        onRequestSubmit={() =>
          createItem.mutate({
            versionId,
            code: iForm.code,
            description: iForm.description,
            unit: iForm.unit,
            ratePaise: parseRupeeInput(iForm.rate),
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="i-code"
            labelText="Code"
            value={iForm.code}
            onChange={(e) => setIForm((f) => ({ ...f, code: e.target.value }))}
          />
          <TextInput
            id="i-desc"
            labelText="Description"
            value={iForm.description}
            onChange={(e) =>
              setIForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <TextInput
            id="i-unit"
            labelText="Unit"
            placeholder="cum, sqm, nos…"
            value={iForm.unit}
            onChange={(e) => setIForm((f) => ({ ...f, unit: e.target.value }))}
          />
          <TextInput
            id="i-rate"
            labelText="Rate (₹)"
            type="number"
            value={iForm.rate}
            onChange={(e) => setIForm((f) => ({ ...f, rate: e.target.value }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
