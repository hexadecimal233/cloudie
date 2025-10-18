import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig as initConfig } from "./utils/config"
import { addCollection } from "@iconify/vue"
import mdi from "@iconify-json/mdi/icons.json"
import { initDb } from "./db"
import { initDownload } from "./download/download"
import { i18n, initI18n } from "./utils/i18n"

const initApp = async () => {
  // 加载数据库，配置，图标
  await initI18n()
  await initDb()
  await initConfig()
  await initDownload()

  addCollection(mdi) // TODO: dynamically load icon collections

  const app = createApp(App)
  app.use(i18n)
  app.use(router)
  app.mount("#app")
}

initApp()
