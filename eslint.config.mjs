import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Extend your base config as usual
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add custom rules to ignore specific errors
  {
    rules: {
      // Ignore explicit 'any' types
      "@typescript-eslint/no-explicit-any": "off",

      // Ignore unused variables (if necessary)
      "@typescript-eslint/no-unused-vars": "off",

      // Ignore unescaped entities in JSX
      "react/no-unescaped-entities": "off",

      'react-hooks/exhaustive-deps': 'off',

      'prefer-const': 'off',

      '@next/next/no-img-element': 'off',

       'jsx-a11y/alt-text': 'off',
    },
  },
];

export default eslintConfig;
