import { InlineNotification, Loading, Theme } from "@carbon/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { demoLoginPayload } from "../lib/landing-demo.js";
import { trpc } from "../lib/trpc.js";

/** Public /demo deep link — signs into the team demo and drops you in the workspace.
 *  Credentials are hardcoded server-side via demoLoginPayload, never shown to the user. */
export function DemoAutoLogin() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const started = useRef(false);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    login.mutate(demoLoginPayload("team"));
  }, [login]);

  return (
    <Theme theme="g100">
      <div className="esti-demo-launch">
        {login.error ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Could not open the demo"
            subtitle={login.error.message}
          />
        ) : (
          <Loading withOverlay={false} description="Opening the demo workspace…" />
        )}
      </div>
    </Theme>
  );
}
