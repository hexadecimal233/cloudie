import { load, Store } from "@tauri-apps/plugin-store"
import { ref, watch } from "vue"
import { refreshClientId } from "@/utils/api"
import { i18n, LANGUAGE_OPTIONS } from "./i18n"
import { PlayOrder } from "./player/listening-list"
import { FileNaming } from "./download/parser"
import { useColorMode, useDebounceFn, useThrottleFn } from "@vueuse/core"

export const THEMES = ["cloudie", "cloudie-dark"] as const

type Theme = (typeof THEMES)[number]

class Config {
  // Player
  listenIndex: number = -1 // Visible via AudioPlayer
  playOrder: PlayOrder = PlayOrder.Ordered // Visible via AudioPlayer
  noHistory: boolean = false // TODO: no history
  // 外观
  language: (typeof LANGUAGE_OPTIONS)[number] = "en"
  theme: Theme = "cloudie"
  // 下载
  savePath: string = ""
  parallelDownloads: number = 3
  playlistSeparateDir: boolean = true
  preferDirectDownload: boolean = false
  mp3ConvertExts: string[] = []
  fileNaming: FileNaming = FileNaming.TitleArtist
  addCover: boolean = false
  // 杂项
  virtualDjSupport: boolean = false // TODO: unimplemented
  // 登录
  clientId: string = ""
  oauthToken: string = ""

  constructor(init?: Partial<Config>) {
    if (init) {
      Object.assign(this, init)
    }
  }
}

let store: Store
const appConfig = useAppConfig()
const colorMode = useColorMode()

// 响应式配置
export const config = ref(new Config())
watch(config, saveConfig, { deep: true })

// 读取配置属性值
async function getConfigValue<T>(key: keyof Config): Promise<T> {
  store = await load("cloudie.json", {
    autoSave: false,
    defaults: new Config() as any,
  })

  const value = await store.get(key as string)
  if (value === null || value === undefined) {
    return (new Config() as any)[key] as T
  }
  return value as T
}
// 加载所有配置
export async function loadConfig() {
  const cfg: Partial<Config> = {}

  for (const key of Object.keys(new Config() as any) as (keyof Config)[]) {
    cfg[key] = await getConfigValue(key)
  }

  config.value = cfg as Config

  // 初始化后如果没有 client_id 则刷新
  if (!cfg.clientId) {
    await refreshClientId()
  }
}

// Save all config with a debounce
const writeConfig = useDebounceFn(async () => {
  for (const key of Object.keys(config.value) as (keyof Config)[]) {
    await store.set(key, config.value[key])
  }

  await store.save()
}, 3000)

async function saveConfig() {
  // Refresh display language
  i18n.global.locale.value = config.value.language
  // Update theme
  switch (config.value.theme) {
    case "cloudie":
      colorMode.value = "light"

      appConfig.ui.colors.primary = "cloudie-primary"
      appConfig.ui.colors.secondary = "cloudie-secondary"
      appConfig.ui.colors.info = "cloudie-info"
      appConfig.ui.colors.success = "cloudie-success"
      appConfig.ui.colors.warning = "cloudie-warning"
      appConfig.ui.colors.error = "cloudie-error"

      appConfig.ui.colors.neutral = "stone"
      document.documentElement.style.setProperty("--ui-radius", `0.5rem`) // didnt find a way to set radius in appConfig
      break
    case "cloudie-dark":
      colorMode.value = "dark"

      appConfig.ui.colors.primary = "cloudie-primary"
      appConfig.ui.colors.secondary = "cloudie-secondary"
      appConfig.ui.colors.info = "cloudie-info"
      appConfig.ui.colors.success = "cloudie-success"
      appConfig.ui.colors.warning = "cloudie-warning"
      appConfig.ui.colors.error = "cloudie-error"

      appConfig.ui.colors.neutral = "stone"
      document.documentElement.style.setProperty("--ui-radius", `0.5rem`) // didnt find a way to set radius in appConfig
      break
  }

  await writeConfig()
}
