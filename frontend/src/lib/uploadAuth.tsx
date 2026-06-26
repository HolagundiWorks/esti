import { Modal, PasswordInput, Stack } from "@carbon/react";
import { UPLOAD_PASSWORD_FIELD } from "@esti/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiUrl, authHeaders } from "./api-base.js";
import { trpc } from "./trpc.js";
import { useAuth } from "./auth.js";

const CACHE_KEY = "esti.uploadPassword";

function readCached(): string | null {
  try {
    return sessionStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCached(password: string): void {
  try {
    sessionStorage.setItem(CACHE_KEY, password);
  } catch {
    /* private mode */
  }
}

function clearCached(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

type UploadAuthContextValue = {
  uploadRequired: boolean;
  authorizedFetch: (url: string, buildFormData: (fd: FormData) => void) => Promise<Response>;
};

const UploadAuthContext = createContext<UploadAuthContextValue | null>(null);

export function UploadAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const settingsQ = trpc.settings.get.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!user,
  });
  const uploadRequired = settingsQ.data?.uploadPasswordRequired ?? false;

  const [open, setOpen] = useState(false);
  const [wrongHint, setWrongHint] = useState(false);
  const [password, setPassword] = useState("");
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const promptPassword = useCallback((wrong = false) => {
    return new Promise<string | null>((resolve) => {
      setWrongHint(wrong);
      setPassword("");
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const closeModal = (value: string | null) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  const authorizedFetch = useCallback(
    async (url: string, buildFormData: (fd: FormData) => void): Promise<Response> => {
      const attempt = async (pw: string | null) => {
        const fd = new FormData();
        buildFormData(fd);
        if (uploadRequired && pw) fd.append(UPLOAD_PASSWORD_FIELD, pw);
        return fetch(apiUrl(url), { method: "POST", body: fd, credentials: "include", headers: authHeaders() });
      };

      let pw = uploadRequired ? readCached() : null;
      if (uploadRequired && !pw) {
        pw = await promptPassword();
        if (!pw) throw new Error("Upload cancelled");
        writeCached(pw);
      }

      let res = await attempt(pw);
      if (uploadRequired && res.status === 403) {
        const body = (await res.clone().json().catch(() => ({}))) as { error?: string };
        if ((body.error ?? "").toLowerCase().includes("password")) {
          clearCached();
          pw = await promptPassword(true);
          if (!pw) throw new Error("Upload cancelled");
          writeCached(pw);
          res = await attempt(pw);
        }
      }
      return res;
    },
    [uploadRequired, promptPassword],
  );

  const value = useMemo(
    () => ({ uploadRequired, authorizedFetch }),
    [uploadRequired, authorizedFetch],
  );

  return (
    <UploadAuthContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        modalHeading="Upload password required"
        primaryButtonText="Continue"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!password.trim()}
        onRequestClose={() => closeModal(null)}
        onRequestSubmit={() => closeModal(password.trim())}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password.trim()) closeModal(password.trim());
          }}
        >
          <Stack gap={4}>
            <p style={{ margin: 0 }}>
              Your firm requires an upload password before files can be stored. The password is
              remembered for this browser session.
            </p>
            {wrongHint ? (
              <p style={{ margin: 0, color: "var(--cds-text-error)" }}>
                Incorrect password — try again.
              </p>
            ) : null}
            <PasswordInput
              id="upload-password"
              labelText="Upload password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </Stack>
        </form>
      </Modal>
    </UploadAuthContext.Provider>
  );
}

export function useUploadAuth(): UploadAuthContextValue {
  const ctx = useContext(UploadAuthContext);
  if (!ctx) {
    return {
      uploadRequired: false,
      authorizedFetch: async (url, buildFormData) => {
        const fd = new FormData();
        buildFormData(fd);
        return fetch(apiUrl(url), { method: "POST", body: fd, credentials: "include", headers: authHeaders() });
      },
    };
  }
  return ctx;
}
