import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { PLAN_LABEL, type LicenseStatus } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<LicenseStatus, "green" | "teal" | "red" | "gray"> = {
  VALID: "green",
  GRACE: "teal",
  EXPIRED: "red",
  UNLICENSED: "gray",
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  VALID: "Active",
  GRACE: "Grace period",
  EXPIRED: "Expired",
  UNLICENSED: "Not activated",
};

const cap = (n: number | null) => (n === null ? "Unlimited" : String(n));
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

/** Firm licence — activation + status. The plan is licence-derived (owner only). */
export function LicensePanel() {
  const utils = trpc.useUtils();
  const q = trpc.license.status.useQuery();
  const [key, setKey] = useState("");

  const activate = trpc.license.activate.useMutation({
    onSuccess: () => {
      setKey("");
      void utils.license.status.invalidate();
      void utils.settings.get.invalidate();
    },
  });
  const refresh = trpc.license.refresh.useMutation({
    onSuccess: () => void utils.license.status.invalidate(),
  });

  const view = q.data;
  const status = view?.status ?? "UNLICENSED";

  return (
    <Tile>
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={3}>
          <h3 className="esti-label">Licence</h3>
          {view && <Tag type="blue">{PLAN_LABEL[view.plan]}</Tag>}
          <Tag type={STATUS_TAG[status]}>{STATUS_LABEL[status]}</Tag>
        </Stack>

        {view && view.status !== "UNLICENSED" && (
          <Grid narrow>
            <Column sm={2} md={2} lg={4}>
              <Stack gap={1}>
                <p className="esti-label esti-label--secondary">Staff seats</p>
                <p>{cap(view.seats.staff)}</p>
              </Stack>
            </Column>
            <Column sm={2} md={2} lg={4}>
              <Stack gap={1}>
                <p className="esti-label esti-label--secondary">Accountant seats</p>
                <p>{cap(view.seats.accountants)}</p>
              </Stack>
            </Column>
            <Column sm={2} md={2} lg={4}>
              <Stack gap={1}>
                <p className="esti-label esti-label--secondary">HR seats</p>
                <p>{cap(view.seats.hrManagers)}</p>
              </Stack>
            </Column>
            <Column sm={2} md={2} lg={4}>
              <Stack gap={1}>
                <p className="esti-label esti-label--secondary">Valid until</p>
                <p>{fmtDate(view.expiresAt)}</p>
              </Stack>
            </Column>
          </Grid>
        )}

        {status === "GRACE" && view?.graceDaysLeft != null && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Licence expired — grace period"
            subtitle={`Reconnect to renew. ${view.graceDaysLeft} day(s) of grace remaining before writes are blocked.`}
          />
        )}
        {status === "EXPIRED" && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Licence expired"
            subtitle="Writes are blocked until the licence is renewed. Activate a current key below."
          />
        )}

        <Stack gap={3}>
          <TextInput
            id="lic-key"
            labelText="Activation key"
            placeholder="ESTI-XXXX-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Stack orientation="horizontal" gap={3}>
            <Button
              onClick={() => activate.mutate({ key })}
              disabled={!key.trim() || activate.isPending}
            >
              {activate.isPending ? "Activating…" : "Activate"}
            </Button>
            <Button
              kind="ghost"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || status === "UNLICENSED"}
            >
              {refresh.isPending ? "Refreshing…" : "Refresh now"}
            </Button>
          </Stack>
          {activate.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not activate"
              subtitle={activate.error.message}
            />
          )}
        </Stack>

        <p className="esti-label esti-label--helper">
          Your plan reflects this licence — billing is handled by Holagundi
          Consulting Works. Keys are issued when you purchase or change a plan.
        </p>
      </Stack>
    </Tile>
  );
}
