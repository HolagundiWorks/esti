import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  CONTRACTOR_CATEGORIES,
  ContractorCategory,
  contractorScore,
  type ContractorCategoryCode,
} from "@esti/contracts";
import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

type FormState = {
  id?: string;
  name: string; category: ContractorCategoryCode;
  companyName: string; contactPerson: string;
  gstin: string; pan: string; email: string; phone: string; city: string; state: string;
};

const EMPTY: FormState = {
  name: "", category: "CIVIL", companyName: "", contactPerson: "",
  gstin: "", pan: "", email: "", phone: "", city: "", state: "",
};

function scoreTag(score: number): "green" | "teal" | "blue" | "gray" {
  if (score >= 4.5) return "green";
  if (score >= 3.5) return "teal";
  if (score > 0) return "blue";
  return "gray";
}

export function Contractors() {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("");
  const listQ = trpc.contractors.list.useQuery({
    category: category ? (category as ContractorCategoryCode) : undefined,
  });
  const rows = listQ.data ?? [];

  const invalidate = () => utils.contractors.list.invalidate();
  const [form, setForm] = useState<FormState | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string; quality: string; timeliness: string; safety: string; notes: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = trpc.contractors.create.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const update = trpc.contractors.update.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const setRatingM = trpc.contractors.setRating.useMutation({ onSuccess: () => { invalidate(); setRating(null); } });
  const remove = trpc.contractors.remove.useMutation({ onSuccess: invalidate });

  const saving = create.isPending || update.isPending;
  const err = create.error || update.error;

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
      <Stack orientation="horizontal" gap={5}>
        <Stack gap={3} className="esti-grow">
          <h1>Contractors</h1>
          <p>Construction contractor register — trades, statutory ids and on-site performance.</p>
        </Stack>
        <Button onClick={() => setForm({ ...EMPTY })}>New contractor</Button>
      </Stack>

      <Stack orientation="horizontal" gap={5}>
        <Select id="ct-cat" labelText="Category" hideLabel size="sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <SelectItem value="" text="All categories" />
          {ContractorCategory.options.map((c) => (
            <SelectItem key={c} value={c} text={CONTRACTOR_CATEGORIES[c]} />
          ))}
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load contractors" subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No contractors yet", description: "Add a contractor to invite to tenders and track on site.", action: <Button size="sm" onClick={() => setForm({ ...EMPTY })}>New contractor</Button> }}
      >
        <TableContainer title="Contractors">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Contact</TableHeader>
                <TableHeader>GSTIN / PAN</TableHeader>
                <TableHeader>Performance</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => {
                const score = contractorScore(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}{!c.active && <Tag type="gray" size="sm">Inactive</Tag>}
                      {c.companyName && <div className="esti-label esti-label--secondary">{c.companyName}</div>}
                      {(c.city || c.state) && <div className="esti-label esti-label--helper">{[c.city, c.state].filter(Boolean).join(", ")}</div>}
                    </TableCell>
                    <TableCell>{CONTRACTOR_CATEGORIES[c.category as ContractorCategoryCode] ?? c.category}</TableCell>
                    <TableCell>
                      {c.contactPerson ?? "—"}
                      {c.phone && <div className="esti-label esti-label--helper">{c.phone}</div>}
                      {c.email && <div className="esti-label esti-label--helper">{c.email}</div>}
                    </TableCell>
                    <TableCell>
                      {c.gstin ?? "—"}
                      {c.pan && <div className="esti-label esti-label--helper">{c.pan}</div>}
                    </TableCell>
                    <TableCell>
                      {score > 0 ? <Tag type={scoreTag(score)}>{score.toFixed(1)} / 5</Tag> : <Tag type="gray" size="sm">Unrated</Tag>}
                    </TableCell>
                    <TableCell>
                      <Button kind="ghost" size="sm" onClick={() => setForm({
                        id: c.id, name: c.name, category: c.category as ContractorCategoryCode,
                        companyName: c.companyName ?? "", contactPerson: c.contactPerson ?? "",
                        gstin: c.gstin ?? "", pan: c.pan ?? "", email: c.email ?? "", phone: c.phone ?? "",
                        city: c.city ?? "", state: c.state ?? "",
                      })}>Edit</Button>
                      <Button kind="ghost" size="sm" onClick={() => setRating({
                        id: c.id, name: c.name,
                        quality: c.qualityRating ? String(c.qualityRating) : "",
                        timeliness: c.timelinessRating ? String(c.timelinessRating) : "",
                        safety: c.safetyRating ? String(c.safetyRating) : "",
                        notes: c.notes ?? "",
                      })}>Rate</Button>
                      <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(c.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* create / edit */}
      <Modal
        open={form !== null}
        modalHeading={form?.id ? "Edit contractor" : "New contractor"}
        primaryButtonText={saving ? "Saving…" : form?.id ? "Save" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form?.name || saving}
        onRequestClose={() => setForm(null)}
        onRequestSubmit={submit}
      >
        {form && (
          <Stack gap={5}>
            <TextInput id="ct-name" labelText="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select id="ct-fcat" labelText="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContractorCategoryCode })}>
              {ContractorCategory.options.map((c) => <SelectItem key={c} value={c} text={CONTRACTOR_CATEGORIES[c]} />)}
            </Select>
            <TextInput id="ct-company" labelText="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="ct-contact" labelText="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <TextInput id="ct-phone" labelText="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Stack>
            <TextInput id="ct-email" labelText="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="ct-gstin" labelText="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
              <TextInput id="ct-pan" labelText="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
            </Stack>
            <Stack orientation="horizontal" gap={5}>
              <TextInput id="ct-city" labelText="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <TextInput id="ct-state" labelText="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
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
          timelinessRating: rating.timeliness ? Number(rating.timeliness) : undefined,
          safetyRating: rating.safety ? Number(rating.safety) : undefined,
          notes: rating.notes || undefined,
        })}
      >
        {rating && (
          <Stack gap={5}>
            {([["quality", "Quality"], ["timeliness", "Timeliness"], ["safety", "Safety"]] as const).map(([k, label]) => (
              <Select key={k} id={`ct-r-${k}`} labelText={label} value={rating[k]}
                onChange={(e) => setRating({ ...rating, [k]: e.target.value })}>
                <SelectItem value="" text="— not rated —" />
                {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)} text={`${n} / 5`} />)}
              </Select>
            ))}
            <TextArea id="ct-r-notes" labelText="Notes (optional)" rows={3} value={rating.notes}
              onChange={(e) => setRating({ ...rating, notes: e.target.value })} />
            {setRatingM.error && <InlineNotification kind="error" title="Could not save" subtitle={setRatingM.error.message} hideCloseButton lowContrast />}
          </Stack>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmId} heading="Remove contractor?" body="This permanently removes the contractor from the register."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
    </Stack>
  );
}
