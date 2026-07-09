import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CmsLocationKind,
  CmsMeasurementType,
  CmsStructureClass,
  type CmsBbsElement,
} from "@esti/contracts";
import { useMemo, useState } from "react";
import { trpc } from "../../lib/trpc.js";
import {
  BBS_ELEMENT_LABEL,
  LOCATION_KIND_LABEL,
  STRUCTURE_CLASS_LABEL,
  STRUCTURE_CLASSES,
} from "./constants.js";
import { StructureDiagram, type DiagramElement } from "./StructureDiagram.js";

export function StructureModelPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const locationsQ = trpc.cms.locations.listByProject.useQuery({ projectId });
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const workflowQ = trpc.cms.workflow.get.useQuery({ projectId });
  const itemsQ = trpc.kb.items.list.useQuery();

  const setModelComplete = trpc.cms.workflow.setModelComplete.useMutation({
    onSuccess: () => void utils.cms.workflow.get.invalidate({ projectId }),
  });
  const createLocation = trpc.cms.locations.create.useMutation({
    onSuccess: () => void utils.cms.locations.listByProject.invalidate({ projectId }),
  });
  const createElement = trpc.cms.elements.create.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });
  const updateElement = trpc.cms.elements.update.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });
  const removeElement = trpc.cms.elements.remove.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });
  const generateComponents = trpc.cms.elements.generateComponents.useMutation({
    onSuccess: () => void utils.cms.elements.listByProject.invalidate({ projectId }),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [elOpen, setElOpen] = useState(false);
  const [locDraft, setLocDraft] = useState({
    name: "",
    kind: "BUILDING" as (typeof CmsLocationKind.options)[number],
    structureClass: "SUPERSTRUCTURE" as CmsStructureClass,
  });
  const [elDraft, setElDraft] = useState({
    description: "",
    structureClass: "SUPERSTRUCTURE" as CmsStructureClass,
    locationId: "",
    itemId: "",
    measurementType: "VOLUME" as (typeof CmsMeasurementType.options)[number],
    dependsOnElementId: "",
    bbsElement: "" as CmsBbsElement | "",
  });

  const elements = elementsQ.data?.elements ?? [];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const suggestionsQ = trpc.cms.elements.suggestComponents.useQuery(
    { parentElementId: selected?.id ?? "" },
    { enabled: !!selected?.id },
  );
  const diagramElements: DiagramElement[] = elements.map((e) => ({
    id: e.id,
    code: e.code,
    description: e.description,
    structureClass: e.structureClass,
    parentElementId: e.parentElementId,
    dependsOnElementId: e.dependsOnElementId,
    locationName: e.locationName,
    bbsElement: e.bbsElement,
  }));

  const dependencyOptions = useMemo(
    () => elements.filter((e) => e.id !== selectedId),
    [elements, selectedId],
  );

  const modelComplete = workflowQ.data?.modelComplete ?? false;
  const canComplete = elements.length > 0 && (locationsQ.data?.length ?? 0) > 0;

  async function handleAddLocation() {
    await createLocation.mutateAsync({
      projectId,
      name: locDraft.name.trim(),
      kind: locDraft.kind,
      structureClass: locDraft.structureClass,
    });
    setLocOpen(false);
    setLocDraft({ name: "", kind: "BUILDING", structureClass: "SUPERSTRUCTURE" });
  }

  async function handleAddElement() {
    const item = itemsQ.data?.find((i) => i.id === elDraft.itemId);
    await createElement.mutateAsync({
      projectId,
      description: elDraft.description.trim() || item?.name || "Element",
      structureClass: elDraft.structureClass,
      locationId: elDraft.locationId || null,
      itemId: elDraft.itemId || undefined,
      measurementType: elDraft.measurementType,
      dependsOnElementId: elDraft.dependsOnElementId || null,
      bbsElement: elDraft.bbsElement || null,
    });
    setElOpen(false);
    setElDraft({
      description: "",
      structureClass: "SUPERSTRUCTURE",
      locationId: "",
      itemId: "",
      measurementType: "VOLUME",
      dependsOnElementId: "",
      bbsElement: "",
    });
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="h6" component="h2" className="esti-grow">
          Structure model
        </Typography>
        <Button size="small" variant="outlined" onClick={() => setLocOpen(true)}>
          Add location
        </Button>
        <Button size="small" variant="contained" onClick={() => setElOpen(true)}>
          Add element
        </Button>
        {selected && (
          <Button
            size="small"
            color="error"
            variant="text"
            onClick={() => {
              if (window.confirm(`Remove ${selected.code}?`)) {
                void removeElement.mutateAsync({ id: selected.id });
                setSelectedId(null);
              }
            }}
          >
            Remove selected
          </Button>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Model substructure, superstructure, and item dependencies before entering measurements.
        Dependencies appear as dashed arrows; parent components as solid arrows.
      </Typography>

      {modelComplete && (
        <Alert severity="success">
          <AlertTitle>Model complete</AlertTitle>
          Measurement, BOQ, and BBS tabs are unlocked. You can reopen the model to revise.
        </Alert>
      )}

      <StructureDiagram
        elements={diagramElements}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {selected && (
        <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">
              {selected.code} — {selected.description}
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                size="small"
                label="Structure class"
                value={selected.structureClass ?? ""}
                onChange={(e) =>
                  void updateElement.mutateAsync({
                    id: selected.id,
                    structureClass: (e.target.value || null) as CmsStructureClass | null,
                  })
                }
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">—</MenuItem>
                {STRUCTURE_CLASSES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {STRUCTURE_CLASS_LABEL[c]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Depends on"
                value={selected.dependsOnElementId ?? ""}
                onChange={(e) =>
                  void updateElement.mutateAsync({
                    id: selected.id,
                    dependsOnElementId: e.target.value || null,
                  })
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">None</MenuItem>
                {dependencyOptions.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.code} — {e.description}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="BBS member (IS)"
                value={selected.bbsElement ?? ""}
                onChange={(e) =>
                  void updateElement.mutateAsync({
                    id: selected.id,
                    bbsElement: (e.target.value || null) as CmsBbsElement | null,
                  })
                }
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">None</MenuItem>
                {(Object.keys(BBS_ELEMENT_LABEL) as CmsBbsElement[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {BBS_ELEMENT_LABEL[k]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                disabled={
                  generateComponents.isPending ||
                  !selected ||
                  (suggestionsQ.data?.filter((s) => !s.alreadyExists).length ?? 0) === 0
                }
                onClick={() => {
                  const picks = (suggestionsQ.data ?? [])
                    .filter((s) => !s.alreadyExists)
                    .map((s) => ({ childItemId: s.childItemId, quantity: s.suggestedQty }));
                  if (picks.length === 0) return;
                  void generateComponents.mutateAsync({ parentElementId: selected!.id, picks });
                }}
              >
                Generate KB dependency components
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button
          variant="contained"
          disabled={!canComplete || setModelComplete.isPending}
          onClick={() =>
            void setModelComplete.mutateAsync({ projectId, modelComplete: !modelComplete })
          }
        >
          {modelComplete ? "Reopen structure model" : "Mark model complete & unlock estimation"}
        </Button>
        {!canComplete && (
          <Typography variant="caption" color="text.secondary">
            Add at least one location and one element first.
          </Typography>
        )}
      </Stack>

      <Dialog open={locOpen} onClose={() => setLocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add location</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={locDraft.name}
              onChange={(e) => setLocDraft((d) => ({ ...d, name: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Kind"
              value={locDraft.kind}
              onChange={(e) =>
                setLocDraft((d) => ({
                  ...d,
                  kind: e.target.value as (typeof CmsLocationKind.options)[number],
                }))
              }
              fullWidth
            >
              {CmsLocationKind.options.map((k) => (
                <MenuItem key={k} value={k}>
                  {LOCATION_KIND_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Structure class"
              value={locDraft.structureClass}
              onChange={(e) =>
                setLocDraft((d) => ({
                  ...d,
                  structureClass: e.target.value as CmsStructureClass,
                }))
              }
              fullWidth
            >
              {STRUCTURE_CLASSES.map((c) => (
                <MenuItem key={c} value={c}>
                  {STRUCTURE_CLASS_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!locDraft.name.trim() || createLocation.isPending}
            onClick={() => void handleAddLocation()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={elOpen} onClose={() => setElOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add element</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Description"
              value={elDraft.description}
              onChange={(e) => setElDraft((d) => ({ ...d, description: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Item (library)"
              value={elDraft.itemId}
              onChange={(e) => setElDraft((d) => ({ ...d, itemId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              {(itemsQ.data ?? []).slice(0, 200).map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Location"
              value={elDraft.locationId}
              onChange={(e) => setElDraft((d) => ({ ...d, locationId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              {(locationsQ.data ?? []).map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Structure class"
              value={elDraft.structureClass}
              onChange={(e) =>
                setElDraft((d) => ({
                  ...d,
                  structureClass: e.target.value as CmsStructureClass,
                }))
              }
              fullWidth
            >
              {STRUCTURE_CLASSES.map((c) => (
                <MenuItem key={c} value={c}>
                  {STRUCTURE_CLASS_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Depends on"
              value={elDraft.dependsOnElementId}
              onChange={(e) => setElDraft((d) => ({ ...d, dependsOnElementId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {elements.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Measurement type"
              value={elDraft.measurementType}
              onChange={(e) =>
                setElDraft((d) => ({
                  ...d,
                  measurementType: e.target.value as (typeof CmsMeasurementType.options)[number],
                }))
              }
              fullWidth
            >
              {CmsMeasurementType.options.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="BBS member"
              value={elDraft.bbsElement}
              onChange={(e) =>
                setElDraft((d) => ({
                  ...d,
                  bbsElement: e.target.value as CmsBbsElement | "",
                }))
              }
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {(Object.keys(BBS_ELEMENT_LABEL) as CmsBbsElement[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {BBS_ELEMENT_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setElOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createElement.isPending}
            onClick={() => void handleAddElement()}
          >
            Add element
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
