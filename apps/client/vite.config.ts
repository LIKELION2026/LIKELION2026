import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@likelion2026/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url)
      )
    }
  }
});
