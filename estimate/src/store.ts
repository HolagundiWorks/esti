/** The Estimate app store — working model + loaded rate book. */
import { RateLibraryPack, type RateLibraryPack as RateLibraryPackData, type RateLibraryRateItem } from "@esti/contracts";
import { create } from "zustand";
import { defaultMeasurementTemplate } from "./core/measurement.js";
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
import { indexRateBook, type RateBookIndex } from "./core/rateBookIndex.js";
import { enrichRateBookPack } from "./core/packEnrich.js";
import { syncDerivedItems } from "./core/deriveItems.js";

interface Store {
  model: EstimateModel;
  rateBookIndex: RateBookIndex | null;
  rateBookLoading: boolean;
  rateBookError: string | null;

  setModel: (model: EstimateModel) => void;
  setMeta: (patch: Partial<EstimateModel>) => void;
  loadRateBook: (pack: RateLibraryPackData) => void;
  setRateBookLoading: (loading: boolean) => void;
  setRateBookError: (error: string | null) => void;

  addItemFromRate: (rate: RateLibraryRateItem, section: string) => void;
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

function workItemFromRate(rate: RateLibraryRateItem, section: string): WorkItem {
  const template = rate.measurementTemplate ?? defaultMeasurementTemplate(rate.uom);
  return {
    id: newId("i"),
    code: rate.code,
    itemCode: rate.itemCode,
    shortName: rate.shortName,
    specification: rate.specification,
    uom: rate.uom,
    ratePaise: rate.ratePaise,
    section,
    measurementTemplate: template,
    measurements: [emptyMeasureRow()],
  };
}

function withDerived(items: WorkItem[], index: RateBookIndex | null): WorkItem[] {
  return syncDerivedItems(items, index);
}

export const useStore = create<Store>((set, get) => ({
  model: emptyModel(),
  rateBookIndex: null,
  rateBookLoading: false,
  rateBookError: null,

  setModel: (model) => set({ model }),
  setMeta: (patch) => set((s) => ({ model: { ...s.model, ...patch } })),

  loadRateBook: (pack) => {
    const parsed = RateLibraryPack.parse(pack);
    const enriched = enrichRateBookPack(parsed);
    const index = indexRateBook(enriched);
    set((s) => ({
      rateBookIndex: index,
      rateBookError: null,
      model: {
        ...s.model,
        rateBookCode: enriched.edition,
        rateBookName: `${enriched.source} DSR ${enriched.year}`,
      },
    }));
  },
  setRateBookLoading: (loading) => set({ rateBookLoading: loading }),
  setRateBookError: (error) => set({ rateBookError: error }),

  addItemFromRate: (rate, section) => {
    const { model, rateBookIndex } = get();
    if (model.items.some((i) => i.code === rate.code && !i.derivedFrom)) return;
    const items = withDerived([...model.items, workItemFromRate(rate, section)], rateBookIndex);
    set({ model: { ...model, items } });
  },

  addItem: () =>
    set((s) => ({ model: { ...s.model, items: [...s.model.items, emptyItem()] } })),
  updateItem: (id, patch) =>
    set((s) => {
      const items = mapItems(s.model.items, id, (i) => ({ ...i, ...patch }));
      return { model: { ...s.model, items: withDerived(items, s.rateBookIndex) } };
    }),
  removeItem: (id) =>
    set((s) => {
      const removed = s.model.items.find((i) => i.id === id);
      const items = s.model.items.filter((i) => i.id !== id && i.derivedFrom !== removed?.code);
      return { model: { ...s.model, items: withDerived(items, s.rateBookIndex) } };
    }),

  addMeasure: (itemId) =>
    set((s) => {
      const items = mapItems(s.model.items, itemId, (i) => ({
        ...i,
        measurements: [...i.measurements, emptyMeasureRow()],
      }));
      return { model: { ...s.model, items: withDerived(items, s.rateBookIndex) } };
    }),
  updateMeasure: (itemId, rowId, patch) =>
    set((s) => {
      const items = mapItems(s.model.items, itemId, (i) => ({
        ...i,
        measurements: i.measurements.map((m) => (m.id === rowId ? { ...m, ...patch } : m)),
      }));
      return { model: { ...s.model, items: withDerived(items, s.rateBookIndex) } };
    }),
  removeMeasure: (itemId, rowId) =>
    set((s) => {
      const items = mapItems(s.model.items, itemId, (i) => ({
        ...i,
        measurements: i.measurements.filter((m) => m.id !== rowId),
      }));
      return { model: { ...s.model, items: withDerived(items, s.rateBookIndex) } };
    }),

  addMaterial: () =>
    set((s) => ({
      model: {
        ...s.model,
        materials: [...s.model.materials, { id: newId("mat"), code: "", name: "", unit: "", qty: 0 }],
      },
    })),
  updateMaterial: (id, patch) =>
    set((s) => ({
      model: { ...s.model, materials: s.model.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) },
    })),
  removeMaterial: (id) => set((s) => ({ model: { ...s.model, materials: s.model.materials.filter((m) => m.id !== id) } })),

  addBbs: (member) => set((s) => ({ model: { ...s.model, bbs: [...s.model.bbs, member] } })),
  updateBbs: (id, patch) =>
    set((s) => ({
      model: { ...s.model, bbs: s.model.bbs.map((b) => (b.id === id ? ({ ...b, ...patch } as BbsMemberRow) : b)) },
    })),
  removeBbs: (id) => set((s) => ({ model: { ...s.model, bbs: s.model.bbs.filter((b) => b.id !== id) } })),

  setSteelRate: (dia, ratePaise) =>
    set((s) => ({
      model: { ...s.model, steelRatePaiseByDia: { ...s.model.steelRatePaiseByDia, [dia]: ratePaise } },
    })),

  reset: () => set({ model: emptyModel(), rateBookIndex: null, rateBookError: null }),
}));
