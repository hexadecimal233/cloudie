import { createI18n, I18n } from "vue-i18n"

export let i18n: I18n<any, any, any, any, false>

export const LANGUAGE_OPTIONS = ["zh-CN", "en-US", "zh-TW"] as const

export async function initI18n() {
  i18n = createI18n({
    legacy: false,
    locale: "en-US",
    fallbackLocale: "en-US",
    messages: {
      "zh-CN": await import("@/assets/i18n/zh-CN.json"),
      "zh-TW": await import("@/assets/i18n/zh-TW.json"),
      "en-US": await import("@/assets/i18n/en-US.json"),
    },
  })
}
