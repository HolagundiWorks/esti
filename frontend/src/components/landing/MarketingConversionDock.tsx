import { ActionDock, useScreenActions } from "@hcw/ui-kit";
import { useNavigate } from "react-router-dom";
import { AORMS_CONSULTANCY, AORMS_STUDIO } from "../../lib/product-nomenclature.js";

export type MarketingConversionDockVariant = "default" | "platform-apps";

/** Global conversion CTAs on marketing pages (HCW-UI-UX §9). */
export function MarketingConversionDock({
  variant = "default",
}: {
  variant?: MarketingConversionDockVariant;
}) {
  const navigate = useNavigate();

  useScreenActions(
    variant === "platform-apps"
      ? [
          {
            id: "aorms-studio",
            label: AORMS_STUDIO.title,
            zone: "center",
            tone: "primary",
            onClick: () => {
              window.location.href = AORMS_STUDIO.appUrl;
            },
          },
          {
            id: "aorms-consultancy",
            label: AORMS_CONSULTANCY.title,
            zone: "center",
            tone: "primary",
            onClick: () => {
              window.location.href = AORMS_CONSULTANCY.appUrl;
            },
          },
        ]
      : [
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
    [navigate, variant],
  );

  return <ActionDock />;
}
