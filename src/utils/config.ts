import { load, Store } from "@tauri-apps/plugin-store"
import { ref, watch } from "vue"
import { refreshClientId } from "./api"

interface Config {
  // 下载
  savePath: string
  parallelDownloads: number
  playlistSeparateDir: boolean
  preferDirectDownload: boolean
  nonMp3Convert: true // TODO: 非MP3文件是否转换
  fileNaming: "title-artist" | "artist-title" | "title"
  addCover: boolean // TODO: 下载时是否添加封面
  // 杂项
  analyzeBpmAndKey: boolean
  virtualDjSupport: boolean
  // 登录
  clientId: string
  oauthToken: string
}

// 默认配置
const defaultConfig: Config = {
  savePath: "",
  parallelDownloads: 3,
  playlistSeparateDir: true,
  preferDirectDownload: false,
  nonMp3Convert: true,
  addCover: false,
  fileNaming: "title-artist",
  analyzeBpmAndKey: false,
  virtualDjSupport: false,
  clientId: "",
  oauthToken: "",
}

let store: Store

// 响应式配置
export const config = ref(defaultConfig)
watch(config, saveConfig, { deep: true })

// 读取配置属性值
async function getConfigValue<T>(key: keyof Config): Promise<T> {
  const value = await store.get(key as string)
  if (value === null || value === undefined) {
    return defaultConfig[key] as T
  }
  return value as T
}

// 加载所有配置
export async function loadConfig() {
  store = await load("cloudie.json", {
    autoSave: false,
    defaults: defaultConfig as { [key: string]: any },
  }) // Prevent top-level await

  const cfg: Partial<Config> = {}

  for (const key of Object.keys(defaultConfig) as (keyof Config)[]) {
    cfg[key] = await getConfigValue(key)
  }

  config.value = cfg as Config

  // 初始化后刷新 client_id
  if (!cfg.clientId) {
    await refreshClientId()
  }
}

// 保存所有配置
async function saveConfig(): Promise<void> {
  const currentConfig = config.value

  for (const key of Object.keys(currentConfig) as (keyof Config)[]) {
    await store.set(key, currentConfig[key])
  }

  await store.save()
}
