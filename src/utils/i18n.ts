import { createI18n, I18n } from "vue-i18n"

export let i18n: I18n

export async function initI18n() {
  i18n = createI18n({
    legacy: false,
    locale: "en-us",
    fallbackLocale: "en-us",
    messages: {
      "zh-cn": await import("../assets/i18n/zh-cn.json"),
      "en-us": await import("../assets/i18n/en-us.json"),
    },
  })
}
