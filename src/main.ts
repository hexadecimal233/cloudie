import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig, i18n } from "./utils/config"

const initApp = async () => {
  // 加载配置
  await loadConfig()

  const app = createApp(App)
  app.use(i18n)
  app.use(router)
  app.mount("#app")
}

initApp()
