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

type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Members = Awaited<ReturnType<typeof trpc.admin.orgs.members.query>>;

const STATUS_TAG: Record<string, "green" | "teal" | "gray"> = {
  ACTIVE: "green",
  INVITED: "teal",
  LEFT: "gray",
};

export default function OrgsTab() {
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loginDomain, setLoginDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Member management for one org.
  const [manage, setManage] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Members>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  // Issue a portable certification to a member.
  const [certWho, setCertWho] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certNote, setCertNote] = useState<string | null>(null);

  async function load() {
    setOrgs(await trpc.admin.orgs.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  async function openMembers(org: { id: string; name: string }) {
    setManage(org);
    setMemberError(null);
    setInviteEmail("");
    setMembers(await trpc.admin.orgs.members.query({ orgId: org.id }));
  }

  async function reloadMembers() {
    if (manage) setMembers(await trpc.admin.orgs.members.query({ orgId: manage.id }));
  }

  async function setStatus(accountId: string, status: "ACTIVE" | "LEFT") {
    if (!manage) return;
    await trpc.admin.orgs.setMemberStatus.mutate({ orgId: manage.id, accountId, status });
    await reloadMembers();
  }

  async function invite() {
    if (!manage) return;
    setMemberError(null);
    try {
      await trpc.admin.orgs.inviteMember.mutate({ orgId: manage.id, email: inviteEmail });
      setInviteEmail("");
      await reloadMembers();
    } catch (e) {
      setMemberError((e as Error).message);
    }
  }

  async function issueCert() {
    setCertNote(null);
    if (!certWho || !certTitle) return;
    try {
      await trpc.admin.certifications.issue.mutate({
        accountPublicId: certWho,
        title: certTitle,
        issuer: certIssuer || undefined,
      });
      setCertTitle("");
      setCertIssuer("");
      setCertNote("Certification issued.");
    } catch (e) {
      setCertNote((e as Error).message);
    }
  }

  const certifiable = members.filter((m) => m.publicId);

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
            <TableHeader>Members</TableHeader>
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
              <TableCell>
                <Button kind="ghost" size="sm" onClick={() => openMembers({ id: o.id, name: o.name })}>
                  Manage
                </Button>
              </TableCell>
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

      <Modal
        open={manage !== null}
        modalHeading={`Members — ${manage?.name ?? ""}`}
        primaryButtonText="Done"
        onRequestClose={() => setManage(null)}
        onRequestSubmit={() => setManage(null)}
        passiveModal={false}
      >
        <Stack gap={5}>
          <Table size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>Email</TableHeader>
                <TableHeader>AORMS ID</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.accountId}>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.publicId ?? "—"}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[m.status] ?? "gray"}>{m.status}</Tag>
                  </TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      {m.status !== "ACTIVE" && (
                        <Button kind="ghost" size="sm" onClick={() => setStatus(m.accountId, "ACTIVE")}>
                          Approve
                        </Button>
                      )}
                      {m.status !== "LEFT" && (
                        <Button kind="ghost" size="sm" onClick={() => setStatus(m.accountId, "LEFT")}>
                          Remove
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack gap={3} orientation="horizontal">
            <TextInput
              id="invite-email"
              labelText="Invite an existing account by email"
              placeholder="person@firm.in"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button kind="tertiary" disabled={!inviteEmail} onClick={invite}>
              Invite
            </Button>
          </Stack>
          {memberError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={memberError === "account_not_found" ? "No account with that email — they must sign up first." : memberError}
              lowContrast
            />
          )}

          <Stack gap={3}>
            <h4 className="esti-label">Issue a certification</h4>
            <Stack gap={3} orientation="horizontal">
              <Select
                id="cert-who"
                labelText="To member"
                value={certWho}
                onChange={(e) => setCertWho(e.target.value)}
              >
                <SelectItem value="" text="Select a member…" />
                {certifiable.map((m) => (
                  <SelectItem key={m.accountId} value={m.publicId ?? ""} text={m.email} />
                ))}
              </Select>
              <TextInput
                id="cert-title"
                labelText="Title"
                placeholder="Registered Architect"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
              />
              <TextInput
                id="cert-issuer"
                labelText="Issuer (optional)"
                placeholder="Council of Architecture"
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
              />
              <Button kind="tertiary" disabled={!certWho || !certTitle} onClick={issueCert}>
                Issue
              </Button>
            </Stack>
            {certNote && (
              <InlineNotification kind="info" title="Certification" subtitle={certNote} lowContrast />
            )}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
