import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig as initConfig } from "./systems/config"
import { initDb } from "./systems/db"
import { initDownload } from "./systems/download/download"
import { i18n, initI18n } from "./systems/i18n"

async function initApp() {
  // load systems
  await initI18n()
  await initDb()
  await initConfig()
  await initDownload()

  const app = createApp(App)
  app.use(i18n)
  app.use(router)

  app.mount("#app")
}

initApp()
