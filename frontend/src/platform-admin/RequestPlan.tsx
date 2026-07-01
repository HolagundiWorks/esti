import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { type PlanRequest, fetchMyRequest, requestPlan } from "./lib/auth";

const PLANS = [
  { code: "LITE", label: "Lite — free forever" },
  { code: "CORE", label: "Core" },
  { code: "ENTERPRISE", label: "Enterprise" },
];

const STATUS_TAG: Record<string, "teal" | "green" | "red"> = {
  PENDING: "teal",
  FULFILLED: "green",
  REJECTED: "red",
};

/** Sign-up → request a plan; an admin fulfils it and emails the licence. */
export default function RequestPlan() {
  const [req, setReq] = useState<PlanRequest | null>(null);
  const [plan, setPlan] = useState("LITE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyRequest().then(setReq);
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await requestPlan(plan);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send the request.");
      return;
    }
    setReq(res.request ?? (await fetchMyRequest()));
  }

  const pending = req?.status === "PENDING";
  const fulfilled = req?.status === "FULFILLED";

  return (
    <Tile>
      <Stack gap={5}>
        <h3 className="esti-label">Request a workspace</h3>

        {fulfilled ? (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Approved"
            subtitle={`Your ${req?.planCode} licence has been emailed to you. Check your inbox and activate it in your AORMS install.`}
          />
        ) : pending ? (
          <Stack gap={3}>
            <Stack gap={2} orientation="horizontal">
              <p>Request received —</p>
              <Tag type={STATUS_TAG[req!.status]}>{req!.planCode} · pending</Tag>
            </Stack>
            <p className="esti-label esti-label--secondary">
              An admin will review it and email your access link. You can change the tier below.
            </p>
          </Stack>
        ) : (
          <p>Choose a plan and request access — we&apos;ll email your licence once approved.</p>
        )}

        {!fulfilled && (
          <>
            <RadioButtonGroup
              legendText="Plan"
              name="plan"
              valueSelected={plan}
              onChange={(v) => setPlan(String(v))}
            >
              {PLANS.map((p) => (
                <RadioButton key={p.code} labelText={p.label} value={p.code} id={`plan-${p.code}`} />
              ))}
            </RadioButtonGroup>
            <div>
              <Button kind="primary" disabled={busy} onClick={submit}>
                {pending ? "Update request" : "Request access"}
              </Button>
            </div>
          </>
        )}

        {error && (
          <InlineNotification kind="error" title="Error" subtitle={error} lowContrast onCloseButtonClick={() => setError(null)} />
        )}
      </Stack>
    </Tile>
  );
}
