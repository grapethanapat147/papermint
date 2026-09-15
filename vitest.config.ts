import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Deliberately separate from vite.config.ts. That config loads the Cloudflare
 * and RSC plugins the real build needs, which do not work under jsdom — vitest
 * only needs React fast-refresh-free JSX transform plus a DOM.
 *
 * The tests/*.test.mjs specs run on Node's own test runner (`npm test`) and are
 * excluded here so they are not executed twice.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.tsx"],
    restoreMocks: true,
  },
});
