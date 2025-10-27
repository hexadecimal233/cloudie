import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"
import Icons from "unplugin-icons/vite"
import Components from "unplugin-vue-components/vite"
import IconsResolver from "unplugin-icons/resolver"

import path from "path"

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async ({ command }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    Icons({
      autoInstall: true,
      scale: 1.5,
    }),
    Components({
      resolvers: [IconsResolver()],
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
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
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
}))
