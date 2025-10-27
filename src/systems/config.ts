import { load, Store } from "@tauri-apps/plugin-store"
import { ref, watch } from "vue"
import { refreshClientId } from "@/utils/api"
import { i18n, LANGUAGE_OPTIONS } from "./i18n"
import { PlayOrder } from "./player/playlist"
import { FileNaming } from "./download/parser"

export const THEMES = [
  "cloudie",
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "caramellatte",
  "abyss",
  "silk",
] as const

type Theme = (typeof THEMES)[number]

class Config {
  // Player
  listenIndex: number = -1 // Visible via AudioPlayer
  playOrder: PlayOrder = PlayOrder.Ordered // Visible via AudioPlayer
  // 外观
  language: (typeof LANGUAGE_OPTIONS)[number] = "en"
  theme: Theme = "cloudie"
  // 下载
  savePath: string = ""
  parallelDownloads: number = 3
  playlistSeparateDir: boolean = true
  preferDirectDownload: boolean = false
  mp3ConvertExts: string[] = [] // TODO: 转换以下扩展名到 MP3 (警告: 有损压缩) + details
  fileNaming: FileNaming = FileNaming.TitleArtist
  addCover: boolean = false
  // 杂项
  analyzeBpmAndKey: boolean = false // TODO: unimplemented
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

// 保存所有配置
async function saveConfig() {
  // Refresh display language
  i18n.global.locale.value = config.value.language
  // Update theme class
  document.documentElement.setAttribute("data-theme", config.value.theme)

  const currentConfig = config.value

  for (const key of Object.keys(currentConfig) as (keyof Config)[]) {
    await store.set(key, currentConfig[key])
  }

  await store.save()
}
