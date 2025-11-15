import { createI18n, I18n } from "vue-i18n"

export let i18n: I18n<any, any, any, any, false>

export const LANGUAGE_OPTIONS = ["en", "zh-CN"] as const

// import dayjs stuff
import "dayjs/locale/zh-cn"
import "dayjs/locale/en"

export async function initI18n() {
  i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    messages: {
      "zh-CN": await import("@/assets/i18n/zh-CN.json"),
      en: await import("@/assets/i18n/en.json"),
    },
  })
}
