/** Vite client types — local shim when `vite` is not installed on the host (Docker-only dev). */

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
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

declare module "*.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
