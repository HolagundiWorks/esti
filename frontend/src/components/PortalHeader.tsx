import LogoutIcon from "@mui/icons-material/Logout";
import { AppBar, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";

export function PortalHeader({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
}: {
  companyName?: string;
  logoUrl?: string | null;
  portalLabel: string;
  onSignOut: () => void;
  signingOut?: boolean;
}) {
  return (
    <AppBar position="static" aria-label={`${companyName ?? "ESTI"} ${portalLabel}`}>
      <Toolbar>
        <Typography component="span" sx={{ flexGrow: 1 }}>
          <strong>{companyName ?? "ESTI"}</strong> {portalLabel}
        </Typography>
        <Tooltip title="Sign out">
          <span>
            <IconButton
              aria-label="Sign out"
              color="inherit"
              disabled={signingOut}
              onClick={() => {
                if (!signingOut) onSignOut();
              }}
            >
              <LogoutIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
