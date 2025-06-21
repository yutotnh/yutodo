import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. try preferred port but allow fallback to available ports
  server: {
    port: 1420,
    strictPort: false, // Allow automatic port selection if 1420 is unavailable
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Increase chunk size warning limit for Tauri apps
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-fs',
        '@tauri-apps/plugin-opener',
        '@tauri-apps/plugin-clipboard-manager'
      ],
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          i18n: ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
          markdown: ['react-markdown', 'remark-gfm'],
          ui: ['lucide-react', 'react-datepicker']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-opener', '@tauri-apps/plugin-clipboard-manager']
  }
}));
