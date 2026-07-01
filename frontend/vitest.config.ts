import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const raizFrontend = __dirname;
const raizProjeto = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(raizFrontend, "./src"),
    },
  },
  server: {
    fs: {
      allow: [raizProjeto],
    },
  },
  test: {
    root: raizProjeto,
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(raizFrontend, "./src/test/setup.ts")],
    include: ["testes/frontend/**/*.test.{ts,tsx}"],
  },
});
