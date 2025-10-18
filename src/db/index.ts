/**
 * Store track info for accessing track information from download tasks.
 */

import Database from "@tauri-apps/plugin-sql"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { getArtist, getCoverUrl } from "../utils/utils"
import { inArray, desc } from "drizzle-orm"
import * as schema from "./schema"

export interface DownloadDetail extends DownloadTask {
  title: string
  artist: string
  coverUrl: string
  playlistName?: string
  playlist?: any
  track: any
}

export const ListeningList = schema.listeningList.$inferSelect
export type DownloadTask = typeof schema.downloadTasks.$inferSelect
export type LocalTrack = typeof schema.localTracks.$inferSelect
export type Playlist = typeof schema.playlists.$inferSelect

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

  /**
   * create table from schema if does not exist
   * Setting up the Database:
   * 1. Make edits in `src/db/schema.ts`
   * 2. Run `pnpm drizzle-kit genrate` to generate the SQL migration file.
   * 3. Paste the SQL migration file into `src/db/index.ts` and manually add `IF NOT EXISTS` to each table creation statement.
   */
  await tauriDb.execute("PRAGMA optimize;")
  await tauriDb.execute(
    "CREATE TABLE IF NOT EXISTS `DownloadTasks` ( `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `trackId` integer NOT NULL, `playlistId` text, `timestamp` integer NOT NULL, `origFileName` text, `path` text NOT NULL, `status` text NOT NULL, FOREIGN KEY (`trackId`) REFERENCES `LocalTracks`(`trackId`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`playlistId`) REFERENCES `Playlists`(`playlistId`) ON UPDATE no action ON DELETE no action ); CREATE TABLE IF NOT EXISTS `ListeningList` ( `trackId` integer PRIMARY KEY NOT NULL, `timestamp` integer NOT NULL, FOREIGN KEY (`trackId`) REFERENCES `LocalTracks`(`trackId`) ON UPDATE no action ON DELETE no action ); CREATE TABLE IF NOT EXISTS `LocalTracks` ( `trackId` integer PRIMARY KEY NOT NULL, `meta` text NOT NULL ); CREATE TABLE IF NOT EXISTS `Playlists` ( `playlistId` text PRIMARY KEY NOT NULL, `meta` text NOT NULL );",
  )
}

export async function getDownloadDetail(trackIds: number[]): Promise<DownloadDetail[]> {
  const rawResult = await db.query.downloadTasks.findMany({
    where: inArray(schema.downloadTasks.trackId, trackIds),
    with: {
      localTrack: true,
      playlist: true,
    },
  })

  const results: DownloadDetail[] = rawResult.map((row) => {
    const track = JSON.parse(row.localTrack.meta)

    let playlistName: string | undefined
    let playlist: any | undefined

    if (row.playlist) {
      playlist = JSON.parse(row.playlist.meta)
      playlistName = playlist.title ?? playlistName
    }

    return {
      // basic fields
      id: row.id,
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
