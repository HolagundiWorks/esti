import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Licenses = Awaited<ReturnType<typeof trpc.admin.licenses.list.query>>;
type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;
type Detail = Awaited<ReturnType<typeof trpc.admin.licenses.get.query>>;

const STATUS_TAG: Record<string, "green" | "teal" | "gray" | "red" | "cool-gray"> = {
  ACTIVE: "green",
  TRIAL: "teal",
  SUSPENDED: "cool-gray",
  REVOKED: "red",
  EXPIRED: "gray",
};
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const toIso = (yyyymmdd: string) =>
  yyyymmdd ? new Date(`${yyyymmdd}T00:00:00.000Z`).toISOString() : null;

export default function LicensesTab() {
  const [licenses, setLicenses] = useState<Licenses>([]);
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [products, setProducts] = useState<Products>([]);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [productId, setProductId] = useState("");
  const [planId, setPlanId] = useState("");
  const [expires, setExpires] = useState("");

  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");

  // Change plan (upgrade / downgrade).
  const [planChange, setPlanChange] = useState<{ id: string; productCode: string } | null>(null);
  const [changePlanId, setChangePlanId] = useState("");

  const [detail, setDetail] = useState<Detail | null>(null);

  async function load() {
    setLicenses(await trpc.admin.licenses.list.query());
  }
  useEffect(() => {
    void load();
    void trpc.admin.orgs.list.query().then((o) => {
      setOrgs(o);
      if (o[0]) setOrgId(o[0].id);
    });
    void trpc.admin.products.list.query().then((p) => {
      setProducts(p);
      if (p[0]) {
        setProductId(p[0].id);
        if (p[0].plans[0]) setPlanId(p[0].plans[0].id);
      }
    });
  }, []);

  const plansForProduct = products.find((p) => p.id === productId)?.plans ?? [];

  async function create() {
    setError(null);
    try {
      const lic = await trpc.admin.licenses.create.mutate({
        orgId,
        productId,
        planId,
        expiresAt: toIso(expires),
      });
      setCreateOpen(false);
      setExpires("");
      setNewKey(lic.key);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function setStatus(licenseId: string, status: "ACTIVE" | "SUSPENDED" | "REVOKED") {
    await trpc.admin.licenses.setStatus.mutate({ licenseId, status });
    await load();
  }

  async function doExtend() {
    if (!extendId) return;
    await trpc.admin.licenses.extend.mutate({ licenseId: extendId, expiresAt: toIso(extendDate) });
    setExtendId(null);
    setExtendDate("");
    await load();
  }

  const plansForChange =
    products.find((p) => p.code === planChange?.productCode)?.plans ?? [];

  async function doChangePlan() {
    if (!planChange || !changePlanId) return;
    setError(null);
    try {
      await trpc.admin.licenses.changePlan.mutate({ licenseId: planChange.id, planId: changePlanId });
      setPlanChange(null);
      setChangePlanId("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function openDetail(licenseId: string) {
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  async function deactivateDevice(deviceRowId: string, licenseId: string) {
    await trpc.admin.licenses.deactivateDevice.mutate({ deviceRowId });
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  return (
    <Stack gap={5}>
      <div>
        <Button
          onClick={() => {
            setNewKey(null);
            setError(null);
            setCreateOpen(true);
          }}
        >
          New license
        </Button>
      </div>

      {newKey && (
        <InlineNotification
          kind="success"
          lowContrast
          title="License created — key:"
          subtitle={newKey}
          onCloseButtonClick={() => setNewKey(null)}
        />
      )}

      <Table size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>Key</TableHeader>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Plan</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Expires</TableHeader>
            <TableHeader>{""}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {licenses.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{l.key}</TableCell>
              <TableCell>{l.orgName}</TableCell>
              <TableCell>{l.productCode}</TableCell>
              <TableCell>{l.planCode}</TableCell>
              <TableCell>
                <Tag type={STATUS_TAG[l.status] ?? "gray"} size="sm">
                  {l.status}
                </Tag>
              </TableCell>
              <TableCell>{fmtDate(l.expiresAt)}</TableCell>
              <TableCell>
                <OverflowMenu aria-label="License actions" flipped>
                  <OverflowMenuItem itemText="Details" onClick={() => openDetail(l.id)} />
                  <OverflowMenuItem
                    itemText="Change plan…"
                    onClick={() => {
                      setPlanChange({ id: l.id, productCode: l.productCode });
                      const plans =
                        products.find((p) => p.code === l.productCode)?.plans ?? [];
                      setChangePlanId(plans.find((pl) => pl.code !== l.planCode)?.id ?? plans[0]?.id ?? "");
                    }}
                  />
                  <OverflowMenuItem
                    itemText="Extend / set expiry…"
                    onClick={() => {
                      setExtendId(l.id);
                      setExtendDate("");
                    }}
                  />
                  <OverflowMenuItem itemText="Reinstate (Active)" onClick={() => setStatus(l.id, "ACTIVE")} />
                  <OverflowMenuItem itemText="Suspend" onClick={() => setStatus(l.id, "SUSPENDED")} />
                  <OverflowMenuItem
                    itemText="Revoke"
                    isDelete
                    hasDivider
                    onClick={() => setStatus(l.id, "REVOKED")}
                  />
                </OverflowMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create license */}
      <Modal
        open={createOpen}
        modalHeading="New license"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!orgId || !productId || !planId}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={create}
      >
        <Stack gap={5}>
          <Select id="lic-org" labelText="Organization" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id} text={o.name} />
            ))}
          </Select>
          <Select
            id="lic-product"
            labelText="Product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              setPlanId(p?.plans[0]?.id ?? "");
            }}
          >
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.name} />
            ))}
          </Select>
          <Select id="lic-plan" labelText="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plansForProduct.map((pl) => (
              <SelectItem key={pl.id} value={pl.id} text={pl.name} />
            ))}
          </Select>
          <TextInput
            id="lic-expires"
            type="date"
            labelText="Expires (optional — blank = perpetual)"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
          {error && <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />}
        </Stack>
      </Modal>

      {/* Extend */}
      <Modal
        open={extendId !== null}
        modalHeading="Extend / set expiry"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setExtendId(null)}
        onRequestSubmit={doExtend}
      >
        <TextInput
          id="ext-date"
          type="date"
          labelText="New expiry (blank = perpetual)"
          value={extendDate}
          onChange={(e) => setExtendDate(e.target.value)}
        />
      </Modal>

      {/* Change plan (upgrade / downgrade) */}
      <Modal
        open={planChange !== null}
        modalHeading="Change plan"
        primaryButtonText="Apply"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!changePlanId}
        onRequestClose={() => setPlanChange(null)}
        onRequestSubmit={doChangePlan}
      >
        <Stack gap={5}>
          <p>
            Move this licence to another {planChange?.productCode} plan. Seat/device limits adopt
            the new plan; the node applies it on its next licence refresh.
          </p>
          <Select
            id="change-plan"
            labelText="New plan"
            value={changePlanId}
            onChange={(e) => setChangePlanId(e.target.value)}
          >
            {plansForChange.map((pl) => (
              <SelectItem key={pl.id} value={pl.id} text={pl.name} />
            ))}
          </Select>
          {error && <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />}
        </Stack>
      </Modal>

      {/* Details: devices + event log */}
      <Modal
        open={detail !== null}
        passiveModal
        modalHeading={detail ? `License ${detail.license.key}` : ""}
        onRequestClose={() => setDetail(null)}
      >
        {detail && (
          <Stack gap={6}>
            <Stack gap={2}>
              <h4>Devices</h4>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Device</TableHeader>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Last seen</TableHeader>
                    <TableHeader>{""}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.devices.length === 0 && (
                    <TableRow>
                      <TableCell>No devices activated.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  )}
                  {detail.devices.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.deviceId}</TableCell>
                      <TableCell>{d.name ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={d.status === "ACTIVE" ? "green" : "red"} size="sm">
                          {d.status}
                        </Tag>
                      </TableCell>
                      <TableCell>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        {d.status === "ACTIVE" && (
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            onClick={() => deactivateDevice(d.id, detail.license.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>

            <Stack gap={2}>
              <h4>Event log</h4>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>When</TableHeader>
                    <TableHeader>Event</TableHeader>
                    <TableHeader>Actor</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell>{new Date(ev.at).toLocaleString()}</TableCell>
                      <TableCell>{ev.type}</TableCell>
                      <TableCell>{ev.actor ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
