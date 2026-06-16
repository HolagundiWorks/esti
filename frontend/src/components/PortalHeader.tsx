import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
} from "@carbon/react";
import { Logout } from "@carbon/icons-react";

export function PortalHeader({
  companyName,
  logoUrl,
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
    <Header aria-label={`${companyName ?? "ESTI"} ${portalLabel}`}>
      {logoUrl && (
        <img src={logoUrl} alt="" className="esti-portal-logo" />
      )}
      <HeaderName prefix={companyName ?? "ESTI"}>{portalLabel}</HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction
          aria-label="Sign out"
          tooltipAlignment="end"
          onClick={() => {
            if (!signingOut) onSignOut();
          }}
        >
          <Logout size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}
