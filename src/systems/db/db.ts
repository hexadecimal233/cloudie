/**
 * Store track info for accessing track information from download tasks.
 */

import Database from "@tauri-apps/plugin-sql"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import * as schema from "./schema"
import { LikedPlaylist, ListenPlaylist } from "@/utils/types"
import { savePlaylist } from "../cache"

let tauriDb: Database
export const db = drizzle(
  async (sqlStr, params, method) => {
    const bindValues = (params as unknown[]) || []

    try {
      if (method === "all" || method === "values" || method === "get") {
        const rowsOfObjects = await tauriDb.select<Record<string, unknown>[]>(sqlStr, bindValues)

        let results: unknown[] | unknown[][]

        if (method === "get") {
          results = rowsOfObjects.length === 0 ? [] : Object.values(rowsOfObjects[0])
        } else {
          // 返回 Array of Arrays
          results = rowsOfObjects.map((row) => Object.values(row))
        }

        return { rows: results }
      } else {
        await tauriDb.execute(sqlStr, bindValues)
        // 对于 .run()，只需要返回空行数组
        return { rows: [] }
      }
    } catch (error) {
      // error is a string in Tauri SQL plugin
      const theError = new Error(error as string)
      throw theError
    }
  },
  { schema },
)

export async function initDb() {
  tauriDb = await Database.load("sqlite:soundcloud.db")

  await tauriDb.execute("PRAGMA optimize;")

  // create default playlists
  savePlaylist(new ListenPlaylist())
  savePlaylist(new LikedPlaylist())
}
