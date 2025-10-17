/**
 * Store track info for accessing track information from download tasks.
 */

import Database from "@tauri-apps/plugin-sql"
import { getArtist, getCoverUrl } from "./utils"

export const db = await Database.load("sqlite:soundcloud.db")

export interface LocalTrack {
  trackId: number
  meta: string // the stringified track object
}

export interface Playlist {
  playlistId: string // soundcloud URN, might be system-playlist or playlist
  meta: string // the stringified playlist object
}

export interface DownloadTask {
  trackId: number
  playlistId?: string // whether it is in a playlist
  timestamp: number
  origFileName?: string // the file name if it's a direct link dl
  path?: string
  status: "pending" | "getinfo" | "downloading" | "paused" | "completed" | "failed"
}

export interface DownloadDetail extends DownloadTask {
  title: string
  artist: string // TODO: open track in explorer
  coverUrl: string
  playlistName?: string
  playlist?: any // null if not in a playlist
  track: any
}

const CURRENT_SCHEMA_VERSION = 2

async function initDB() {
  console.log("Initializing database schema...")

  await db.execute(`
    PRAGMA optimize;
    CREATE TABLE IF NOT EXISTS "LocalTracks" (
    	"trackId" INTEGER NOT NULL,
    	"meta" TEXT NOT NULL,
    	PRIMARY KEY("trackId")
    );

    CREATE TABLE IF NOT EXISTS "Playlists" (
    	"playlistId" TEXT NOT NULL,
    	"meta" TEXT NOT NULL,
    	PRIMARY KEY("playlistId")
    );

    CREATE TABLE IF NOT EXISTS "DownloadTasks" (
    	"trackId" INTEGER NOT NULL,
    	"playlistId" TEXT,
    	"timestamp" INTEGER NOT NULL,
    	"origFileName" TEXT,
    	"path" TEXT NOT NULL,
    	"status" TEXT NOT NULL,
    	PRIMARY KEY("trackId"),
    	FOREIGN KEY ("trackId") REFERENCES "LocalTracks"("trackId")
    	ON UPDATE NO ACTION ON DELETE NO ACTION,
    	FOREIGN KEY ("playlistId") REFERENCES "Playlists"("playlistId")
    	ON UPDATE NO ACTION ON DELETE NO ACTION
    );
  `)
}

await initDB()

// Get download detail for certain task(s)
export async function getDownloadDetail(trackIds: number[]): Promise<DownloadDetail[]> {
  const placeholders = trackIds.map(() => "?").join(", ")

  const query = `
    SELECT
      T.*,
      L.meta AS trackMeta,
      P.meta AS playlistMeta
    FROM DownloadTasks T
    JOIN LocalTracks L ON T.trackId = L.trackId
    LEFT JOIN Playlists P ON T.playlistId = P.playlistId
    WHERE T.trackId IN (${placeholders});
  `

  const rawResult = (await db.select(query, trackIds)) as any[]

  const results: DownloadDetail[] = rawResult.map((row) => {
    const track = JSON.parse(row.trackMeta)

    let playlistName: string | undefined
    let playlist: any | undefined
    if (row.playlistMeta) {
      playlist = JSON.parse(row.playlistMeta)
      playlistName = playlist.title ?? playlistName
    }

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

// Get download tasks  in descending order of timestamp
export async function getDownloadTasks(): Promise<DownloadTask[]> {
  const query = `
    SELECT * FROM DownloadTasks
    ORDER BY timestamp DESC;
  `

  const rawResults = (await db.select(query)) as any[]

  const downloadDetails: DownloadTask[] = rawResults.map((row) => {
    return {
      trackId: row.trackId,
      playlistId: row.playlistId,
      timestamp: row.timestamp,
      origFileName: row.origFileName,
      path: row.path,
      status: row.status as DownloadDetail["status"],
    }
  })

  return downloadDetails
}
