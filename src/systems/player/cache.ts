import { eq } from "drizzle-orm"
import { db } from "../db/db"
import { m3u8Cache } from "../db/schema"
import { Track } from "@/utils/types"

import { parseHlsLink } from "../download/parser"
import * as fs from "@tauri-apps/plugin-fs"
import * as path from "@tauri-apps/api/path"

export class M3U8CacheManager {
  // FIXME: M3U8 link may expire and create 403s if not fully loaded
  async getTrackLink(track: Track) {
    // Try to get the M3U8 from the database
    const result = await db.select().from(m3u8Cache).where(eq(m3u8Cache.trackId, track.id)).limit(1)

    if (result.length > 0) {
      return result[0].m3u8
    } else {
      // If not in cache or error, fetch and cache it
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

  async getFilePath(segmentUrl: string) {
    const cacheDir = await path.appCacheDir()
    // Create a safe filename by hashing the URL
    const urlHash = await this.hashString(segmentUrl)
    const segmentDir = await path.join(cacheDir, "segments")
    try {
      await fs.mkdir(segmentDir)
    } catch (_) {
      // Directory already exists or creation failed
    }
    const cachePath = await path.join(segmentDir, urlHash)
    return cachePath
  }

  async getSegmentCache(segmentUrl: string) {
    try {
      const data = await fs.readFile(await this.getFilePath(segmentUrl))
      return data
    } catch (_) {
      return null
    }
  }

  async setSegmentCache(segmentUrl: string, data: ArrayBuffer) {
    await fs.writeFile(await this.getFilePath(segmentUrl), new Uint8Array(data))
  }

  // Helper method to create a hash from a string
  private async hashString(str: string): Promise<string> {
    // Convert string to bytes
    const encoder = new TextEncoder()
    const data = encoder.encode(str)

    // Use crypto API to create a hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = btoa(String.fromCharCode(...hashArray)).replaceAll("/", "_")

    return hashHex
  }
}

export const M3U8_CACHE_MANAGER = new M3U8CacheManager()
