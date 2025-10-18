import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig as initConfig } from "./systems/config"
import { addCollection } from "@iconify/vue"
import mdi from "@iconify-json/mdi/icons.json"
import { initDb } from "./systems/db"
import { initDownload } from "./systems/download/download"
import { i18n, initI18n } from "./systems/i18n"
import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log"

function forwardConsole(
  fnName: "log" | "debug" | "info" | "warn" | "error",
  logger: (message: string) => Promise<void>,
) {
  const original = console[fnName]
  console[fnName] = (message) => {
    original(message)
    logger(message)
  }
}

async function initApp() {
  // redir console to tauri
  forwardConsole("log", trace)
  forwardConsole("debug", debug)
  forwardConsole("info", info)
  forwardConsole("warn", warn)
  forwardConsole("error", error)

  // load systems
  await initI18n()
  await initDb()
  await initConfig()
  await initDownload()

  addCollection(mdi) // TODO: dynamically load icon collections to cut down bundle size

  const app = createApp(App)
  app.use(i18n)
  app.use(router)

  app.mount("#app")
}

initApp()
