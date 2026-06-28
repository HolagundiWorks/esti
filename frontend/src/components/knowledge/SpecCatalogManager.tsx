import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import { useEffect, useState } from "react";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const blankItemForm = () => ({
  category: "",
  item: "",
  make: "",
  specification: "",
  finish: "",
  remarks: "",
});

export function SpecCatalogManager({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const versionsQ = trpc.specCatalog.listVersions.useQuery();
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!versionId && versionsQ.data && versionsQ.data.length > 0) {
      const active = versionsQ.data.find((v) => v.active);
      setVersionId(active?.id ?? versionsQ.data[0]!.id);
    }
  }, [versionsQ.data, versionId]);

  const itemsQ = trpc.specCatalog.listItems.useQuery(
    { versionId },
    { enabled: !!versionId },
  );

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState({ label: "", description: "" });
  const createVersion = trpc.specCatalog.createVersion.useMutation({
    onSuccess: (row) => {
      utils.specCatalog.listVersions.invalidate();
      setVersionId(row.id);
      setVOpen(false);
      setVForm({ label: "", description: "" });
    },
  });
  const setActive = trpc.specCatalog.setActiveVersion.useMutation({
    onSuccess: () => {
      utils.specCatalog.listVersions.invalidate();
      utils.specCatalog.activeCatalog.invalidate();
    },
  });

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState(blankItemForm());
  const createItem = trpc.specCatalog.createItem.useMutation({
    onSuccess: () => {
      utils.specCatalog.listItems.invalidate({ versionId });
      utils.specCatalog.activeCatalog.invalidate();
      setIOpen(false);
      setIForm(blankItemForm());
    },
  });
  const removeItem = trpc.specCatalog.removeItem.useMutation({
    onSuccess: () => {
      utils.specCatalog.listItems.invalidate({ versionId });
      utils.specCatalog.activeCatalog.invalidate();
    },
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeVersion = versionsQ.data?.find((v) => v.id === versionId);

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={4}>
        <Stack gap={2} className="esti-grow">
          {embedded ? <h2>Specification catalogue</h2> : <h1>Specification catalogue</h1>}
          <p>
            Versioned material schedule rows used when creating project
            specification sheets.
          </p>
        </Stack>
        <Button onClick={() => setVOpen(true)}>New version</Button>
      </Stack>

      <Stack orientation="horizontal" gap={4}>
        <Select
          id="spec-catalog-ver"
          labelText="Catalogue version"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
        >
          <SelectItem value="" text="Select…" />
          {(versionsQ.data ?? []).map((v) => (
            <SelectItem
              key={v.id}
              value={v.id}
              text={`${v.label}${v.active ? " (active)" : ""}`}
            />
          ))}
        </Select>
        {activeVersion && !activeVersion.active && (
          <Button
            kind="tertiary"
            onClick={() => setActive.mutate({ id: versionId })}
          >
            Set active
          </Button>
        )}
        <Button disabled={!versionId} onClick={() => setIOpen(true)}>
          Add item
        </Button>
      </Stack>

      <DataState
        loading={!!versionId && itemsQ.isLoading}
        isEmpty={!versionId || (itemsQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: versionId
            ? "No catalogue items in this version"
            : "Select or create a catalogue version",
          description: versionId
            ? "Add category, item, make, specification, and finish rows."
            : undefined,
          action: versionId ? (
            <Button size="sm" onClick={() => setIOpen(true)}>
              Add item
            </Button>
          ) : undefined,
        }}
      >
        <TableContainer
          title="Catalogue items"
          description={activeVersion?.description ?? ""}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Category</TableHeader>
                <TableHeader>Item</TableHeader>
                <TableHeader>Make</TableHeader>
                <TableHeader>Specification</TableHeader>
                <TableHeader>Finish</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(itemsQ.data ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.category ?? "—"}</TableCell>
                  <TableCell>{it.item}</TableCell>
                  <TableCell>{it.make ?? "—"}</TableCell>
                  <TableCell>{it.specification ?? "—"}</TableCell>
                  <TableCell>{it.finish ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setConfirmId(it.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove catalogue item?"
        body="Project spec sheets that already copied this row keep their snapshot."
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
        modalHeading="New catalogue version"
        primaryButtonText={createVersion.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!vForm.label || createVersion.isPending}
        onRequestClose={() => setVOpen(false)}
        onRequestSubmit={() =>
          createVersion.mutate({
            label: vForm.label,
            description: vForm.description || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="sc-label"
            labelText="Version label"
            placeholder="e.g. Office standard 2026"
            value={vForm.label}
            onChange={(e) => setVForm((f) => ({ ...f, label: e.target.value }))}
          />
          <TextInput
            id="sc-desc"
            labelText="Description (optional)"
            value={vForm.description}
            onChange={(e) =>
              setVForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </Stack>
      </Modal>

      <Modal
        open={iOpen}
        modalHeading="Add catalogue item"
        primaryButtonText={createItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!iForm.item.trim() || createItem.isPending}
        onRequestClose={() => setIOpen(false)}
        onRequestSubmit={() =>
          createItem.mutate({
            versionId,
            category: iForm.category || undefined,
            item: iForm.item,
            make: iForm.make || undefined,
            specification: iForm.specification || undefined,
            finish: iForm.finish || undefined,
            remarks: iForm.remarks || undefined,
          })
        }
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="sci-category"
              labelText="Category"
              value={iForm.category}
              onChange={(e) =>
                setIForm((f) => ({ ...f, category: e.target.value }))
              }
            />
            <TextInput
              id="sci-item"
              labelText="Item"
              value={iForm.item}
              onChange={(e) => setIForm((f) => ({ ...f, item: e.target.value }))}
            />
            <TextInput
              id="sci-make"
              labelText="Make"
              value={iForm.make}
              onChange={(e) => setIForm((f) => ({ ...f, make: e.target.value }))}
            />
          </Stack>
          <TextArea
            id="sci-spec"
            labelText="Specification"
            rows={3}
            value={iForm.specification}
            onChange={(e) =>
              setIForm((f) => ({ ...f, specification: e.target.value }))
            }
          />
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="sci-finish"
              labelText="Finish"
              value={iForm.finish}
              onChange={(e) =>
                setIForm((f) => ({ ...f, finish: e.target.value }))
              }
            />
            <TextInput
              id="sci-remarks"
              labelText="Remarks"
              value={iForm.remarks}
              onChange={(e) =>
                setIForm((f) => ({ ...f, remarks: e.target.value }))
              }
            />
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
