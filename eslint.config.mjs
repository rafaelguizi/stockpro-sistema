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
      // 🔧 TypeScript Rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      
      // 🔧 JavaScript Rules
      "prefer-const": "warn",
      "no-unused-vars": "off", // Desabilitado em favor do TypeScript
      
      // 🔧 React Rules
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "react/jsx-key": "warn",
      
      // 🔧 Next.js Rules
      "@next/next/no-img-element": "warn",
      
      // 🔧 Regras mais flexíveis para produção
      "no-console": "warn",
      "no-debugger": "warn"
    }
  }
];

export default eslintConfig;