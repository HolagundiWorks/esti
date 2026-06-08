import {
  Button,
  Header,
  HeaderName,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const INV_TAG: Record<string, "blue" | "green"> = { ISSUED: "blue", PAID: "green" };
const AP_TAG: Record<string, "blue" | "green" | "magenta" | "red" | "cool-gray"> = {
  SENT: "blue",
  APPROVED: "green",
  REVISIONS: "magenta",
  REJECTED: "red",
  SUPERSEDED: "cool-gray",
};

export function Portal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const projectsQ = trpc.portal.myProjects.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQ = trpc.portal.projectDetail.useQuery({ projectId: openId ?? "" }, { enabled: !!openId });
  const d = detailQ.data;

  return (
    <>
      <Header aria-label="ESTI client portal">
        <HeaderName prefix="ESTI">Client portal</HeaderName>
        <Button kind="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => logout.mutate()}>
          Sign out
        </Button>
      </Header>
      <div style={{ padding: 32, marginTop: 48 }}>
        {!openId && (
          <>
            <h2>Your projects</h2>
            <p style={{ color: "var(--cds-text-secondary)", marginBottom: 16 }}>
              Read-only access to status, invoices, approvals and issued drawings.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {(projectsQ.data ?? []).length === 0 && <p>No projects yet.</p>}
              {(projectsQ.data ?? []).map((p) => (
                <Tile
                  key={p.id}
                  style={{ minWidth: 240, cursor: "pointer" }}
                  onClick={() => setOpenId(p.id)}
                >
                  <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{p.ref}</p>
                  <p style={{ fontSize: 18, fontWeight: 600 }}>{p.title}</p>
                  <Tag type="cool-gray">{p.status}</Tag>
                </Tile>
              ))}
            </div>
          </>
        )}

        {openId && d && (
          <>
            <Button kind="ghost" size="sm" onClick={() => setOpenId(null)}>
              ← All projects
            </Button>
            <h2 style={{ marginTop: 8 }}>{d.project.title}</h2>
            <p style={{ color: "var(--cds-text-secondary)" }}>
              {d.project.ref} · {d.project.projectType} · {d.project.jurisdiction} ·{" "}
              <Tag type="cool-gray">{d.project.status}</Tag>
            </p>

            <Section title="Stages">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Stage</TableHeader>
                    <TableHeader>Billing %</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.phases.map((ph) => (
                    <TableRow key={ph.code}>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billingPct}%</TableCell>
                      <TableCell>{ph.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Invoices">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Document</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.invoices.map((iv) => (
                    <TableRow key={iv.ref}>
                      <TableCell>{iv.ref}</TableCell>
                      <TableCell>{iv.documentKind}</TableCell>
                      <TableCell>{iv.dateInvoice ?? "—"}</TableCell>
                      <TableCell>{formatINR(iv.grandTotalPaise, { paise: false })}</TableCell>
                      <TableCell>
                        <Tag type={INV_TAG[iv.status] ?? "blue"}>{iv.status}</Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Approvals">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Sent</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.approvals.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.sentDate ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={AP_TAG[a.status] ?? "blue"}>{a.status}</Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Issued drawings">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Title</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.drawings.map((dr) => (
                    <TableRow key={dr.ref}>
                      <TableCell>{dr.ref}</TableCell>
                      <TableCell>{dr.title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <TableContainer title={title} style={{ marginTop: 24 }}>
      {children}
    </TableContainer>
  );
}
