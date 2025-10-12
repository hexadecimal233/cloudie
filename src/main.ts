import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"
import router from "./router"
import { loadConfig } from "./utils/config"
import { createI18n } from "vue-i18n"

export const i18n = createI18n({
  legacy: false,
  locale: "en-us",
  fallbackLocale: "en-us",
  messages: {
    // @ts-ignore
    "zh-cn": await import("./assets/i18n/zh-cn.json"),
    // @ts-ignore
    "en-us": await import("./assets/i18n/en-us.json"),
  },
})

const initApp = async () => {
  // 加载配置
  await loadConfig()

  const app = createApp(App)
  app.use(i18n)
  app.use(router)
  app.mount("#app")
}

initApp()
