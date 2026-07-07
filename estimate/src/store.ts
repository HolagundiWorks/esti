/** The Estimate app's single working-model store (zustand). All edits are local. */
import { create } from "zustand";
import {
  type BbsMemberRow,
  type EstimateModel,
  type MaterialLine,
  type MeasureRow,
  type WorkItem,
  emptyItem,
  emptyMeasureRow,
  emptyModel,
  newId,
} from "./core/model.js";

interface Store {
  model: EstimateModel;
  setModel: (model: EstimateModel) => void;
  setMeta: (patch: Partial<EstimateModel>) => void;
  addItem: () => void;
  updateItem: (id: string, patch: Partial<WorkItem>) => void;
  removeItem: (id: string) => void;
  addMeasure: (itemId: string) => void;
  updateMeasure: (itemId: string, rowId: string, patch: Partial<MeasureRow>) => void;
  removeMeasure: (itemId: string, rowId: string) => void;
  addMaterial: () => void;
  updateMaterial: (id: string, patch: Partial<MaterialLine>) => void;
  removeMaterial: (id: string) => void;
  addBbs: (member: BbsMemberRow) => void;
  updateBbs: (id: string, patch: Partial<BbsMemberRow>) => void;
  removeBbs: (id: string) => void;
  setSteelRate: (dia: number, ratePaise: number) => void;
  reset: () => void;
}

const mapItems = (items: WorkItem[], id: string, fn: (i: WorkItem) => WorkItem) =>
  items.map((i) => (i.id === id ? fn(i) : i));

export const useStore = create<Store>((set) => ({
  model: emptyModel(),
  setModel: (model) => set({ model }),
  setMeta: (patch) => set((s) => ({ model: { ...s.model, ...patch } })),

  addItem: () => set((s) => ({ model: { ...s.model, items: [...s.model.items, emptyItem()] } })),
  updateItem: (id, patch) => set((s) => ({ model: { ...s.model, items: mapItems(s.model.items, id, (i) => ({ ...i, ...patch })) } })),
  removeItem: (id) => set((s) => ({ model: { ...s.model, items: s.model.items.filter((i) => i.id !== id) } })),

  addMeasure: (itemId) =>
    set((s) => ({ model: { ...s.model, items: mapItems(s.model.items, itemId, (i) => ({ ...i, measurements: [...i.measurements, emptyMeasureRow()] })) } })),
  updateMeasure: (itemId, rowId, patch) =>
    set((s) => ({
      model: {
        ...s.model,
        items: mapItems(s.model.items, itemId, (i) => ({
          ...i,
          measurements: i.measurements.map((m) => (m.id === rowId ? { ...m, ...patch } : m)),
        })),
      },
    })),
  removeMeasure: (itemId, rowId) =>
    set((s) => ({ model: { ...s.model, items: mapItems(s.model.items, itemId, (i) => ({ ...i, measurements: i.measurements.filter((m) => m.id !== rowId) })) } })),

  addMaterial: () =>
    set((s) => ({ model: { ...s.model, materials: [...s.model.materials, { id: newId("mat"), code: "", name: "", unit: "", qty: 0 }] } })),
  updateMaterial: (id, patch) =>
    set((s) => ({ model: { ...s.model, materials: s.model.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) } })),
  removeMaterial: (id) => set((s) => ({ model: { ...s.model, materials: s.model.materials.filter((m) => m.id !== id) } })),

  addBbs: (member) => set((s) => ({ model: { ...s.model, bbs: [...s.model.bbs, member] } })),
  updateBbs: (id, patch) =>
    set((s) => ({ model: { ...s.model, bbs: s.model.bbs.map((b) => (b.id === id ? ({ ...b, ...patch } as BbsMemberRow) : b)) } })),
  removeBbs: (id) => set((s) => ({ model: { ...s.model, bbs: s.model.bbs.filter((b) => b.id !== id) } })),

  setSteelRate: (dia, ratePaise) =>
    set((s) => ({ model: { ...s.model, steelRatePaiseByDia: { ...s.model.steelRatePaiseByDia, [dia]: ratePaise } } })),

  reset: () => set({ model: emptyModel() }),
}));
