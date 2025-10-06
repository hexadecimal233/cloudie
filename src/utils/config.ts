import { load, Store } from "@tauri-apps/plugin-store"
import { ref } from "vue"
import { setApi } from "./api"

export interface Config {
  // 下载
  savePath: string
  parallelDownloads: number
  playlistSeparateDir: boolean
  preferDirectDownload: boolean
  // 杂项
  analyzeBpmAndKey: boolean
  virtualDjSupport: boolean
  // 登录
  clientId: string
  oauthToken: string
}

// 创建默认配置对象，具有字符串索引签名
export const defaultConfig: { [key: string]: unknown } & Config = {
  savePath: "",
  parallelDownloads: 3,
  playlistSeparateDir: true,
  preferDirectDownload: false,
  analyzeBpmAndKey: false,
  virtualDjSupport: false,
  clientId: "",
  oauthToken: "",
}

let store: Store

// Defaults are defined so if new entries are added = crash?
async function getConfigValue<T>(key: keyof Config): Promise<T> {
  const value = await store.get(key as string)
  if (value === null || value === undefined) {
    return defaultConfig[key] as T
  }
  return value as T
}

export async function loadConfig(): Promise<Config> {
  store = await load("cloudie.json", {
    autoSave: false,
    defaults: defaultConfig,
  }) // Prevent top-level await

  const config: Partial<Config> = {}

  // Automatically iterate through all Config keys
  for (const key of Object.keys(defaultConfig) as (keyof Config)[]) {
    config[key] = await getConfigValue(key)
  }

  updateApi(config as Config)
  return config as Config
}

// Initialize configuration with automatic loading
export const config = ref<Config>(defaultConfig)

// Save configuration with automatic property iteration
export async function saveConfig(): Promise<void> {
  updateApi(config.value)

  const currentConfig = config.value

  // Automatically save all configuration properties
  for (const key of Object.keys(currentConfig) as (keyof Config)[]) {
    await store.set(key, currentConfig[key])
  }

  await store.save()
}

function updateApi(config: Config) {
  setApi(config.clientId, config.oauthToken)
}
