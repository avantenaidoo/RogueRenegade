import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // FORCE Vite to rebuild monaco-editor deps from scratch every time (kills old 0.55.1 cache)
  optimizeDeps: {
    force: true,                    // This is the key line - re-optimizes ALL deps on every server start
    include: ['monaco-editor', '@monaco-editor/react'],  // Explicitly target monaco
  },

  // Prevent externalizing monaco during build
  build: {
    rollupOptions: {
      external: [],
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,

    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,

    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});