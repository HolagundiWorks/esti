import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "htdocs/**",
      "worker/**",
      "**/*.config.{js,ts}",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node.js build/ops scripts (run with `node`, not bundled by Vite/tsc).
    files: ["**/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
  {
    // React lives in the frontend app and in the shared UI kit (packages/hcw-ui-kit),
    // so the Rules of Hooks apply to both — lint the kit like a first-class surface.
    files: ["frontend/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    // Keep the two classic rules the codebase is written against. react-hooks 7's
    // recommended preset adds several stricter rules (set-state-in-effect, etc.)
    // that flag many pre-existing patterns — adopting them is a separate,
    // behavior-affecting pass, not part of the toolchain bump.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      // New in eslint 10 (core recommended). Flags the common, readable
      // `let ok = false; try { ok = verify() } catch { return } ` defensive-init
      // idiom used in signature verification — off to avoid restructuring
      // security-sensitive code for a stylistic rule.
      "no-useless-assignment": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
