import { createI18n, I18n } from "vue-i18n"

export let i18n: I18n<any, any, any, any, false>

export const LANGUAGE_OPTIONS = ["en", "zh_CN", "zh_TW"] as const

export async function initI18n() {
  i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    messages: {
      zh_CN: await import("@/assets/i18n/zh_CN.json"),
      zh_TW: await import("@/assets/i18n/zh_TW.json"),
      en: await import("@/assets/i18n/en.json"),
    },
  })
}
