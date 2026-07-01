import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { trpc } from "../lib/trpc";

type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;

export default function OrgsTab() {
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loginDomain, setLoginDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOrgs(await trpc.admin.orgs.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    try {
      await trpc.admin.orgs.create.mutate({
        name,
        slug: slug || undefined,
        billingEmail: email || undefined,
        loginDomain: loginDomain || undefined,
      });
      setOpen(false);
      setName("");
      setSlug("");
      setEmail("");
      setLoginDomain("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Stack gap={5}>
      <div>
        <Button onClick={() => setOpen(true)}>New organization</Button>
      </div>
      <Table size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>AORMS ID</TableHeader>
            <TableHeader>Login domain</TableHeader>
            <TableHeader>Slug</TableHeader>
            <TableHeader>Billing email</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {orgs.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.name}</TableCell>
              <TableCell>{o.publicId ?? "—"}</TableCell>
              <TableCell>{o.loginDomain ?? "—"}</TableCell>
              <TableCell>{o.slug}</TableCell>
              <TableCell>{o.billingEmail ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={open}
        modalHeading="New organization"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!name}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={create}
      >
        <Stack gap={5}>
          <TextInput id="org-name" labelText="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput
            id="org-slug"
            labelText="Slug (optional — derived from name)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <TextInput
            id="org-email"
            labelText="Billing email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            id="org-login-domain"
            labelText="Login domain (optional)"
            placeholder="acme.in"
            helperText="Lets members sign in by typing this domain at Step 1."
            value={loginDomain}
            onChange={(e) => setLoginDomain(e.target.value)}
          />
          {error && <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}
