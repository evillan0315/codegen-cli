import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      "*.config.js", // Exclude JS config files if they exist alongside TS config
      "*.mjs", // Exclude ES module files if any special config needed
      "*.cjs", // Exclude CommonJS files if any special config needed
      "package-lock.json",
    ],
  },
  // Global configuration for all files
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // For Node.js environment
        ...globals.browser, // Although it's a CLI tool, some browser globals might accidentally slip in via deps
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  // JavaScript rules (builtin recommended)
  pluginJs.configs.recommended,
  // TypeScript rules
  ...tseslint.configs.recommended, // Uses recommended rules from @typescript-eslint
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Add or override specific TypeScript rules here
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }, // Allow unused args/vars starting with _
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off", // Often too strict for simple functions
      "@typescript-eslint/no-explicit-any": "warn", // Warn on any, don't block
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"], // Prefer interfaces over types for object literals
    },
  },
  // Prettier integration
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      "prettier/prettier": "error",
    },
  },
);
