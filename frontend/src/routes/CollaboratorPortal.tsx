import {
  Button,
  ClickableTile,
  Column,
  Content,
  Grid,
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
  Stack,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

export function CollaboratorPortal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const projectsQ = trpc.collab.myProjects.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQ = trpc.collab.projectDetail.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const d = detailQ.data;

  return (
    <>
      <Header aria-label="ESTI consultant portal">
        <HeaderName prefix="ESTI">Consultant portal</HeaderName>
        <Button
          kind="ghost"
          size="sm"
          style={{ marginLeft: "auto" }}
          onClick={() => logout.mutate()}
        >
          Sign out
        </Button>
      </Header>
      <Content>
        {!openId && (
          <>
            <h2>Your engagements</h2>
            <p style={{ marginBottom: 16 }}>
              Projects you are engaged on — status, stages, issued drawings and
              your fee balance.
            </p>
            <Grid>
              {(projectsQ.data ?? []).length === 0 && (
                <p>No engagements yet.</p>
              )}
              {(projectsQ.data ?? []).map((p) => {
                const balance = p.agreedFeePaise - p.paidPaise;
                return (
                  <Column key={p.id} sm={4} md={4} lg={4}>
                    <ClickableTile onClick={() => setOpenId(p.id)}>
                      <Stack gap={3}>
                        <p>{p.ref}</p>
                        <h3>{p.title}</h3>
                        <Tag type="cool-gray">{p.status}</Tag>
                        <p>Balance {formatINR(balance, { paise: false })}</p>
                      </Stack>
                    </ClickableTile>
                  </Column>
                );
              })}
            </Grid>
          </>
        )}

        {openId && d && (
          <>
            <Button kind="ghost" size="sm" onClick={() => setOpenId(null)}>
              ← All engagements
            </Button>
            <h2 style={{ marginTop: 8 }}>{d.project.title}</h2>
            <p>
              {d.project.ref} · {d.project.projectType} ·{" "}
              {d.project.jurisdiction} ·{" "}
              <Tag type="cool-gray">{d.project.status}</Tag>
            </p>

            <TableContainer title="Your engagement" style={{ marginTop: 16 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Scope</TableHeader>
                    <TableHeader>Agreed</TableHeader>
                    <TableHeader>Paid</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{d.engagement.scope ?? "—"}</TableCell>
                    <TableCell>
                      {formatINR(d.engagement.agreedFeePaise, { paise: false })}
                    </TableCell>
                    <TableCell>
                      {formatINR(d.engagement.paidPaise, { paise: false })}
                    </TableCell>
                    <TableCell>
                      {formatINR(
                        d.engagement.agreedFeePaise - d.engagement.paidPaise,
                        {
                          paise: false,
                        },
                      )}
                    </TableCell>
                    <TableCell>{d.engagement.status}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer title="Stages" style={{ marginTop: 24 }}>
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
            </TableContainer>

            <TableContainer title="Issued drawings" style={{ marginTop: 24 }}>
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
            </TableContainer>
          </>
        )}
      </Content>
    </>
  );
}
