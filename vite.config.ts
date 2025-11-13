import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import ui from "@nuxt/ui/vite"
import vue from "@vitejs/plugin-vue"
import vueJsx from "@vitejs/plugin-vue-jsx"
import vueDevTools from "vite-plugin-vue-devtools"
import IconsResolver from "unplugin-icons/resolver"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    vueJsx(),
    tailwindcss(),
    Icons({
      autoInstall: true,
      scale: 1.5,
    }),
    ui({
      components: {
        resolvers: [IconsResolver()], // "unplugin-vue-components/vite"
      },
    }),
    vueDevTools(),
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
