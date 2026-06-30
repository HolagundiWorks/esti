import { useEffect, useState } from "react";
import {
  Checkbox,
  InlineNotification,
  Modal,
  NumberInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

type Pick = { checked: boolean; qty: number };

export function ProjectElementComponents({
  parentElementId,
  parentCode,
  open,
  onClose,
  onGenerated,
}: {
  parentElementId: string | null;
  parentCode: string;
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const suggestQ = trpc.cms.elements.suggestComponents.useQuery(
    { parentElementId: parentElementId! },
    { enabled: open && !!parentElementId },
  );
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const generate = trpc.cms.elements.generateComponents.useMutation({
    onSuccess: () => {
      onGenerated();
      onClose();
    },
  });

  const suggestions = suggestQ.data ?? [];

  // seed picks from suggestions (default-check mandatory, not-yet-existing)
  useEffect(() => {
    if (!open) return;
    const seed: Record<string, Pick> = {};
    for (const s of suggestions) {
      seed[s.childItemId] = {
        checked: !s.alreadyExists && s.dependencyType === "MANDATORY",
        qty: s.suggestedQty,
      };
    }
    setPicks(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestQ.data]);

  const chosen = suggestions.filter((s) => picks[s.childItemId]?.checked);

  return (
    <Modal
      open={open}
      modalHeading={`Components — ${parentCode}`}
      size="lg"
      primaryButtonText={generate.isPending ? "Generating…" : `Generate ${chosen.length} components`}
      secondaryButtonText="Close"
      primaryButtonDisabled={generate.isPending || chosen.length === 0 || !parentElementId}
      onRequestSubmit={() => {
        if (!parentElementId) return;
        generate.mutate({
          parentElementId,
          picks: chosen.map((s) => ({ childItemId: s.childItemId, quantity: picks[s.childItemId]!.qty })),
        });
      }}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
    >
      <Stack gap={5}>
        <p className="esti-label esti-label--secondary">
          Suggested child elements from this element's item dependencies. Quantities are derived
          (parent qty × ratio) and editable before generating.
        </p>
        <DataState
          loading={suggestQ.isLoading}
          isEmpty={!suggestQ.isLoading && suggestions.length === 0}
          columnCount={6}
          empty={{
            title: "No component suggestions",
            description: "This element's item has no dependencies. Add them in Knowledge Bank → Items → Dependencies.",
          }}
        >
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Use</TableHeader>
                  <TableHeader>Component</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Ratio</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Amount</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {suggestions.map((s) => {
                  const p = picks[s.childItemId] ?? { checked: false, qty: s.suggestedQty };
                  return (
                    <TableRow key={s.childItemId}>
                      <TableCell>
                        <Checkbox
                          id={`pc-${s.childItemId}`}
                          labelText=""
                          checked={p.checked}
                          onChange={(_e, { checked }) =>
                            setPicks((x) => ({ ...x, [s.childItemId]: { ...p, checked } }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {s.description}{" "}
                        {s.alreadyExists && <Tag type="cool-gray" size="sm">exists</Tag>}
                      </TableCell>
                      <TableCell>
                        <Tag type={s.dependencyType === "MANDATORY" ? "blue" : "gray"} size="sm">
                          {s.dependencyType}
                        </Tag>
                      </TableCell>
                      <TableCell>{s.ratio}</TableCell>
                      <TableCell>
                        <div className="esti-input-sm">
                          <NumberInput
                            id={`pq-${s.childItemId}`}
                            label=""
                            hideLabel
                            size="sm"
                            min={0}
                            step={0.001}
                            value={p.qty}
                            onChange={(_e, { value }) =>
                              setPicks((x) => ({ ...x, [s.childItemId]: { ...p, qty: Number(value) } }))
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>{formatINR(Math.round(p.qty * s.ratePaise))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
        {generate.error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not generate" subtitle={generate.error.message} />
        )}
      </Stack>
    </Modal>
  );
}
