# AORMS Lite — installer + Google auth setup

This documents the two operator-supplied pieces behind the landing **"Download
AORMS Lite"** button and Google sign-in. The code seams are in place; the items
below need credentials / a build host that only you can provide.

## 1. Build the AORMS Lite installer

The native desktop app lives in `desktop/` (Tauri 2 + Rust shell that supervises
the bundled backend/frontend). To produce a Windows installer:

```bash
cd desktop
node scripts/preflight.mjs        # checks Rust + toolchain
node scripts/build-frontend.mjs   # builds the web bundle
node scripts/bundle-backend.mjs   # bundles the backend
npm run tauri build               # → desktop/src-tauri/target/release/bundle/
```

Output: `…/bundle/nsis/AORMS_Lite_x64-setup.exe` (or `…/msi/*.msi`). First build
is slow (Rust compile); signing requires your code-signing certificate.

> This build needs the Rust/Tauri toolchain on a Windows host and a signing cert
> — it cannot be produced in the CI sandbox. Build it on your machine.

## 2. Host it for download

The landing button (`MarketingHero.tsx`) links to `VITE_LITE_DOWNLOAD_URL`,
defaulting to **`/downloads/aorms-lite-setup.exe`**. Two options:

- **Static path (default):** drop the signed installer at
  `frontend/public/downloads/aorms-lite-setup.exe` (served as `/downloads/…`).
- **External host (CDN / releases):** set `VITE_LITE_DOWNLOAD_URL=https://…`
  at build time and the button points there.

## 3. Configure Google OAuth

The licensing platform's Google flow is already wired
(`backend/src/licensing-platform/routes/auth.ts`, mounted at
`/platform/auth/google/start` → `/platform/auth/google/callback`). It reads three
env vars and **degrades gracefully when unset** (returns "Google login not
configured"). To turn it on:

1. In **Google Cloud Console → APIs & Services → Credentials**, create an
   **OAuth 2.0 Client ID** (type *Web application*).
2. Add the authorized redirect URI — must match `GOOGLE_REDIRECT_URI` below,
   e.g. `https://<your-host>/platform/auth/google/callback`.
3. Set these env vars on the backend (never commit them):

   ```
   GOOGLE_CLIENT_ID=<your client id>
   GOOGLE_CLIENT_SECRET=<your client secret>
   GOOGLE_REDIRECT_URI=https://<your-host>/platform/auth/google/callback
   ```

4. Restart the backend. `/platform/auth/google/start` now redirects to Google.

> Creating the OAuth client and holding the secret are yours to do — the
> assistant cannot create Google accounts or handle the client secret. Only the
> three env vars above are required; no code change.

*Last updated: 2026-06-30*
