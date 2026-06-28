import { useEffect, useState } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Keys = Awaited<ReturnType<typeof trpc.admin.apiKeys.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<Keys>([]);
  const [products, setProducts] = useState<Products>([]);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
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
  }, []);

  async function generate() {
    setError(null);
    try {
      const r = await trpc.admin.apiKeys.generate.mutate({ productId, label });
      setGenerated(r.apiKey);
      setLabel("");
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

  return (
    <Stack gap={5}>
      <div>
        <Button
          onClick={() => {
            setGenerated(null);
            setError(null);
            setOpen(true);
          }}
        >
          Generate API key
        </Button>
      </div>

      {generated && (
        <InlineNotification
          kind="success"
          lowContrast
          title="API key created — copy it now (shown once):"
          subtitle={generated}
          onCloseButtonClick={() => setGenerated(null)}
        />
      )}

      <Table size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>Product</TableHeader>
            <TableHeader>Label</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Last used</TableHeader>
            <TableHeader>{""}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.map((k) => (
            <TableRow key={k.id}>
              <TableCell>{k.productCode}</TableCell>
              <TableCell>{k.label}</TableCell>
              <TableCell>
                <Tag type={k.status === "ACTIVE" ? "green" : "red"} size="sm">
                  {k.status}
                </Tag>
              </TableCell>
              <TableCell>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</TableCell>
              <TableCell>
                {k.status === "ACTIVE" && (
                  <Button kind="danger--ghost" size="sm" onClick={() => revoke(k.id)}>
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={open}
        modalHeading="Generate API key"
        primaryButtonText="Generate"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!productId || !label}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={generate}
      >
        <Stack gap={5}>
          <Select
            id="ak-product"
            labelText="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.name} />
            ))}
          </Select>
          <TextInput id="ak-label" labelText="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          {error && <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}
