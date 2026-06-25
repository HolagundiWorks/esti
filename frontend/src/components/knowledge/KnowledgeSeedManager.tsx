import {
  Button,
  Checkbox,
  InlineNotification,
  Stack,
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
import { HCW_SEED_MAINTAINER } from "@esti/contracts";
import { useMemo, useState } from "react";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

export function KnowledgeSeedManager() {
  const utils = trpc.useUtils();
  const officialQ = trpc.kbSeed.listOfficialPacks.useQuery();
  const activationsQ = trpc.kbSeed.listActivations.useQuery();
  const activate = trpc.kbSeed.activateOfficial.useMutation({
    onSuccess: () => {
      utils.kbSeed.listActivations.invalidate();
      utils.dsr.listVersions.invalidate();
      utils.bbmpRules.listRuleSets.invalidate();
    },
  });
  const deactivate = trpc.kbSeed.deactivateOfficial.useMutation({
    onSuccess: () => {
      utils.kbSeed.listActivations.invalidate();
      utils.dsr.listVersions.invalidate();
      utils.bbmpRules.listRuleSets.invalidate();
    },
  });

  const cities = officialQ.data?.cities ?? [];
  const packs = officialQ.data?.packs ?? [];
  const [selectedCities, setSelectedCities] = useState<Set<string>>(() => new Set(cities.map((c) => c.key)));
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const activationKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of activationsQ.data?.dsr ?? []) {
      if (row.packId) keys.add(`${row.packId}:${row.cityKey ?? "*"}`);
    }
    for (const row of activationsQ.data?.compliance ?? []) {
      if (row.packId) keys.add(`${row.packId}:${row.cityKey ?? "*"}`);
    }
    return keys;
  }, [activationsQ.data]);

  function toggleCity(key: string, checked: boolean) {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function togglePack(packId: string, checked: boolean) {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      if (checked) next.add(packId);
      else next.delete(packId);
      return next;
    });
  }

  async function runActivate(all: boolean) {
    setError(null);
    try {
      await activate.mutateAsync({
        all,
        packIds: all ? undefined : [...selectedPacks],
        cityKeys: all || selectedCities.size === cities.length ? undefined : [...selectedCities],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed");
    }
  }

  return (
    <Stack gap={6}>
      <Tile>
        <Stack gap={4}>
          <Stack gap={2}>
            <h2>Official seed data</h2>
            <p style={{ margin: 0 }}>
              Read-only catalogues maintained by {HCW_SEED_MAINTAINER} in kit repos.
              Activation stores lightweight references only — rates and rules are loaded from the kit at runtime.
            </p>
          </Stack>

          <Stack gap={3}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Cities</h3>
            <Stack orientation="horizontal" gap={5}>
              {cities.map((city) => (
                <Checkbox
                  key={city.key}
                  id={`seed-city-${city.key}`}
                  labelText={city.label}
                  checked={selectedCities.has(city.key)}
                  onChange={(_, { checked }) => toggleCity(city.key, !!checked)}
                />
              ))}
            </Stack>
          </Stack>

          <DataState
            loading={officialQ.isLoading}
            isEmpty={packs.length === 0}
            columnCount={4}
            empty={{ title: "No official packs", description: "Kit seed registry is empty." }}
          >
            <TableContainer title="Available official packs">
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Select</TableHeader>
                    <TableHeader>Pack</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Cities</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packs.map((pack) => {
                    const activeForSelection = pack.cityKeys.includes("*")
                      ? activationKeys.has(`${pack.packId}:*`)
                      : cities.some(
                          (c) =>
                            pack.cityKeys.includes(c.key) &&
                            selectedCities.has(c.key) &&
                            activationKeys.has(`${pack.packId}:${c.key}`),
                        );
                    return (
                      <TableRow key={pack.packId}>
                        <TableCell>
                          <Checkbox
                            id={`seed-pack-${pack.packId}`}
                            labelText=""
                            hideLabel
                            checked={selectedPacks.has(pack.packId)}
                            onChange={(_, { checked }) => togglePack(pack.packId, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack gap={1}>
                            <strong>{pack.label}</strong>
                            <span style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary)" }}>
                              {pack.description}
                            </span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Tag size="sm" type="blue">
                            {pack.kind}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {pack.cityKeys.includes("*") ? "All cities" : pack.cityKeys.join(", ")}
                        </TableCell>
                        <TableCell>
                          {activeForSelection ? (
                            <Tag size="sm" type="green">
                              Activated
                            </Tag>
                          ) : (
                            <Tag size="sm" type="gray">
                              Not activated
                            </Tag>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>

          <Stack orientation="horizontal" gap={3}>
            <Button
              disabled={activate.isPending || selectedCities.size === 0}
              onClick={() => void runActivate(true)}
            >
              {activate.isPending ? "Seeding…" : "Seed all official packs"}
            </Button>
            <Button
              kind="secondary"
              disabled={activate.isPending || selectedPacks.size === 0 || selectedCities.size === 0}
              onClick={() => void runActivate(false)}
            >
              Seed selected packs
            </Button>
          </Stack>

          {error && (
            <InlineNotification kind="error" title="Seed activation failed" subtitle={error} hideCloseButton />
          )}
        </Stack>
      </Tile>

      <Tile>
        <Stack gap={4}>
          <Stack gap={2}>
            <h3 style={{ margin: 0 }}>Active official seeds</h3>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Custom firm data: create a new DSR version or rule set, then import/export CSV (custom only).
            </p>
          </Stack>
          <DataState
            loading={activationsQ.isLoading}
            isEmpty={
              (activationsQ.data?.dsr.length ?? 0) === 0 &&
              (activationsQ.data?.compliance.length ?? 0) === 0
            }
            columnCount={4}
            empty={{
              title: "No official seeds activated",
              description: "Use Seed all or Seed selected above to enable HCW catalogues.",
            }}
          >
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>City</TableHeader>
                    <TableHeader></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(activationsQ.data?.dsr ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.label}
                        <Tag size="sm" type="purple" style={{ marginLeft: 8 }}>
                          HCW read-only
                        </Tag>
                      </TableCell>
                      <TableCell>Rate book</TableCell>
                      <TableCell>{row.cityKey ?? "National"}</TableCell>
                      <TableCell>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          disabled={row.active || deactivate.isPending}
                          onClick={() =>
                            deactivate.mutate({ kind: "DSR", entityId: row.id })
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(activationsQ.data?.compliance ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.label}
                        <Tag size="sm" type="purple" style={{ marginLeft: 8 }}>
                          HCW read-only
                        </Tag>
                      </TableCell>
                      <TableCell>Compliance</TableCell>
                      <TableCell>{row.cityKey ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          disabled={row.active || deactivate.isPending}
                          onClick={() =>
                            deactivate.mutate({ kind: "COMPLIANCE", entityId: row.id })
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        </Stack>
      </Tile>
    </Stack>
  );
}
