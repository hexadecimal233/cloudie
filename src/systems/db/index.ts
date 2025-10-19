/**
 * Store track info for accessing track information from download tasks.
 */

import Database from "@tauri-apps/plugin-sql"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { inArray, desc, and } from "drizzle-orm"
import * as schema from "./schema"
import { Playlist, SystemPlaylist, Track } from "@/utils/types"

interface DemoPlaylist {
  title: string
}

export type DownloadTask = typeof schema.downloadTasks.$inferSelect
export interface DownloadDetail extends DownloadTask {
  title: string
  artist: string
  coverUrl: string
  playlistName?: string
  playlist: Playlist | SystemPlaylist | DemoPlaylist
  track: Track
}

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
      console.error("Tauri SQL Execution Error:", error)
      throw error
    }
  },
  { schema },
)

export async function initDb() {
  tauriDb = await Database.load("sqlite:soundcloud.db")

  await tauriDb.execute("PRAGMA optimize;")

  // create default liked playlist
  await db
    .insert(schema.playlists)
    .values({
      playlistId: "liked",
      meta: JSON.stringify({ title: "" }), // empty string for liked playlist
    })
    .onConflictDoNothing()
}

export async function getDownloadDetail(downloadTasks: DownloadTask[]): Promise<DownloadDetail[]> {
  const rawResult = await db.query.downloadTasks.findMany({
    where: and(
      inArray(
        schema.downloadTasks.trackId,
        downloadTasks.map((task) => task.trackId),
      ),
      inArray(
        schema.downloadTasks.playlistId,
        downloadTasks.map((task) => task.playlistId),
      ),
    ),
    with: {
      localTrack: true,
      playlist: true,
    },
  })

  const results: DownloadDetail[] = rawResult.map((row) => {
    const track = JSON.parse(row.localTrack.meta)

    let playlist = JSON.parse(row.playlist.meta)
    let playlistName: string = playlist.title ?? undefined

    return {
      // basic fields
      trackId: row.trackId,
      playlistId: row.playlistId,
      timestamp: row.timestamp,
      origFileName: row.origFileName,
      path: row.path,
      status: row.status as DownloadDetail["status"],
      // details
      title: track.title,
      artist: getArtist(track),
      coverUrl: getCoverUrl(track),
      playlistName: playlistName,
      playlist: playlist,
      track: track,
    }
  })

  return results
}

export async function getDownloadTasks(): Promise<DownloadTask[]> {
  const rawResults = await db.query.downloadTasks.findMany({
    orderBy: [desc(schema.downloadTasks.timestamp)],
  })

  return rawResults
}
