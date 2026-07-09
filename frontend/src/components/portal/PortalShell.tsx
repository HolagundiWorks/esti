import { Surface } from "@hcw/ui-kit";
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { AormsLogo } from "../AormsLogo.js";

export type PortalNavKey = "account" | "company" | "licensing" | "workspace";

const NAV: { key: PortalNavKey; label: string; href: string; external?: boolean }[] = [
  { key: "account", label: "Personal account", href: "/account" },
  { key: "company", label: "Company account", href: "/company-account" },
  { key: "licensing", label: "Licensing console", href: "/platform-admin" },
  { key: "workspace", label: "Studio workspace", href: "/login" },
];

export function PortalShell({
  active,
  children,
  showCompanyNav = false,
  showLicensingNav = false,
  footer,
}: {
  active: PortalNavKey;
  children: ReactNode;
  /** Show company nav link (owners). */
  showCompanyNav?: boolean;
  /** Show licensing console link (platform admins). */
  showLicensingNav?: boolean;
  footer?: ReactNode;
}) {
  const location = useLocation();
  const isAdminHost = /^\/platform-admin/.test(location.pathname) || /^admin\./.test(window.location.hostname);

  const links = NAV.filter((item) => {
    if (item.key === "company" && !showCompanyNav) return false;
    if (item.key === "licensing" && !showLicensingNav) return false;
    return true;
  });

  return (
    <Box className="esti-portal-layout">
        <Surface layer="flat" component="aside" className="esti-portal-rail" aria-label="Account navigation">
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Box sx={{ px: 1.5, pt: 1 }}>
              <Button component={RouterLink} to="/" variant="text" sx={{ p: 0, minWidth: 0 }}>
                <AormsLogo height={28} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Account &amp; licensing
              </Typography>
            </Box>
            <Divider />
            <List dense disablePadding sx={{ flex: 1 }}>
              {links.map((item) => {
                const selected = item.key === active;
                const href =
                  item.key === "licensing" && isAdminHost ? "/platform-admin" : item.href;
                return (
                  <ListItemButton
                    key={item.key}
                    component={RouterLink}
                    to={href}
                    selected={selected}
                    sx={{ borderRadius: 1, mx: 0.5 }}
                  >
                    <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2" }} />
                  </ListItemButton>
                );
              })}
            </List>
            {footer && (
              <>
                <Divider />
                <Box sx={{ px: 1.5, pb: 1 }}>{footer}</Box>
              </>
            )}
          </Stack>
        </Surface>
        <Box component="main" className="esti-portal-stage">
          {children}
        </Box>
    </Box>
  );
}
