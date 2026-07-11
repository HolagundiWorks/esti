import { Surface } from "@hcw/ui-kit";
import {
  Badge,
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

export type AdminSectionKey =
  | "requests"
  | "licenses"
  | "accounts"
  | "orgs"
  | "products"
  | "apikeys";

const SECTIONS: { key: AdminSectionKey; label: string }[] = [
  { key: "requests", label: "Requests" },
  { key: "licenses", label: "Licences" },
  { key: "accounts", label: "Accounts" },
  { key: "orgs", label: "Organizations" },
  { key: "products", label: "Products & plans" },
  { key: "apikeys", label: "API keys" },
];

/** Licensing console — left nav + content stage inside the portal shell. */
export function AdminConsoleShell({
  section,
  onSectionChange,
  pendingRequests = 0,
  email,
  isPlatformAdmin,
  children,
}: {
  section: AdminSectionKey;
  onSectionChange: (key: AdminSectionKey) => void;
  pendingRequests?: number;
  email: string;
  isPlatformAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {AORMS_PORTALS.account.licensing}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage accounts, organizations, licences, and API keys for AORMS Standard.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={isPlatformAdmin ? "Platform admin" : "Member"}
            color={isPlatformAdmin ? "success" : "default"}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            {email}
          </Typography>
        </Stack>
      </Stack>

      <Box className="esti-admin-console">
        <Surface layer="flat" className="esti-admin-console__nav">
          <List dense disablePadding>
            {SECTIONS.map((s) => (
              <ListItemButton
                key={s.key}
                selected={section === s.key}
                onClick={() => onSectionChange(s.key)}
                sx={{ mx: 0.5, my: 0.25 }}
              >
                <ListItemText primary={s.label} slotProps={{ primary: { variant: "body2" } }} />
                {s.key === "requests" && pendingRequests > 0 && (
                  <Badge badgeContent={pendingRequests} color="primary" sx={{ mr: 1 }} />
                )}
              </ListItemButton>
            ))}
          </List>
        </Surface>
        <Surface layer="flat" className="esti-admin-console__stage">
          {children}
        </Surface>
      </Box>
    </Stack>
  );
}
