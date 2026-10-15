// Relecteur automatique du code (ESLint) : règles recommandées par Next.js (React, accessibilité, performances
// des pages) et TypeScript. Lancer : npm run lint. Mis en place le 15/10/2026.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Textes en français : les apostrophes dans le JSX s'affichent correctement, la règle n'apporte rien.
      "react/no-unescaped-entities": "off",
      // Conseils du compilateur React : signalés, sans bloquer (cas relus le 15/10/2026, aucun bug).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Une variable préfixée par « _ » est volontairement ignorée (ex. retirer un champ d'un objet).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    // PDF (@react-pdf/renderer) : l'élément Image n'a pas d'attribut alt.
    files: ["lib/**/pdf/**", "lib/pdf/**", "lib/rapport/**", "lib/fiches-suivi/**"],
    rules: { "jsx-a11y/alt-text": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".worktrees/**", "node_modules/**", "scripts/**"]),
]);
