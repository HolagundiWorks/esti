import {
  Button,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  Tile,
} from "@carbon/react";
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
    <Stack gap={6}>
      <h2>Partners</h2>
      <TableContainer title="Partner register">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>COA no</TableHeader>
              <TableHeader>PAN</TableHeader>
              <TableHeader>DIN</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader></TableHeader>
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
                      kind="ghost"
                      size="sm"
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
        <Tile style={{ maxWidth: 760 }}>
          <Stack gap={5}>
            <h3>Add partner</h3>
            <Stack orientation="horizontal" gap={5}>
              <TextInput
                id="pt-name"
                labelText="Name"
                value={p.name}
                onChange={(e) => setP((x) => ({ ...x, name: e.target.value }))}
              />
              <TextInput
                id="pt-coa"
                labelText="COA no"
                value={p.coaRegNo}
                onChange={(e) =>
                  setP((x) => ({ ...x, coaRegNo: e.target.value }))
                }
              />
              <TextInput
                id="pt-pan"
                labelText="PAN"
                value={p.pan}
                onChange={(e) => setP((x) => ({ ...x, pan: e.target.value }))}
              />
              <TextInput
                id="pt-din"
                labelText="DIN"
                value={p.din}
                onChange={(e) => setP((x) => ({ ...x, din: e.target.value }))}
              />
            </Stack>
            <Stack orientation="horizontal" gap={5}>
              <TextInput
                id="pt-email"
                labelText="Email"
                type="email"
                value={p.email}
                onChange={(e) => setP((x) => ({ ...x, email: e.target.value }))}
              />
              <TextInput
                id="pt-phone"
                labelText="Phone"
                value={p.phone1}
                onChange={(e) =>
                  setP((x) => ({ ...x, phone1: e.target.value }))
                }
              />
              <TextInput
                id="pt-city"
                labelText="City"
                value={p.city}
                onChange={(e) => setP((x) => ({ ...x, city: e.target.value }))}
              />
              <Select
                id="pt-state"
                labelText="State"
                value={p.state}
                onChange={(e) =>
                  setP((x) => ({ ...x, state: e.target.value, district: "" }))
                }
              >
                {STATES.map((s) => (
                  <SelectItem key={s} value={s} text={s} />
                ))}
              </Select>
              {districts.length > 0 ? (
                <Select
                  id="pt-dist"
                  labelText="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                >
                  <SelectItem value="" text="Select…" />
                  {districts.map((d) => (
                    <SelectItem key={d} value={d} text={d} />
                  ))}
                </Select>
              ) : (
                <TextInput
                  id="pt-dist"
                  labelText="District"
                  value={p.district}
                  onChange={(e) =>
                    setP((x) => ({ ...x, district: e.target.value }))
                  }
                />
              )}
            </Stack>
            <Button
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
          </Stack>
        </Tile>
      )}
    </Stack>
  );
}
