import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Production build is served by Django: assets under /static/frontend/,
// index.html at the site root. Keep in sync with FRONTEND_BUILD_DIR in settings.py.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/static/frontend/" : "/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "../static/frontend"),
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 5173,
  },
  preview: {
    port: 5173,
  },
}));
