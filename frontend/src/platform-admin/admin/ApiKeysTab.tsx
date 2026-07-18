import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type Keys = Awaited<ReturnType<typeof trpc.admin.apiKeys.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;
type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<Keys>([]);
  const [products, setProducts] = useState<Products>([]);
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [label, setLabel] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setKeys(await trpc.admin.apiKeys.list.query());
  }
  useEffect(() => {
    void load();
    void trpc.admin.products.list.query().then((p) => {
      setProducts(p);
      if (p[0]) setProductId(p[0].id);
    });
    void trpc.admin.orgs.list.query().then(setOrgs);
  }, []);

  async function generate() {
    setError(null);
    try {
      const r = await trpc.admin.apiKeys.generate.mutate({
        productId,
        label,
        orgId: orgId || null,
      });
      setGenerated(r.apiKey);
      setLabel("");
      setOrgId("");
      setOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function revoke(id: string) {
    await trpc.admin.apiKeys.revoke.mutate({ id });
    await load();
  }

  const columns: GridColDef<Keys[number]>[] = [
    { field: "productCode", headerName: "Product", flex: 1, minWidth: 140 },
    {
      field: "orgName",
      headerName: "Org",
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (p) =>
        p.row.orgName ? (
          <StatusDot color="blue" label={p.row.orgName} />
        ) : (
          <StatusDot color="gray" label="Product-wide" />
        ),
    },
    { field: "label", headerName: "Label", flex: 1.2, minWidth: 160 },
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
      field: "lastUsedAt",
      headerName: "Last used",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) =>
        p.row.lastUsedAt ? new Date(p.row.lastUsedAt).toLocaleString() : "—",
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) =>
        p.row.status === "ACTIVE" ? (
          <Button variant="text" color="error" size="small" onClick={() => revoke(p.row.id)}>
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Button
          variant="contained"
          onClick={() => {
            setGenerated(null);
            setError(null);
            setOpen(true);
          }}
        >
          Generate API key
        </Button>
      </Box>

      {generated && (
        <Alert severity="success" onClose={() => setGenerated(null)}>
          API key created — copy it now (shown once): {generated}
        </Alert>
      )}

      <DataGrid
        rows={keys}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Dialog aria-labelledby="api-keys-tab-generate-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="api-keys-tab-generate-title">Generate API key</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="ak-product"
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
            <TextField
              id="ak-org"
              select
              label="Bind to organization"
              helperText="Recommended for a per-install key — it can then only act for this customer. Leave as product-wide only for a shared/legacy key."
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Product-wide (no org binding)</MenuItem>
              {orgs.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="ak-label"
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!productId || !label} onClick={generate}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
