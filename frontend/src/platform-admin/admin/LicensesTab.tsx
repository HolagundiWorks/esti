import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import MoreVert from "@mui/icons-material/MoreVert";
import { licensingPlanLabel } from "@esti/contracts";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type Licenses = Awaited<ReturnType<typeof trpc.admin.licenses.list.query>>;
type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;
type Detail = Awaited<ReturnType<typeof trpc.admin.licenses.get.query>>;

const STATUS_TAG: Record<string, string> = {
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

  const [detail, setDetail] = useState<Detail | null>(null);

  const [menu, setMenu] = useState<{ anchor: HTMLElement; license: Licenses[number] } | null>(null);

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

  const selectedProduct = products.find((p) => p.id === productId);
  const plansForProduct = selectedProduct?.plans ?? [];
  const singlePlan = selectedProduct?.code === "AORMS" || plansForProduct.length <= 1;

  useEffect(() => {
    const p = products.find((x) => x.id === productId);
    if (p?.plans[0]) setPlanId(p.plans[0].id);
  }, [productId, products]);

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

  async function openDetail(licenseId: string) {
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  async function deactivateDevice(deviceRowId: string, licenseId: string) {
    await trpc.admin.licenses.deactivateDevice.mutate({ deviceRowId });
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  function closeMenu() {
    setMenu(null);
  }

  const columns: GridColDef<Licenses[number]>[] = [
    { field: "key", headerName: "Key", flex: 1.4, minWidth: 200 },
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 1, minWidth: 120 },
    {
      field: "planCode",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
      valueGetter: () => licensingPlanLabel(),
      renderCell: () => licensingPlanLabel(),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
      ),
    },
    {
      field: "expiresAt",
      headerName: "Expires",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => fmtDate(p.row.expiresAt),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 70,
      align: "right",
      renderCell: (p) => (
        <IconButton
          aria-label="License actions"
          size="small"
          onClick={(e) => setMenu({ anchor: e.currentTarget, license: p.row })}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const deviceColumns: GridColDef<Detail["devices"][number]>[] = [
    { field: "deviceId", headerName: "Device", flex: 1.2, minWidth: 160 },
    { field: "name", headerName: "Name", flex: 1, minWidth: 120, valueGetter: (v) => v ?? "—" },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.status === "ACTIVE" ? "green" : "red"} label={p.row.status} />
      ),
    },
    {
      field: "lastSeenAt",
      headerName: "Last seen",
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) => (p.row.lastSeenAt ? new Date(p.row.lastSeenAt).toLocaleString() : "—"),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (p) =>
        p.row.status === "ACTIVE" && detail ? (
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={() => deactivateDevice(p.row.id, detail.license.id)}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ];

  const eventColumns: GridColDef<Detail["events"][number]>[] = [
    {
      field: "at",
      headerName: "When",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) => new Date(p.row.at).toLocaleString(),
    },
    { field: "type", headerName: "Event", flex: 1, minWidth: 140 },
    { field: "actor", headerName: "Actor", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Button
          variant="contained"
          onClick={() => {
            setNewKey(null);
            setError(null);
            setCreateOpen(true);
          }}
        >
          New license
        </Button>
      </Box>

      {newKey && (
        <Alert severity="success" onClose={() => setNewKey(null)}>
          License created — key: {newKey}
        </Alert>
      )}

      <DataGrid
        rows={licenses}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Menu anchorEl={menu?.anchor ?? null} open={menu !== null} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menu) void openDetail(menu.license.id);
            closeMenu();
          }}
        >
          Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) {
              setExtendId(menu.license.id);
              setExtendDate("");
            }
            closeMenu();
          }}
        >
          Extend / set expiry…
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) void setStatus(menu.license.id, "ACTIVE");
            closeMenu();
          }}
        >
          Reinstate (Active)
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) void setStatus(menu.license.id, "SUSPENDED");
            closeMenu();
          }}
        >
          Suspend
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (menu) void setStatus(menu.license.id, "REVOKED");
            closeMenu();
          }}
          sx={{ color: "error.main" }}
        >
          Revoke
        </MenuItem>
      </Menu>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New license</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="lic-org"
              select
              label="Organization"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              fullWidth
            >
              {orgs.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="lic-product"
              select
              label="Product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              fullWidth
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            {singlePlan ? (
              <Typography variant="body2" color="text.secondary">
                Plan: {licensingPlanLabel()}
              </Typography>
            ) : (
              <TextField
                id="lic-plan"
                select
                label="Plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                fullWidth
              >
                {plansForProduct.map((pl) => (
                  <MenuItem key={pl.id} value={pl.id}>
                    {pl.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              id="lic-expires"
              type="date"
              label="Expires (optional — blank = perpetual)"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!orgId || !productId || !planId}
            onClick={create}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={extendId !== null} onClose={() => setExtendId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Extend / set expiry</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              id="ext-date"
              type="date"
              label="New expiry (blank = perpetual)"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setExtendId(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={doExtend}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detail !== null} onClose={() => setDetail(null)} fullWidth maxWidth="lg">
        <DialogTitle>{detail ? `License ${detail.license.key}` : ""}</DialogTitle>
        {detail && (
          <DialogContent>
            <Stack spacing={4} sx={{ mt: 1 }}>
              <Stack spacing={1}>
                <Typography variant="h6" component="h4">
                  Devices
                </Typography>
                <DataGrid
                  rows={detail.devices}
                  columns={deviceColumns}
                  getRowId={(r) => r.id}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                  localeText={{ noRowsLabel: "No devices activated." }}
                />
              </Stack>

              <Stack spacing={1}>
                <Typography variant="h6" component="h4">
                  Event log
                </Typography>
                <DataGrid
                  rows={detail.events}
                  columns={eventColumns}
                  getRowId={(r) => r.id}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </Stack>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button variant="contained" onClick={() => setDetail(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
