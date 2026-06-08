import {
  Button,
  FileUploaderButton,
  InlineNotification,
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
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  type FirmType,
  type GstType,
  GstSystem,
  PhoneType,
  STATES,
  districtsFor,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const GST_LABEL: Record<string, string> = {
  [GstSystem.NOT_APPLICABLE]: "NA (not registered)",
  [GstSystem.COMPOSITION]: "Composition (5%, bill of supply)",
  [GstSystem.REGULAR]: "Regular (18% tax invoice)",
};

type Form = {
  companyName: string;
  firmType: FirmType;
  gstType: GstType;
  gstin: string;
  tdsApplicableDefault: boolean;
  architectName: string;
  coaRegNo: string;
  pan: string;
  email: string;
  phone1Type: string;
  phone1: string;
  phone2Type: string;
  phone2: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  district: string;
  state: string;
};

const EMPTY: Form = {
  companyName: "",
  firmType: "SOLO",
  gstType: GstSystem.REGULAR,
  gstin: "",
  tdsApplicableDefault: true,
  architectName: "",
  coaRegNo: "",
  pan: "",
  email: "",
  phone1Type: "MOBILE",
  phone1: "",
  phone2Type: "OFFICE",
  phone2: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  district: "",
  state: "Karnataka",
};

export function Company() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const utils = trpc.useUtils();
  const firmQ = trpc.firm.get.useQuery();
  const settingsQ = trpc.settings.get.useQuery();
  const setHr = trpc.settings.setHrEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  const [f, setF] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (firmQ.data) {
      setF((p) => ({
        ...p,
        ...Object.fromEntries(
          Object.keys(EMPTY).map((k) => [k, (firmQ.data as Record<string, unknown>)[k] ?? EMPTY[k as keyof Form]]),
        ),
      } as Form));
    }
  }, [firmQ.data]);

  const update = trpc.firm.update.useMutation({
    onSuccess: () => {
      utils.firm.get.invalidate();
      setMsg("Company profile saved");
    },
  });

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/upload/firm-logo", { method: "POST", body: fd, credentials: "include" });
    if (res.ok) {
      utils.firm.get.invalidate();
      setMsg("Logo uploaded");
    } else {
      const err = (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
      setMsg(`Logo upload failed: ${err}`);
    }
  }

  const districts = districtsFor(f.state);

  return (
    <div>
      <h1>Company profile</h1>
      {!isOwner && <p style={{ color: "#6f6f6f" }}>Read-only — only the owner can edit.</p>}
      {msg && (
        <InlineNotification kind="success" title="Saved" subtitle={msg} lowContrast onCloseButtonClick={() => setMsg(null)} />
      )}

      <Tile style={{ maxWidth: 760, marginTop: 16 }}>
        <Stack gap={5}>
          <TextInput id="co-name" labelText="Company name" value={f.companyName} onChange={set("companyName")} disabled={!isOwner} />

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Select id="co-type" labelText="Firm type" value={f.firmType} onChange={set("firmType")} disabled={!isOwner}>
              <SelectItem value="SOLO" text="Solo" />
              <SelectItem value="PARTNERSHIP" text="Partnership" />
            </Select>
            {firmQ.data?.logoUrl && (
              <img src={firmQ.data.logoUrl} alt="logo" style={{ height: 48, border: "1px solid #e0e0e0" }} />
            )}
            <FileUploaderButton
              labelText="Upload logo"
              accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
              disableLabelChanges
              buttonKind="tertiary"
              disabled={!isOwner}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void uploadLogo(file);
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <Select id="co-gst" labelText="GST type (sets invoice GST)" value={f.gstType} onChange={set("gstType")} disabled={!isOwner}>
              {Object.values(GstSystem).map((g) => (
                <SelectItem key={g} value={g} text={GST_LABEL[g] ?? g} />
              ))}
            </Select>
            <TextInput id="co-gstin" labelText="GSTIN" value={f.gstin} onChange={set("gstin")} disabled={!isOwner} />
          </div>
          <Toggle
            id="co-tds"
            labelText="TDS declaration — clients deduct TDS u/s 194J (10%)"
            labelA="No TDS"
            labelB="TDS deducted"
            toggled={f.tdsApplicableDefault}
            disabled={!isOwner}
            onToggle={(checked) => setF((p) => ({ ...p, tdsApplicableDefault: checked }))}
          />

          <h4>{f.firmType === "SOLO" ? "Architect" : "Primary signatory"}</h4>
          <div style={{ display: "flex", gap: 16 }}>
            <TextInput id="co-arch" labelText="Architect name" value={f.architectName} onChange={set("architectName")} disabled={!isOwner} />
            <TextInput id="co-coa" labelText="COA registration no" value={f.coaRegNo} onChange={set("coaRegNo")} disabled={!isOwner} />
            <TextInput id="co-pan" labelText="PAN" value={f.pan} onChange={set("pan")} disabled={!isOwner} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <TextInput id="co-email" labelText="Email" type="email" value={f.email} onChange={set("email")} disabled={!isOwner} />
            <Select id="co-p1t" labelText="Phone 1 type" value={f.phone1Type} onChange={set("phone1Type")} disabled={!isOwner}>
              {PhoneType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <TextInput id="co-p1" labelText="Phone 1" value={f.phone1} onChange={set("phone1")} disabled={!isOwner} />
            <Select id="co-p2t" labelText="Phone 2 type" value={f.phone2Type} onChange={set("phone2Type")} disabled={!isOwner}>
              {PhoneType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <TextInput id="co-p2" labelText="Phone 2" value={f.phone2} onChange={set("phone2")} disabled={!isOwner} />
          </div>

          <h4>Address</h4>
          <TextInput id="co-a1" labelText="Address line 1" value={f.addressLine1} onChange={set("addressLine1")} disabled={!isOwner} />
          <TextInput id="co-a2" labelText="Address line 2" value={f.addressLine2} onChange={set("addressLine2")} disabled={!isOwner} />
          <div style={{ display: "flex", gap: 16 }}>
            <TextInput id="co-city" labelText="City" value={f.city} onChange={set("city")} disabled={!isOwner} />
            <TextInput id="co-pin" labelText="Pincode" value={f.pincode} onChange={set("pincode")} disabled={!isOwner} />
            <Select
              id="co-state"
              labelText="State"
              value={f.state}
              onChange={(e) => setF((p) => ({ ...p, state: e.target.value, district: "" }))}
              disabled={!isOwner}
            >
              {STATES.map((s) => <SelectItem key={s} value={s} text={s} />)}
            </Select>
            {districts.length > 0 ? (
              <Select id="co-dist" labelText="District" value={f.district} onChange={set("district")} disabled={!isOwner}>
                <SelectItem value="" text="Select…" />
                {districts.map((d) => <SelectItem key={d} value={d} text={d} />)}
              </Select>
            ) : (
              <TextInput id="co-dist" labelText="District" value={f.district} onChange={set("district")} disabled={!isOwner} />
            )}
          </div>

          <Button
            disabled={!isOwner || !f.companyName || update.isPending}
            onClick={() =>
              update.mutate({
                ...f,
                firmType: f.firmType,
                gstType: f.gstType,
                phone1Type: f.phone1Type as (typeof PhoneType.options)[number],
                phone2Type: f.phone2Type as (typeof PhoneType.options)[number],
              })
            }
          >
            {update.isPending ? "Saving…" : "Save company profile"}
          </Button>
        </Stack>
      </Tile>

      {f.firmType === "PARTNERSHIP" && <Partners isOwner={isOwner} />}

      <Tile style={{ maxWidth: 760, marginTop: 24 }}>
        <h4>Team &amp; HR module</h4>
        <p style={{ color: "var(--cds-text-secondary)", margin: "8px 0 16px" }}>
          Staff register, site in-charge assignment, leaves and salary. Leave off for a solo
          freelancer — the Team and HR areas stay hidden.
        </p>
        <Toggle
          id="hr-toggle"
          labelText="Enable Team &amp; HR"
          labelA="Off (freelance)"
          labelB="On"
          toggled={settingsQ.data?.hrEnabled ?? false}
          disabled={!isOwner || setHr.isPending || settingsQ.isLoading}
          onToggle={(checked) => setHr.mutate({ hrEnabled: checked })}
        />
        {!isOwner && (
          <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", marginTop: 12 }}>
            Only the owner can change this.
          </p>
        )}
      </Tile>
    </div>
  );
}

function Partners({ isOwner }: { isOwner: boolean }) {
  const utils = trpc.useUtils();
  const partnersQ = trpc.firm.listPartners.useQuery();
  const invalidate = () => utils.firm.listPartners.invalidate();
  const remove = trpc.firm.removePartner.useMutation({ onSuccess: invalidate });

  const [p, setP] = useState({
    name: "",
    coaRegNo: "",
    pan: "",
    din: "",
    email: "",
    phone1Type: "MOBILE",
    phone1: "",
    state: "Karnataka",
    district: "",
    city: "",
  });
  const add = trpc.firm.addPartner.useMutation({
    onSuccess: () => {
      invalidate();
      setP((x) => ({ ...x, name: "", coaRegNo: "", pan: "", din: "", email: "", phone1: "" }));
    },
  });
  const districts = districtsFor(p.state);

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Partners</h3>
      <TableContainer title="Partner register">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>COA no</TableHeader>
              <TableHeader>PAN</TableHeader>
              <TableHeader>DIN</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(partnersQ.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.coaRegNo ?? "—"}</TableCell>
                <TableCell>{row.pan ?? "—"}</TableCell>
                <TableCell>{row.din ?? "—"}</TableCell>
                <TableCell>{row.email ?? "—"}</TableCell>
                <TableCell>
                  {isOwner && (
                    <Button kind="ghost" size="sm" onClick={() => remove.mutate({ id: row.id })}>
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isOwner && (
        <Tile style={{ maxWidth: 760, marginTop: 12 }}>
          <Stack gap={5}>
            <h4>Add partner</h4>
            <div style={{ display: "flex", gap: 16 }}>
              <TextInput id="pt-name" labelText="Name" value={p.name} onChange={(e) => setP((x) => ({ ...x, name: e.target.value }))} />
              <TextInput id="pt-coa" labelText="COA no" value={p.coaRegNo} onChange={(e) => setP((x) => ({ ...x, coaRegNo: e.target.value }))} />
              <TextInput id="pt-pan" labelText="PAN" value={p.pan} onChange={(e) => setP((x) => ({ ...x, pan: e.target.value }))} />
              <TextInput id="pt-din" labelText="DIN" value={p.din} onChange={(e) => setP((x) => ({ ...x, din: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <TextInput id="pt-email" labelText="Email" type="email" value={p.email} onChange={(e) => setP((x) => ({ ...x, email: e.target.value }))} />
              <TextInput id="pt-phone" labelText="Phone" value={p.phone1} onChange={(e) => setP((x) => ({ ...x, phone1: e.target.value }))} />
              <TextInput id="pt-city" labelText="City" value={p.city} onChange={(e) => setP((x) => ({ ...x, city: e.target.value }))} />
              <Select id="pt-state" labelText="State" value={p.state} onChange={(e) => setP((x) => ({ ...x, state: e.target.value, district: "" }))}>
                {STATES.map((s) => <SelectItem key={s} value={s} text={s} />)}
              </Select>
              {districts.length > 0 ? (
                <Select id="pt-dist" labelText="District" value={p.district} onChange={(e) => setP((x) => ({ ...x, district: e.target.value }))}>
                  <SelectItem value="" text="Select…" />
                  {districts.map((d) => <SelectItem key={d} value={d} text={d} />)}
                </Select>
              ) : (
                <TextInput id="pt-dist" labelText="District" value={p.district} onChange={(e) => setP((x) => ({ ...x, district: e.target.value }))} />
              )}
            </div>
            <Button
              disabled={!p.name || add.isPending}
              onClick={() =>
                add.mutate({
                  name: p.name,
                  coaRegNo: p.coaRegNo,
                  pan: p.pan,
                  din: p.din,
                  email: p.email,
                  phone1Type: "MOBILE",
                  phone1: p.phone1,
                  city: p.city,
                  state: p.state,
                  district: p.district,
                })
              }
            >
              {add.isPending ? "Adding…" : "Add partner"}
            </Button>
          </Stack>
        </Tile>
      )}
    </div>
  );
}
