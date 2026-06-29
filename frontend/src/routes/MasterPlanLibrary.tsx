import {
  Button,
  FileUploaderButton,
  InlineNotification,
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
  Tag,
  TextInput,
} from "@carbon/react";
import { MasterPlanCategory } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

/** Studio › Libraries › Master Plan Library — PDF / DWG / zoning / development files. */
export function MasterPlanLibrary() {
  const utils = trpc.useUtils();
  const listQ = trpc.masterPlans.list.useQuery();
  const remove = trpc.masterPlans.remove.useMutation({
    onSuccess: () => utils.masterPlans.list.invalidate(),
  });
  const { authorizedFetch } = useUploadAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(MasterPlanCategory.options[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/master-plan", (fd) => {
        fd.append("name", name || file.name);
        fd.append("category", category);
        fd.append("file", file);
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      }
      setName("");
      setFile(null);
      utils.masterPlans.list.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap={6}>
      <PageHeader
        title="Master Plan Library"
        description="Reference master plans — PDF, DWG, zoning and development plans."
      />

      <Stack orientation="horizontal" gap={4} className="esti-page-header">
        <TextInput
          id="mp-name"
          labelText="Name"
          placeholder="e.g. Whitefield zoning plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select id="mp-cat" labelText="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {MasterPlanCategory.options.map((c) => (
            <SelectItem key={c} value={c} text={c} />
          ))}
        </Select>
        <FileUploaderButton
          labelText={file ? file.name : "Choose file"}
          accept={[".pdf", ".dwg", ".dxf"]}
          disableLabelChanges
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button disabled={!file || busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </Stack>

      {error && (
        <InlineNotification kind="error" title="Upload failed" subtitle={error} lowContrast onCloseButtonClick={() => setError(null)} />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No master plans", description: "Upload a PDF or DWG reference plan." }}
      >
        <TableContainer title="Master plans">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>File</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell><Tag size="sm">{r.category}</Tag></TableCell>
                  <TableCell>
                    {r.url ? (
                      <Button kind="ghost" size="sm" href={r.url} target="_blank" rel="noreferrer">
                        {r.fileName}
                      </Button>
                    ) : (
                      r.fileName
                    )}
                  </TableCell>
                  <TableCell>
                    <Button kind="danger--ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate({ id: r.id })}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
