import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

const headers = [
  { key: "ref", header: "Ref" },
  { key: "title", header: "Title" },
  { key: "projectType", header: "Type" },
  { key: "status", header: "Status" },
  { key: "value", header: "Contract value" },
];

export function Projects() {
  const list = trpc.projectOffice.list.useQuery({ limit: 50, offset: 0 });

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
      <h1>Projects</h1>
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
    </div>
  );
}
