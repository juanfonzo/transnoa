import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["prisma/seed.js"],
    rules: {
      // El seed se ejecuta como CommonJS mediante `node prisma/seed.js`.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "src/app/administracion/RenditionBulkForm.tsx",
      "src/app/solicitudes/SolicitudWizard.tsx",
    ],
    rules: {
      // Deuda previa del POC: mantener visible hasta refactorizar la sincronización de estado.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

