import { Button, Stack, Typography } from "@mui/material";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

/** Placeholder until the contractor coordination portal is rebuilt (consultancy-only teardown). */
export function ContractorPortalStub() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => {
      setDesktopToken(null);
      return utils.auth.me.invalidate();
    },
  });

  return (
    <ExternalPortalShell
      portalLabel={AORMS_PORTALS.contractor.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
    >
      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <Typography variant="h5" component="h1">
          Contractor access is being rebuilt
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The contractor coordination portal was retired during the consultancy-only
          product focus. Your login remains active — contact your architect&apos;s office
          for site instructions, drawings, and progress updates in the meantime.
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          sx={{ alignSelf: "flex-start", minHeight: 44 }}
        >
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </Stack>
    </ExternalPortalShell>
  );
}
