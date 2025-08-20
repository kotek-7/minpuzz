import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: [json.configs.recommended] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: [json.configs.recommended] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: [json.configs.recommended] },
  eslintConfigPrettier,
);
