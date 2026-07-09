import { STANDARD_LICENCE_LABEL } from "@esti/contracts";
import { Surface } from "@hcw/ui-kit";
import { Stack, Typography } from "@mui/material";
import { StatusDot } from "../StatusTag.js";
import type { MyLicense } from "../../platform-admin/lib/auth.js";
import { portalPaperSx } from "./PortalChrome.js";

/** Licence summary card for account / company portals. */
export function PortalLicenceCard({
  title = "Licence",
  license,
}: {
  title?: string;
  license: MyLicense;
}) {
  return (
    <Surface layer="flat" sx={portalPaperSx}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="h6" component="h2" className="esti-grow">
            {title}
          </Typography>
          <StatusDot
            color={license.status === "ACTIVE" ? "green" : "gray"}
            label={STANDARD_LICENCE_LABEL}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Seats: {license.seats == null ? "Unlimited" : license.seats}
          {" · "}
          Devices: {license.deviceLimit == null ? "Unlimited" : license.deviceLimit}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {license.expiresAt
            ? `Renews / expires ${new Date(license.expiresAt).toLocaleDateString()}`
            : "Perpetual — no expiry"}
        </Typography>
      </Stack>
    </Surface>
  );
}
