import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19's react-hooks/set-state-in-effect is too aggressive for
      // legitimate prop-sync patterns (e.g. resetting a form when the project
      // prop changes). Downgrade to warn — we'll fix individual cases as they
      // become real bugs, not lint failures.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
