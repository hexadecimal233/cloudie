import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig as initConfig } from "./systems/config"
import { initDb } from "./systems/db/db"
import { initDownload } from "./systems/download/download"
import { initMedia } from "./systems/player/playlist"
import { i18n, initI18n } from "./systems/i18n"
import { createVfm } from "vue-final-modal"

async function initApp() {
  // load systems
  await initI18n()
  await initDb()
  await initConfig()
  await initDownload()
  await initMedia()

  const vfm = createVfm()

  const app = createApp(App)
  app.use(i18n)
  app.use(vfm)
  app.use(router)

  app.mount("#app")
}

initApp()
