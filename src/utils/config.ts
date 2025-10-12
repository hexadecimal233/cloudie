import { load, Store } from "@tauri-apps/plugin-store"
import { ref, watch } from "vue"
import { refreshClientId } from "./api"
import { i18n } from "../main"

class Config {
  //外观
  language: "zh-cn" | "en-us" = "zh-cn"
  theme: "light" | "dark" = "light"
  // 下载
  savePath: string = ""
  parallelDownloads: number = 3
  playlistSeparateDir: boolean = true
  preferDirectDownload: boolean = false
  nonMp3Convert: true = true // TODO: 非MP3文件是否转换
  fileNaming: "title-artist" | "artist-title" | "title" = "title-artist"
  addCover: boolean = false // TODO: 下载时是否添加封面
  // 杂项
  analyzeBpmAndKey: boolean = false
  virtualDjSupport: boolean = false
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
  const value = await store.get(key as string)
  if (value === null || value === undefined) {
    return (new Config() as any)[key] as T
  }
  return value as T
}
// 加载所有配置
export async function loadConfig() {
  store = await load("cloudie.json", {
    autoSave: false,
    defaults: new Config() as any,
  }) // Prevent top-level await

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
async function saveConfig(): Promise<void> {
  // 刷新语言
  i18n.global.locale.value = config.value.language

  const currentConfig = config.value

  for (const key of Object.keys(currentConfig) as (keyof Config)[]) {
    await store.set(key, currentConfig[key])
  }

  await store.save()
}
