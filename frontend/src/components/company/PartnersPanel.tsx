import {
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { STATES, districtsFor } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function Partners({ isOwner }: { isOwner: boolean }) {
  const utils = trpc.useUtils();
  const partnersQ = trpc.firm.listPartners.useQuery();
  const invalidate = () => utils.firm.listPartners.invalidate();
  const remove = trpc.firm.removePartner.useMutation({ onSuccess: invalidate });

  const [p, setP] = useState({
    name: "",
    coaRegNo: "",
    pan: "",
    din: "",
    email: "",
    phone1Type: "MOBILE",
    phone1: "",
    state: "Karnataka",
    district: "",
    city: "",
  });
  const add = trpc.firm.addPartner.useMutation({
    onSuccess: () => {
      invalidate();
      setP((x) => ({
        ...x,
        name: "",
        coaRegNo: "",
        pan: "",
        din: "",
        email: "",
        phone1: "",
      }));
    },
  });
  const districts = districtsFor(p.state);

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h2">Partners</Typography>
      <TableContainer sx={{ p: 2 }}>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>Partner register</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>COA no</TableCell>
              <TableCell>PAN</TableCell>
              <TableCell>DIN</TableCell>
              <TableCell>Email</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(partnersQ.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.coaRegNo ?? "—"}</TableCell>
                <TableCell>{row.pan ?? "—"}</TableCell>
                <TableCell>{row.din ?? "—"}</TableCell>
                <TableCell>{row.email ?? "—"}</TableCell>
                <TableCell>
                  {isOwner && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => remove.mutate({ id: row.id })}
                    >
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isOwner && (
        <>
          <Divider />
          <Box sx={{ p: 3, maxWidth: 760 }}>
            <Stack spacing={2}>
            <Typography variant="h6" component="h3">Add partner</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                id="pt-name"
                label="Name"
                value={p.name}
                onChange={(e) => setP((x) => ({ ...x, name: e.target.value }))}
                fullWidth
              />
              <TextField
                id="pt-coa"
                label="COA no"
                value={p.coaRegNo}
                onChange={(e) =>
                  setP((x) => ({ ...x, coaRegNo: e.target.value }))
                }
                fullWidth
              />
              <TextField
                id="pt-pan"
                label="PAN"
                value={p.pan}
                onChange={(e) => setP((x) => ({ ...x, pan: e.target.value }))}
                fullWidth
              />
              <TextField
                id="pt-din"
                label="DIN"
                value={p.din}
                onChange={(e) => setP((x) => ({ ...x, din: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                id="pt-email"
                label="Email"
                type="email"
                value={p.email}
                onChange={(e) => setP((x) => ({ ...x, email: e.target.value }))}
                fullWidth
              />
              <TextField
                id="pt-phone"
                label="Phone"
                value={p.phone1}
                onChange={(e) =>
                  setP((x) => ({ ...x, phone1: e.target.value }))
                }
                fullWidth
              />
              <TextField
                id="pt-city"
                label="City"
                value={p.city}
                onChange={(e) => setP((x) => ({ ...x, city: e.target.value }))}
                fullWidth
              />
              <TextField
                id="pt-state"
                select
                label="State"
                value={p.state}
                onChange={(e) =>
                  setP((x) => ({ ...x, state: e.target.value, district: "" }))
                }
                fullWidth
              >
                {STATES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              {districts.length > 0 ? (
                <TextField
                  id="pt-dist"
                  select
                  label="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                  fullWidth
                >
                  <MenuItem value="">Select…</MenuItem>
                  {districts.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  id="pt-dist"
                  label="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                  fullWidth
                />
              )}
            </Stack>
            <Box>
              <Button
                variant="contained"
                disabled={!p.name || add.isPending}
                onClick={() =>
                  add.mutate({
                    name: p.name,
                    coaRegNo: p.coaRegNo,
                    pan: p.pan,
                    din: p.din,
                    email: p.email,
                    phone1Type: "MOBILE",
                    phone1: p.phone1,
                    city: p.city,
                    state: p.state,
                    district: p.district,
                  })
                }
              >
                {add.isPending ? "Adding…" : "Add partner"}
              </Button>
            </Box>
          </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
