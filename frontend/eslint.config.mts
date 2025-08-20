import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import css from "@eslint/css";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { fileURLToPath } from "node:url";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: fileURLToPath(import.meta.url),
      },
    },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: [json.configs.recommended],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: [json.configs.recommended],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: [json.configs.recommended],
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: [css.configs.recommended],
  },
  eslintConfigPrettier,
);
