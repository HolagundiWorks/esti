import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { GstSystem, INDIAN_STATES, can, type GstType } from "@esti/contracts";
import { useEffect, useState } from "react";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/**
 * One-time gate for existing installs — confirm critical firm and profile
 * details before the workspace unlocks (migration 0172).
 */
export function ForceWorkspaceProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const firmQ = trpc.firm.get.useQuery(undefined, {
    enabled: !!user && can(user.role, "firm:admin"),
  });
  const profileQ = trpc.users.myProfile.useQuery(undefined, { enabled: !!user });

  const complete = trpc.auth.completeWorkspaceProfile.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });

  const isOwner = user ? can(user.role, "firm:admin") : false;

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [coaRegNo, setCoaRegNo] = useState("");
  const [phone1, setPhone1] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Karnataka");
  const [gstType, setGstType] = useState<GstType>("REGULAR");

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
    if (user?.designation) setDesignation(user.designation);
  }, [user?.fullName, user?.designation]);

  useEffect(() => {
    const f = firmQ.data;
    if (!f) return;
    setCompanyName(f.companyName ?? "");
    setCoaRegNo(f.coaRegNo ?? "");
    setPhone1(f.phone1 ?? "");
    setEmail(f.email ?? "");
    setCity(f.city ?? "");
    if (f.state) setState(f.state);
    if (f.gstType) setGstType(f.gstType);
  }, [firmQ.data]);

  useEffect(() => {
    if (profileQ.data?.designation && !designation) {
      setDesignation(profileQ.data.designation);
    }
  }, [profileQ.data, designation]);

  const canSubmit =
    fullName.trim().length >= 2 &&
    designation.trim().length >= 1 &&
    (!isOwner ||
      (companyName.trim().length >= 2 &&
        coaRegNo.trim().length >= 1 &&
        phone1.trim().length >= 8 &&
        email.includes("@") &&
        city.trim().length >= 2 &&
        state.length >= 2));

  return (
    <AuthRailLayout
      variant="workspace"
      rail={
        <Stack spacing={3}>
          <Stack spacing={1}>
            <AuthBrandBlock />
            <h2>Confirm your workspace details</h2>
            <p className="esti-label esti-label--secondary">
              AORMS was upgraded with unified accounts. Please review your practice
              and profile information once — then your workspace will unlock.
            </p>
          </Stack>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit || complete.isPending) return;
              complete.mutate({
                fullName: fullName.trim(),
                designation: designation.trim(),
                ...(isOwner
                  ? {
                      companyName: companyName.trim(),
                      coaRegNo: coaRegNo.trim(),
                      phone1: phone1.trim(),
                      email: email.trim(),
                      city: city.trim(),
                      state: state as (typeof INDIAN_STATES)[number],
                      gstType,
                    }
                  : {}),
              });
            }}
          >
            <Stack spacing={2}>
              <TextField
                label="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                fullWidth
              />

              {isOwner && (
                <>
                  <Typography variant="subtitle2" component="h3">
                    Firm details
                  </Typography>
                  <TextField
                    label="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="COA registration no."
                    value={coaRegNo}
                    onChange={(e) => setCoaRegNo(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Contact phone"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Office email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    select
                    label="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    fullWidth
                  >
                    {INDIAN_STATES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="GST type"
                    value={gstType}
                    onChange={(e) => setGstType(e.target.value)}
                    fullWidth
                  >
                    {Object.keys(GstSystem).map((k) => (
                      <MenuItem key={k} value={k}>
                        {k.replace(/_/g, " ")}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}

              {complete.error && <Alert severity="error">{complete.error.message}</Alert>}
              <Button
                type="submit"
                size="large"
                variant="contained"
                endIcon={<ArrowForward />}
                disabled={complete.isPending || !canSubmit}
              >
                {complete.isPending ? "Saving…" : "Continue to workspace"}
              </Button>
            </Stack>
          </form>
        </Stack>
      }
    />
  );
}
