/** Vite client types — local shim when `vite` is not installed on the host (Docker-only dev). */
interface ImportMetaEnv {
  readonly VITE_PUBLIC_SITE?: string;
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
  };
  glob(
    pattern: string,
    options?: {
      eager?: boolean;
      query?: string;
      import?: string;
    },
  ): Record<string, unknown>;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
