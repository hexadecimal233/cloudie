import { eq } from "drizzle-orm"
import { db } from "../db/db"
import { m3u8Cache } from "../db/schema"
import { Track } from "@/utils/types"

import { parseHlsLink } from "../download/parser"
import * as fs from "@tauri-apps/plugin-fs"
import * as path from "@tauri-apps/api/path"

export class M3U8CacheManager {
  async getTrackLink(track: Track, forceRefresh: boolean = false) {
    // Try to get the M3U8 from the database
    const result = await db.select().from(m3u8Cache).where(eq(m3u8Cache.trackId, track.id)).limit(1)
    if (result.length > 0 && !forceRefresh) {
      return result[0].m3u8
    } else {
      // If not in cache or force refresh, fetch and cache it
      const m3u8Url = await parseHlsLink(track)
      const response = await fetch(m3u8Url)
      const m3u8Text = await response.text()

      // Cache the M3U8 text in the database
      await db
        .insert(m3u8Cache)
        .values({
          trackId: track.id,
          m3u8: m3u8Text,
        })
        .onConflictDoUpdate({
          target: m3u8Cache.trackId,
          set: {
            m3u8: m3u8Text,
          },
        })

      return m3u8Text
    }
  }

  async getFilePath(trackId: number, segmentUrl: string) {
    const cacheDir = await path.appCacheDir()

    const regex = /(data\d+\.m4s)/
    const match = segmentUrl.match(regex)

    let segmentName: string
    if (match) {
      segmentName = match[1]
    } else if (segmentUrl.includes("init.mp4")) {
      segmentName = "init.mp4"
    } else {
      const sanitizer = /[\\/:*?"<>|]/g
      segmentName = segmentUrl.replaceAll(sanitizer, "_")
      console.error(
        "Warning: cannot match the segment name in segment url, falling back to raw text",
      )
    }

    const segmentDir = await path.join(cacheDir, "segments")
    const trackDir = await path.join(segmentDir, trackId.toString())
    try {
      await fs.mkdir(trackDir, { recursive: true })
    } catch (_) {
      // Directory already exists or creation failed
    }
    const cachePath = await path.join(trackDir, `${trackId}_${segmentName}`)
    return cachePath
  }

  async getSegmentCache(trackId: number, segmentUrl: string) {
    try {
      const data = await fs.readFile(await this.getFilePath(trackId, segmentUrl))
      return data
    } catch (_) {
      return null
    }
  }

  async setSegmentCache(trackId: number, segmentUrl: string, data: ArrayBuffer) {
    await fs.writeFile(await this.getFilePath(trackId, segmentUrl), new Uint8Array(data))
  }
}

export const M3U8_CACHE_MANAGER = new M3U8CacheManager()
