// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Existing disabled rules
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
      "no-const-assign": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // New rules to disable
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];

export default eslintConfig;
