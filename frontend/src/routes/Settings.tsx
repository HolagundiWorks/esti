import { InlineNotification, Tile, Toggle } from "@carbon/react";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../lib/auth.js";

export function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const setHr = trpc.settings.setHrEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  const isOwner = user?.role === "OWNER";

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: "#6f6f6f", marginBottom: 24 }}>Office configuration.</p>

      <Tile style={{ maxWidth: 560 }}>
        <h4>Team &amp; HR module</h4>
        <p style={{ color: "#6f6f6f", margin: "8px 0 16px" }}>
          Staff register, site-incharge assignment, leaves and salary. Leave this off if you work
          as a solo freelancer — the Team and HR areas stay hidden.
        </p>
        <Toggle
          id="hr-toggle"
          labelText="Enable Team &amp; HR"
          labelA="Off (freelance)"
          labelB="On"
          toggled={settingsQ.data?.hrEnabled ?? false}
          disabled={!isOwner || setHr.isPending || settingsQ.isLoading}
          onToggle={(checked) => setHr.mutate({ hrEnabled: checked })}
        />
        {!isOwner && (
          <p style={{ fontSize: 12, color: "#6f6f6f", marginTop: 12 }}>
            Only the owner can change this.
          </p>
        )}
        {setHr.error && (
          <InlineNotification
            kind="error"
            title="Could not update"
            subtitle={setHr.error.message}
            lowContrast
            hideCloseButton
          />
        )}
      </Tile>
    </div>
  );
}
