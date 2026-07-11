import { ActionDock, useScreenActions } from "@hcw/ui-kit";
import { useNavigate } from "react-router-dom";

/** Global Create + Sign in — single CTA locus on marketing pages (HCW-UI-UX §9). */
export function MarketingConversionDock() {
  const navigate = useNavigate();

  useScreenActions(
    [
      {
        id: "create-account",
        label: "Create account",
        zone: "center",
        tone: "primary",
        onClick: () => navigate("/account?mode=create"),
      },
      {
        id: "sign-in",
        label: "Sign in",
        zone: "right",
        tone: "primary",
        onClick: () => navigate("/login"),
      },
    ],
    [navigate],
  );

  return <ActionDock />;
}
