import {
  Button,
  DataTable,
  InlineNotification,
  Modal,
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
} from "@carbon/react";
import { Jurisdiction, ProjectType, formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const headers = [
  { key: "ref", header: "Ref" },
  { key: "title", header: "Title" },
  { key: "projectType", header: "Type" },
  { key: "status", header: "Status" },
  { key: "value", header: "Contract value" },
];

export function Projects() {
  const utils = trpc.useUtils();
  const list = trpc.projectOffice.list.useQuery({ limit: 50, offset: 0 });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<string>("RESIDENTIAL");
  const [jurisdiction, setJurisdiction] = useState<string>("BBMP");
  const [valueRupees, setValueRupees] = useState("");

  const create = trpc.projectOffice.create.useMutation({
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      setOpen(false);
      setTitle("");
      setValueRupees("");
    },
  });

  const rows =
    list.data?.map((p) => ({
      id: p.id,
      ref: p.ref,
      title: p.title,
      projectType: p.projectType,
      status: p.status,
      value: formatINR(p.contractValuePaise, { paise: false }),
    })) ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Projects</h1>
        <Button onClick={() => setOpen(true)}>New project</Button>
      </div>

      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer title="Architecture projects" description="All office projects">
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const { key, ...rest } = getHeaderProps({ header });
                    return (
                      <TableHeader key={key} {...rest}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const { key, ...rest } = getRowProps({ row });
                  return (
                    <TableRow key={key} {...rest}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      <Modal
        open={open}
        modalHeading="New project"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            title,
            projectType: projectType as (typeof ProjectType.options)[number],
            jurisdiction: jurisdiction as (typeof Jurisdiction.options)[number],
            contractValuePaise: Math.round(Number(valueRupees || "0") * 100),
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="title"
            labelText="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            id="projectType"
            labelText="Project type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {ProjectType.options.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <Select
            id="jurisdiction"
            labelText="Jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            {Jurisdiction.options.map((j) => (
              <SelectItem key={j} value={j} text={j} />
            ))}
          </Select>
          <TextInput
            id="value"
            labelText="Contract value (₹)"
            type="number"
            value={valueRupees}
            onChange={(e) => setValueRupees(e.target.value)}
          />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
