import {
  Button,
  InlineNotification,
  Modal,
  NumberInput,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import {
  VENDOR_CATEGORIES,
  VendorCategory,
  formatINR,
  vendorScore,
  type VendorCategoryCode,
} from "@esti/contracts";
import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { VendorQuotes } from "../components/vendor/VendorQuotes.js";
import { VendorRateCompare } from "../components/vendor/VendorRateCompare.js";
import { trpc } from "../lib/trpc.js";

type FormState = {
  id?: string;
  name: string; category: VendorCategoryCode;
  companyName: string; contactPerson: string;
  gstin: string; pan: string; email: string; phone: string; city: string; state: string;
};

const EMPTY: FormState = {
  name: "", category: "CEMENT", companyName: "", contactPerson: "",
  gstin: "", pan: "", email: "", phone: "", city: "", state: "",
};

const EMPTY_PRICE = {
  materialName: "", unit: "", rateRupees: 0,
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: "MANUAL" as "QUOTE" | "INVOICE" | "MANUAL",
  notes: "",
};

function scoreTag(score: number): "green" | "teal" | "blue" | "gray" {
  if (score >= 4.5) return "green";
  if (score >= 3.5) return "teal";
  if (score > 0) return "blue";
  return "gray";
}

export function Vendors() {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("");
  const listQ = trpc.vendors.list.useQuery({
    category: category ? (category as VendorCategoryCode) : undefined,
  });
  const rows = listQ.data ?? [];

  const invalidate = () => utils.vendors.list.invalidate();
  const [form, setForm] = useState<FormState | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string; quality: string; reliability: string; pricing: string; notes: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState<typeof EMPTY_PRICE | null>(null);
  const [confirmPriceId, setConfirmPriceId] = useState<string | null>(null);

  const create = trpc.vendors.create.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const update = trpc.vendors.update.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const setRatingM = trpc.vendors.setRating.useMutation({ onSuccess: () => { invalidate(); setRating(null); } });
  const remove = trpc.vendors.remove.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null); } });

  const pricesQ = trpc.vendors.pricesByVendor.useQuery(
    { vendorId: selectedId! },
    { enabled: !!selectedId },
  );
  const addPrice = trpc.vendors.addPrice.useMutation({
    onSuccess: () => { void pricesQ.refetch(); setPriceForm(null); },
  });
  const removePrice = trpc.vendors.removePrice.useMutation({ onSuccess: () => void pricesQ.refetch() });

  const saving = create.isPending || update.isPending;
  const err = create.error || update.error;
  const selected = rows.find((v) => v.id === selectedId);

  const submit = () => {
    if (!form) return;
    const payload = {
      name: form.name, category: form.category,
      companyName: form.companyName || undefined, contactPerson: form.contactPerson || undefined,
      gstin: form.gstin || undefined, pan: form.pan || undefined,
      email: form.email || undefined, phone: form.phone || undefined,
      city: form.city || undefined, state: form.state || undefined,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  };

  return (
    <Stack gap={6}>
      <PageHeader
        title="Vendors"
        description="Material supplier directory — categories, statutory ids, ratings and pricing history."
        actions={<Button onClick={() => setForm({ ...EMPTY })}>New vendor</Button>}
      />

      <Stack orientation="horizontal" gap={5}>
        <Select id="vn-cat" labelText="Category" hideLabel size="sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <SelectItem value="" text="All categories" />
          {VendorCategory.options.map((c) => (
            <SelectItem key={c} value={c} text={VENDOR_CATEGORIES[c]} />
          ))}
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load vendors" subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No vendors yet", description: "Add a material supplier to track contacts, ratings and pricing.", action: <Button size="sm" onClick={() => setForm({ ...EMPTY })}>New vendor</Button> }}
      >
        <TableContainer title="Vendors">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Contact</TableHeader>
                <TableHeader>GSTIN / PAN</TableHeader>
                <TableHeader>Rating</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((v) => {
                const score = vendorScore(v);
                const isSelected = selectedId === v.id;
                return (
                  <TableRow
                    key={v.id}
                    onClick={() => setSelectedId(isSelected ? null : v.id)}
                    style={{ cursor: "pointer", background: isSelected ? "var(--cds-layer-selected)" : undefined }}
                  >
                    <TableCell>
                      {v.name}{!v.active && <Tag type="gray" size="sm">Inactive</Tag>}
                      {v.companyName && <div className="esti-label esti-label--secondary">{v.companyName}</div>}
                      {(v.city || v.state) && <div className="esti-label esti-label--helper">{[v.city, v.state].filter(Boolean).join(", ")}</div>}
                    </TableCell>
                    <TableCell>{VENDOR_CATEGORIES[v.category as VendorCategoryCode] ?? v.category}</TableCell>
                    <TableCell>
                      {v.contactPerson ?? "—"}
                      {v.phone && <div className="esti-label esti-label--helper">{v.phone}</div>}
                      {v.email && <div className="esti-label esti-label--helper">{v.email}</div>}
                    </TableCell>
                    <TableCell>
                      {v.gstin ?? "—"}
                      {v.pan && <div className="esti-label esti-label--helper">{v.pan}</div>}
                    </TableCell>
                    <TableCell>
                      {score > 0 ? <Tag type={scoreTag(score)}>{score.toFixed(1)} / 5</Tag> : <Tag type="gray" size="sm">Unrated</Tag>}
                    </TableCell>
                    <TableCell>
                      <Button kind="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setForm({
                        id: v.id, name: v.name, category: v.category as VendorCategoryCode,
                        companyName: v.companyName ?? "", contactPerson: v.contactPerson ?? "",
                        gstin: v.gstin ?? "", pan: v.pan ?? "", email: v.email ?? "", phone: v.phone ?? "",
                        city: v.city ?? "", state: v.state ?? "",
                      }); }}>Edit</Button>
                      <Button kind="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setRating({
                        id: v.id, name: v.name,
                        quality: v.qualityRating ? String(v.qualityRating) : "",
                        reliability: v.reliabilityRating ? String(v.reliabilityRating) : "",
                        pricing: v.pricingRating ? String(v.pricingRating) : "",
                        notes: v.notes ?? "",
                      }); }}>Rate</Button>
                      <Button kind="danger--ghost" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmId(v.id); }}>Remove</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* Pricing history for the selected vendor */}
      {selected && (
        <Stack gap={4}>
          <div className="esti-row-between">
            <h4>{selected.name} — Pricing history</h4>
            <Button size="sm" renderIcon={Add} onClick={() => setPriceForm({ ...EMPTY_PRICE })}>
              Add price
            </Button>
          </div>
          <DataState
            loading={pricesQ.isLoading}
            isEmpty={!pricesQ.isLoading && (pricesQ.data?.length ?? 0) === 0}
            empty={{ title: "No price records", description: "Record a quoted or invoiced rate for a material from this vendor." }}
            columnCount={6}
          >
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Material</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Rate</TableHeader>
                    <TableHeader>Effective</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(pricesQ.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.materialName}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell>{formatINR(p.ratePaise)}</TableCell>
                      <TableCell>{p.effectiveDate}</TableCell>
                      <TableCell><Tag type="cool-gray" size="sm">{p.source}</Tag></TableCell>
                      <TableCell>
                        <Button
                          kind="danger--ghost" size="sm" renderIcon={TrashCan} hasIconOnly
                          iconDescription="Remove price"
                          onClick={() => setConfirmPriceId(p.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>

          <VendorQuotes vendorId={selected.id} />
        </Stack>
      )}

      <VendorRateCompare />

      {/* create / edit vendor */}
      <Modal
        open={form !== null}
        modalHeading={form?.id ? "Edit vendor" : "New vendor"}
        primaryButtonText={saving ? "Saving…" : form?.id ? "Save" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form?.name || saving}
        onRequestClose={() => setForm(null)}
        onRequestSubmit={submit}
      >
        {form && (
          <Stack gap={5}>
            <TextInput id="vn-name" labelText="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select id="vn-fcat" labelText="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VendorCategoryCode })}>
              {VendorCategory.options.map((c) => <SelectItem key={c} value={c} text={VENDOR_CATEGORIES[c]} />)}
            </Select>
            <TextInput id="vn-company" labelText="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="vn-contact" labelText="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <TextInput id="vn-phone" labelText="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Stack>
            <TextInput id="vn-email" labelText="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="vn-gstin" labelText="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
              <TextInput id="vn-pan" labelText="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
            </Stack>
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="vn-city" labelText="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <TextInput id="vn-state" labelText="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Stack>
            {err && <InlineNotification kind="error" title="Could not save" subtitle={err.message} hideCloseButton lowContrast />}
          </Stack>
        )}
      </Modal>

      {/* rating */}
      <Modal
        open={rating !== null}
        modalHeading={rating ? `Rate — ${rating.name}` : "Rate"}
        primaryButtonText={setRatingM.isPending ? "Saving…" : "Save rating"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={setRatingM.isPending}
        onRequestClose={() => setRating(null)}
        onRequestSubmit={() => rating && setRatingM.mutate({
          id: rating.id,
          qualityRating: rating.quality ? Number(rating.quality) : undefined,
          reliabilityRating: rating.reliability ? Number(rating.reliability) : undefined,
          pricingRating: rating.pricing ? Number(rating.pricing) : undefined,
          notes: rating.notes || undefined,
        })}
      >
        {rating && (
          <Stack gap={5}>
            {([["quality", "Quality"], ["reliability", "Reliability"], ["pricing", "Pricing"]] as const).map(([k, label]) => (
              <Select key={k} id={`vn-r-${k}`} labelText={label} value={rating[k]}
                onChange={(e) => setRating({ ...rating, [k]: e.target.value })}>
                <SelectItem value="" text="— not rated —" />
                {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)} text={`${n} / 5`} />)}
              </Select>
            ))}
            <TextArea id="vn-r-notes" labelText="Notes (optional)" rows={3} value={rating.notes}
              onChange={(e) => setRating({ ...rating, notes: e.target.value })} />
            {setRatingM.error && <InlineNotification kind="error" title="Could not save" subtitle={setRatingM.error.message} hideCloseButton lowContrast />}
          </Stack>
        )}
      </Modal>

      {/* add price */}
      <Modal
        open={priceForm !== null}
        modalHeading={`Add price${selected ? ` — ${selected.name}` : ""}`}
        primaryButtonText={addPrice.isPending ? "Saving…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={addPrice.isPending || !priceForm?.materialName || !priceForm?.unit || (priceForm?.rateRupees ?? 0) <= 0}
        onRequestClose={() => setPriceForm(null)}
        onRequestSubmit={() => {
          if (!priceForm || !selectedId) return;
          addPrice.mutate({
            vendorId: selectedId,
            materialName: priceForm.materialName,
            unit: priceForm.unit,
            ratePaise: Math.round(priceForm.rateRupees * 100),
            effectiveDate: priceForm.effectiveDate,
            source: priceForm.source,
            notes: priceForm.notes || undefined,
          });
        }}
      >
        {priceForm && (
          <Stack gap={5}>
            <TextInput id="vp-mat" labelText="Material" placeholder="OPC 53 grade cement" value={priceForm.materialName}
              onChange={(e) => setPriceForm({ ...priceForm, materialName: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="vp-unit" labelText="Unit" placeholder="bag" value={priceForm.unit}
                onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })} />
              <NumberInput id="vp-rate" label="Rate (₹)" value={priceForm.rateRupees} min={0} step={0.5}
                onChange={(_e, { value }) => setPriceForm({ ...priceForm, rateRupees: Number(value) })} />
            </Stack>
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="vp-date" labelText="Effective date" type="date" value={priceForm.effectiveDate}
                onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} />
              <Select id="vp-src" labelText="Source" value={priceForm.source}
                onChange={(e) => setPriceForm({ ...priceForm, source: e.target.value as "QUOTE" | "INVOICE" | "MANUAL" })}>
                <SelectItem value="MANUAL" text="Manual" />
                <SelectItem value="QUOTE" text="Quote" />
                <SelectItem value="INVOICE" text="Invoice" />
              </Select>
            </Stack>
            <TextInput id="vp-notes" labelText="Notes (optional)" value={priceForm.notes}
              onChange={(e) => setPriceForm({ ...priceForm, notes: e.target.value })} />
            {addPrice.error && <InlineNotification kind="error" title="Could not save" subtitle={addPrice.error.message} hideCloseButton lowContrast />}
          </Stack>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmId} heading="Remove vendor?" body="This permanently removes the vendor and all its price records."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
      <ConfirmModal
        open={!!confirmPriceId} heading="Remove price record?" body="This removes the price record from the vendor's history."
        confirmText="Remove" pending={removePrice.isPending}
        onConfirm={() => { if (confirmPriceId) removePrice.mutate({ id: confirmPriceId }); setConfirmPriceId(null); }}
        onClose={() => setConfirmPriceId(null)}
      />
    </Stack>
  );
}
