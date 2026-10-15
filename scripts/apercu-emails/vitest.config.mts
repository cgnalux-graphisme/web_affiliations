import { defineConfig } from "vitest/config";

// Aperçu des e-mails automatiques : npx vitest run -c scripts/apercu-emails/vitest.config.mts
export default defineConfig({ test: { environment: "node", include: ["scripts/apercu-emails/*.gen.ts"] } });
