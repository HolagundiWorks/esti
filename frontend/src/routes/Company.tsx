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
  ORG_MODE_LABEL,
  PhoneType,
  STATES,
  districtsFor,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { AiStudioSettingsPanel } from "../components/company/AiStudioSettingsPanel.js";
import { ConnectedDevicesPanel } from "../components/company/ConnectedDevicesPanel.js";
import { DataTools } from "../components/company/DataTools.js";
import { EscalationSettingsPanel } from "../components/company/EscalationSettingsPanel.js";
import { Partners } from "../components/company/PartnersPanel.js";
import { ReleaseMetadataPanel } from "../components/company/ReleaseMetadataPanel.js";
import { UploadSecurityPanel } from "../components/company/UploadSecurityPanel.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAuth } from "../lib/auth.js";
import { useCapabilities } from "../lib/capabilities.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const GST_LABEL: Record<string, string> = {
  [GstSystem.NOT_APPLICABLE]: "NA (not registered)",
  [GstSystem.COMPOSITION]: "Composition (6%, bill of supply)",
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
  const { canFirmAdmin } = useCapabilities();
  const { authorizedFetch } = useUploadAuth();
  const isOwner = canFirmAdmin;
  const utils = trpc.useUtils();
  const firmQ = trpc.firm.get.useQuery();
  const settingsQ = trpc.settings.get.useQuery();
  const hrStatusQ = trpc.settings.hrModuleStatus.useQuery();

  const setPmc = trpc.settings.setPmcEnabled.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("PMC module setting updated.");
    },
  });

  const [f, setF] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (firmQ.data) {
      setF(
        (p) =>
          ({
            ...p,
            ...Object.fromEntries(
              Object.keys(EMPTY).map((k) => [
                k,
                (firmQ.data as Record<string, unknown>)[k] ??
                  EMPTY[k as keyof Form],
              ]),
            ),
          }) as Form,
      );
    }
  }, [firmQ.data]);

  const update = trpc.firm.update.useMutation({
    onSuccess: () => {
      utils.firm.get.invalidate();
      setMsg("Company profile saved");
    },
  });

  async function uploadLogo(file: File) {
    try {
      const res = await authorizedFetch("/upload/firm-logo", (fd) => {
        fd.append("file", file);
      });
      if (res.ok) {
        utils.firm.get.invalidate();
        setMsg("Logo uploaded");
      } else {
        const err =
          (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
        setMsg(`Logo upload failed: ${err}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Logo upload cancelled");
    }
  }

  const districts = districtsFor(f.state);

  return (
    <Stack gap={6}>
      <PageHeader
        title="Company profile"
        description={isOwner ? undefined : "Read-only — only the owner can edit."}
      />
      {msg && (
        <InlineNotification
          kind="success"
          title="Saved"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      <Tile className="esti-form-panel--wide">
        <Stack gap={5}>
          <TextInput
            id="co-name"
            labelText="Company name"
            value={f.companyName}
            onChange={set("companyName")}
            disabled={!isOwner}
          />

          <Stack orientation="horizontal" gap={5}>
            <Select
              id="co-type"
              labelText="Firm type"
              value={f.firmType}
              onChange={set("firmType")}
              disabled={!isOwner}
            >
              <SelectItem value="SOLO" text="Solo" />
              <SelectItem value="PARTNERSHIP" text="Partnership" />
            </Select>
            {firmQ.data?.logoUrl && (
              <img src={firmQ.data.logoUrl} alt="logo" className="esti-firm-logo" />
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
          </Stack>

          <Stack orientation="horizontal" gap={5}>
            <Select
              id="co-gst"
              labelText="GST type (sets invoice GST)"
              value={f.gstType}
              onChange={set("gstType")}
              disabled={!isOwner}
            >
              {Object.values(GstSystem).map((g) => (
                <SelectItem key={g} value={g} text={GST_LABEL[g] ?? g} />
              ))}
            </Select>
            <TextInput
              id="co-gstin"
              labelText="GSTIN"
              value={f.gstin}
              onChange={set("gstin")}
              disabled={!isOwner}
            />
          </Stack>
          <Toggle
            id="co-tds"
            labelText="TDS declaration — clients deduct TDS u/s 194J (10%)"
            labelA="No TDS"
            labelB="TDS deducted"
            toggled={f.tdsApplicableDefault}
            disabled={!isOwner}
            onToggle={(checked) =>
              setF((p) => ({ ...p, tdsApplicableDefault: checked }))
            }
          />

          <h3>{f.firmType === "SOLO" ? "Architect" : "Primary signatory"}</h3>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-arch"
              labelText="Architect name"
              value={f.architectName}
              onChange={set("architectName")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-coa"
              labelText="COA registration no"
              value={f.coaRegNo}
              onChange={set("coaRegNo")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-pan"
              labelText="PAN"
              value={f.pan}
              onChange={set("pan")}
              disabled={!isOwner}
            />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-email"
              labelText="Email"
              type="email"
              value={f.email}
              onChange={set("email")}
              disabled={!isOwner}
            />
            <Select
              id="co-p1t"
              labelText="Phone 1 type"
              value={f.phone1Type}
              onChange={set("phone1Type")}
              disabled={!isOwner}
            >
              {PhoneType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput
              id="co-p1"
              labelText="Phone 1"
              value={f.phone1}
              onChange={set("phone1")}
              disabled={!isOwner}
            />
            <Select
              id="co-p2t"
              labelText="Phone 2 type"
              value={f.phone2Type}
              onChange={set("phone2Type")}
              disabled={!isOwner}
            >
              {PhoneType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput
              id="co-p2"
              labelText="Phone 2"
              value={f.phone2}
              onChange={set("phone2")}
              disabled={!isOwner}
            />
          </Stack>

          <h3>Address</h3>
          <TextInput
            id="co-a1"
            labelText="Address line 1"
            value={f.addressLine1}
            onChange={set("addressLine1")}
            disabled={!isOwner}
          />
          <TextInput
            id="co-a2"
            labelText="Address line 2"
            value={f.addressLine2}
            onChange={set("addressLine2")}
            disabled={!isOwner}
          />
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="co-city"
              labelText="City"
              value={f.city}
              onChange={set("city")}
              disabled={!isOwner}
            />
            <TextInput
              id="co-pin"
              labelText="Pincode"
              value={f.pincode}
              onChange={set("pincode")}
              disabled={!isOwner}
            />
            <Select
              id="co-state"
              labelText="State"
              value={f.state}
              onChange={(e) =>
                setF((p) => ({ ...p, state: e.target.value, district: "" }))
              }
              disabled={!isOwner}
            >
              {STATES.map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
            {districts.length > 0 ? (
              <Select
                id="co-dist"
                labelText="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
              >
                <SelectItem value="" text="Select…" />
                {districts.map((d) => (
                  <SelectItem key={d} value={d} text={d} />
                ))}
              </Select>
            ) : (
              <TextInput
                id="co-dist"
                labelText="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
              />
            )}
          </Stack>

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

      <Tile className="esti-form-panel--wide">
        <Stack gap={5}>
          <h2>Team &amp; HR module</h2>
          <p>
            Operating mode for your office: <strong>{ORG_MODE_LABEL[(settingsQ.data?.orgMode as "SOLO" | "STUDIO") ?? "STUDIO"]}</strong>.
            Team mode is always active and includes roster, assignments,
            attendance, workload visibility, and ASPRF.
          </p>
          <InlineNotification
            kind="success"
            title="Team mode active"
            subtitle="The workspace runs with team navigation, workload, HR, attendance and performance modules enabled."
            lowContrast
            hideCloseButton
          />
          {hrStatusQ.data?.archives && hrStatusQ.data.archives.length > 0 && (
            <Stack gap={2}>
              <h3>Archive history</h3>
              <Table size="sm" useZebraStyles={false}>
                <TableHead>
                  <TableRow>
                    <TableHeader>Date / Reason</TableHeader>
                    <TableHeader>Summary</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hrStatusQ.data.archives.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {new Date(a.createdAt).toLocaleString("en-IN")}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </TableCell>
                      <TableCell>
                        {a.tasksRemapped} tasks · {a.membersArchived} members
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </Stack>
      </Tile>

      <Tile className="esti-form-panel--wide">
        <Stack gap={5}>
          <h2>PMC module</h2>
          <p>
            Project management for site coordination — construction inbox, snag register, site
            instructions, and monthly progress reports. Enable per project in Project settings.
          </p>
          <Toggle
            id="pmc-toggle"
            labelText="Enable PMC module"
            labelA="Off"
            labelB="On"
            toggled={settingsQ.data?.pmcEnabled ?? false}
            disabled={!isOwner || setPmc.isPending || settingsQ.isLoading}
            onToggle={(checked) => setPmc.mutate({ pmcEnabled: checked })}
          />
          {!isOwner && <p>Only the owner can change this.</p>}
        </Stack>
      </Tile>

      {isOwner && <EscalationSettingsPanel />}
      {isOwner && <UploadSecurityPanel />}
      {isOwner && !user?.isDemo && <AiStudioSettingsPanel />}
      {isOwner && <ConnectedDevicesPanel />}
      {isOwner && <ReleaseMetadataPanel />}
      {isOwner && <DataTools />}
    </Stack>
  );
}

