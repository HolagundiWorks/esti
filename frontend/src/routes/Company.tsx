import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  type FirmType,
  type GstType,
  GstSystem,
  ORG_MODE_LABEL,
  PhoneType,
  STATES,
  districtsFor,
  planAllows,
} from "@esti/contracts";
import { type ChangeEvent, useEffect, useState } from "react";
import { AiStudioSettingsPanel } from "../components/company/AiStudioSettingsPanel.js";
import { LicensePanel } from "../components/company/LicensePanel.js";
import { MigrationPanel } from "../components/company/MigrationPanel.js";
import { useEdition } from "../lib/edition.js";
import { StorageSettingsPanel } from "../components/company/StorageSettingsPanel.js";
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

// Visually-hidden native file input (styled component, not a raw control tag).
const HiddenFileInput = styled("input")({ display: "none" });

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
  const { community } = useEdition();
  const { canFirmAdmin } = useCapabilities();
  const { authorizedFetch } = useUploadAuth();
  const isOwner = canFirmAdmin;
  const utils = trpc.useUtils();
  const firmQ = trpc.firm.get.useQuery();
  const settingsQ = trpc.settings.get.useQuery();
  // Plan is licence-derived (Phase B) — gate feature panels off the licence.
  const licenseQ = trpc.license.status.useQuery();
  const licensePlan = licenseQ.data?.plan ?? "LITE";
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
    <Stack spacing={3}>
      <PageHeader
        title="Company profile"
        description={isOwner ? undefined : "Read-only — only the owner can edit."}
      />
      {msg && (
        <Alert severity="success" onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Paper className="esti-form-panel--wide" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            id="co-name"
            label="Company name"
            fullWidth
            value={f.companyName}
            onChange={set("companyName")}
            disabled={!isOwner}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
            <TextField
              id="co-type"
              select
              label="Firm type"
              value={f.firmType}
              onChange={set("firmType")}
              disabled={!isOwner}
              sx={{ flex: 1, minWidth: 160 }}
            >
              <MenuItem value="SOLO">Solo</MenuItem>
              <MenuItem value="PARTNERSHIP">Partnership</MenuItem>
            </TextField>
            {firmQ.data?.logoUrl && (
              <img src={firmQ.data.logoUrl} alt="logo" className="esti-firm-logo" />
            )}
            <Button variant="outlined" component="label" disabled={!isOwner}>
              Upload logo
              <HiddenFileInput
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file);
                  e.target.value = "";
                }}
              />
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              id="co-gst"
              select
              label="GST type (sets invoice GST)"
              value={f.gstType}
              onChange={set("gstType")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            >
              {Object.values(GstSystem).map((g) => (
                <MenuItem key={g} value={g}>{GST_LABEL[g] ?? g}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="co-gstin"
              label="GSTIN"
              value={f.gstin}
              onChange={set("gstin")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                id="co-tds"
                checked={f.tdsApplicableDefault}
                disabled={!isOwner}
                onChange={(e) =>
                  setF((p) => ({ ...p, tdsApplicableDefault: e.target.checked }))
                }
              />
            }
            label="TDS declaration — clients deduct TDS u/s 194J (10%)"
          />

          <Typography variant="subtitle1" component="h3">
            {f.firmType === "SOLO" ? "Architect" : "Primary signatory"}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              id="co-arch"
              label="Architect name"
              value={f.architectName}
              onChange={set("architectName")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-coa"
              label="COA registration no"
              value={f.coaRegNo}
              onChange={set("coaRegNo")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-pan"
              label="PAN"
              value={f.pan}
              onChange={set("pan")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              id="co-email"
              label="Email"
              type="email"
              value={f.email}
              onChange={set("email")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-p1t"
              select
              label="Phone 1 type"
              value={f.phone1Type}
              onChange={set("phone1Type")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            >
              {PhoneType.options.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="co-p1"
              label="Phone 1"
              value={f.phone1}
              onChange={set("phone1")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-p2t"
              select
              label="Phone 2 type"
              value={f.phone2Type}
              onChange={set("phone2Type")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            >
              {PhoneType.options.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="co-p2"
              label="Phone 2"
              value={f.phone2}
              onChange={set("phone2")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Typography variant="subtitle1" component="h3">Address</Typography>
          <TextField
            id="co-a1"
            label="Address line 1"
            fullWidth
            value={f.addressLine1}
            onChange={set("addressLine1")}
            disabled={!isOwner}
          />
          <TextField
            id="co-a2"
            label="Address line 2"
            fullWidth
            value={f.addressLine2}
            onChange={set("addressLine2")}
            disabled={!isOwner}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              id="co-city"
              label="City"
              value={f.city}
              onChange={set("city")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-pin"
              label="Pincode"
              value={f.pincode}
              onChange={set("pincode")}
              disabled={!isOwner}
              sx={{ flex: 1 }}
            />
            <TextField
              id="co-state"
              select
              label="State"
              value={f.state}
              onChange={(e) =>
                setF((p) => ({ ...p, state: e.target.value, district: "" }))
              }
              disabled={!isOwner}
              sx={{ flex: 1 }}
            >
              {STATES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            {districts.length > 0 ? (
              <TextField
                id="co-dist"
                select
                label="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">Select…</MenuItem>
                {districts.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                id="co-dist"
                label="District"
                value={f.district}
                onChange={set("district")}
                disabled={!isOwner}
                sx={{ flex: 1 }}
              />
            )}
          </Stack>

          <Box>
            <Button
              variant="contained"
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
          </Box>
        </Stack>
      </Paper>

      {f.firmType === "PARTNERSHIP" && <Partners isOwner={isOwner} />}

      <Paper className="esti-form-panel--wide" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">Team &amp; HR module</Typography>
          <Typography variant="body2">
            Operating mode for your office: <strong>{ORG_MODE_LABEL[(settingsQ.data?.orgMode as "SOLO" | "STUDIO") ?? "STUDIO"]}</strong>.
            Team mode is always active and includes roster, assignments,
            attendance, workload visibility, and ASPRF.
          </Typography>
          <Alert severity="success" icon={false}>
            <strong>Team mode active</strong> — The workspace runs with team navigation, workload, HR, attendance and performance modules enabled.
          </Alert>
          {hrStatusQ.data?.archives && hrStatusQ.data.archives.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle1" component="h3">Archive history</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date / Reason</TableCell>
                      <TableCell>Summary</TableCell>
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
              </Box>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper className="esti-form-panel--wide" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">PMC module</Typography>
          <Typography variant="body2">
            Project management for site coordination — construction inbox, snag register, site
            instructions, and monthly progress reports. Enable per project in Project settings.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                id="pmc-toggle"
                checked={settingsQ.data?.pmcEnabled ?? false}
                disabled={!isOwner || setPmc.isPending || settingsQ.isLoading}
                onChange={(e) => setPmc.mutate({ pmcEnabled: e.target.checked })}
              />
            }
            label="Enable PMC module"
          />
          {!isOwner && <Typography variant="body2">Only the owner can change this.</Typography>}
        </Stack>
      </Paper>

      {isOwner && !community && <LicensePanel />}
      {isOwner && <MigrationPanel />}
      {isOwner && <EscalationSettingsPanel />}
      {isOwner && <UploadSecurityPanel />}
      {isOwner && !user?.isDemo && <AiStudioSettingsPanel isEnterprise={planAllows(licensePlan, "aiByoApi")} />}
      {isOwner && planAllows(licensePlan, "byos") && <StorageSettingsPanel />}
      {isOwner && <ConnectedDevicesPanel />}
      {isOwner && <ReleaseMetadataPanel />}
      {isOwner && <DataTools />}
    </Stack>
  );
}
