import { useEffect, useState } from "react";
import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { type Credentials as Creds, fetchCredentials } from "./lib/auth";

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

/** The signed-in person's portable credentials — certifications + growth timeline. */
export default function Credentials() {
  const [creds, setCreds] = useState<Creds>({ certifications: [], growth: [] });

  useEffect(() => {
    void fetchCredentials().then(setCreds);
  }, []);

  return (
    <Tile>
      <Stack gap={5}>
        <h3 className="esti-label">My credentials</h3>
        <p>Certifications and growth stay on you (AORMS-U) and follow you across companies.</p>

        {creds.certifications.length > 0 ? (
          <Table size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>Certification</TableHeader>
                <TableHeader>Issuer</TableHeader>
                <TableHeader>Issued</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {creds.certifications.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.issuer ?? "—"}</TableCell>
                  <TableCell>{fmt(c.issuedAt)}</TableCell>
                  <TableCell>
                    <Tag type={c.status === "ACTIVE" ? "green" : "gray"}>{c.status}</Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>No certifications yet.</p>
        )}

        {creds.growth.length > 0 && (
          <Stack gap={2} orientation="horizontal">
            {creds.growth.slice(0, 12).map((g) => (
              <Tag key={g.id} type="cool-gray">
                {g.kind} · {fmt(g.at)}
              </Tag>
            ))}
          </Stack>
        )}
      </Stack>
    </Tile>
  );
}
