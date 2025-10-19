import { defineConfig } from "drizzle-kit"
import { identifier } from "./src-tauri/tauri.conf.json"
import os from "os"
import path from "path"

// https://v2.tauri.app/reference/javascript/api/namespacepath/#datadir
function getDataDir(): string {
  const platform = os.platform()
  const packageName = identifier
  let dataDir: string

  switch (platform) {
    case "win32":
      dataDir = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
      break
    case "darwin":
      dataDir = path.join(os.homedir(), "Library", "Application Support")
      break
    case "linux":
    default:
      dataDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
  }

  return path.join(dataDir, packageName)
}

export default defineConfig({
  out: "./src-tauri/drizzle",
  schema: "./src/systems/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(getDataDir(), "soundcloud.db"),
  },
})
