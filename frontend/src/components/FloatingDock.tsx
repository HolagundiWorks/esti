import { Button, Stack, Tile, Toggle } from "@carbon/react";
import { Calculator, Settings } from "@carbon/icons-react";
import { can } from "@esti/contracts";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";
import { trpc } from "../lib/trpc.js";
import { FloatingCalculator } from "./FloatingCalculator.js";
import { ScrollAffordance } from "./ScrollAffordance.js";

export function FloatingDock() {
  const [showSettings, setShowSettings] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);

  // Alt+S settings, Alt+C calculator.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "s" || e.key === "S") { e.preventDefault(); setShowSettings((o) => !o); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setShowCalc((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="esti-dock">
        <Button
          ref={settingsTriggerRef}
          hasIconOnly renderIcon={Settings} size="sm"
          iconDescription="Settings (Alt+S)" tooltipPosition="right"
          kind={showSettings ? "primary" : "ghost"}
          onClick={() => setShowSettings((o) => !o)}
        />
        <Button
          ref={calcTriggerRef}
          hasIconOnly renderIcon={Calculator} size="sm"
          iconDescription="Calculator (Alt+C)" tooltipPosition="right"
          kind={showCalc ? "primary" : "ghost"}
          onClick={() => setShowCalc((o) => !o)}
        />
      </div>

      <FloatingSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        triggerRef={settingsTriggerRef}
      />
      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
    </>
  );
}

function FloatingSettings({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = can(user?.role, "firm:admin");
  const settingsQ = trpc.settings.get.useQuery(undefined, {
    enabled: isAdmin,
  });
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  useDismissOnOutsideClick(open, onClose, [panelRef, triggerRef]);

  if (!open) return null;

  return (
    <div ref={panelRef} className="esti-float-widget esti-float-settings">
      <Tile className="esti-float-panel-shell">
        <ScrollAffordance>
          <Stack gap={5}>
            <h4>Settings</h4>
            {isAdmin && (
              <Stack gap={4}>
                <h4>Studio Abstract sections</h4>
                <Stack gap={4}>
                  <Toggle
                    id="dock-db-financial"
                    size="sm"
                    labelText="Financial"
                    labelA="Off"
                    labelB="On"
                    toggled={showFinancial}
                    disabled={setModule.isPending || settingsQ.isLoading}
                    onToggle={(c) =>
                      setModule.mutate({ module: "financial", enabled: c })
                    }
                  />
                  <Toggle
                    id="dock-db-project"
                    size="sm"
                    labelText="Project"
                    labelA="Off"
                    labelB="On"
                    toggled={showProject}
                    disabled={setModule.isPending || settingsQ.isLoading}
                    onToggle={(c) =>
                      setModule.mutate({ module: "project", enabled: c })
                    }
                  />
                </Stack>
              </Stack>
            )}
            <p>Display name and password are on the full profile page.</p>
            <Button
              as={Link}
              to="/settings"
              kind="ghost"
              size="sm"
              onClick={onClose}
            >
              Open my profile
            </Button>
          </Stack>
        </ScrollAffordance>
      </Tile>
    </div>
  );
}
