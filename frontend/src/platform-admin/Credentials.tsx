import { useEffect, useState } from "react";
import { Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { type Credentials as Creds, fetchCredentials } from "./lib/auth";

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}
const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

/** The signed-in person's portable credentials — certifications + growth timeline. */
export default function Credentials() {
  const [creds, setCreds] = useState<Creds>({ certifications: [], growth: [] });

  useEffect(() => {
    void fetchCredentials().then(setCreds);
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h3">My credentials</Typography>
        <Typography variant="body2">
          Certifications and growth stay on you (AORMS-U) and follow you across companies.
        </Typography>

        {creds.certifications.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Certification</TableCell>
                <TableCell>Issuer</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {creds.certifications.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.issuer ?? "—"}</TableCell>
                  <TableCell>{fmt(c.issuedAt)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={c.status} sx={chipSx(c.status === "ACTIVE" ? "green" : "gray")} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2">No certifications yet.</Typography>
        )}

        {creds.growth.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {creds.growth.slice(0, 12).map((g) => (
              <Chip key={g.id} size="small" label={`${g.kind} · ${fmt(g.at)}`} sx={chipSx("cool-gray")} />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
