import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}` },
      // "server-only" solo tiene sentido dentro de Next; en los tests es un módulo vacío.
      { find: "server-only", replacement: `${root}tests/stubs/server-only.ts` },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
