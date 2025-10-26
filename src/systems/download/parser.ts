import { getJson, getV2ApiJson } from "@/utils/api"
import { config } from "@/systems/config"
import { Preset, PRESET_ORDER, Track, Transcoding } from "@/utils/types"
import { DownloadTask } from "./download"
import { path } from "@tauri-apps/api"
import * as fs from "@tauri-apps/plugin-fs"
import { Buffer } from "buffer"
import { Command } from "@tauri-apps/plugin-shell"
import { move } from "@/utils/utils"

interface ParsedDownload {
  finalUrl: string
  downloadType: "direct" | "progressive" | "hls" | "ctr-encrypted-hls" | "cbc-encrypted-hls"
  preset: Preset | "none"
}

// get transcodings in descending order of priority
function sortTranscodings(track: Track, protocol?: "progressive" | "hls"): Transcoding[] {
  const transcodings = track.media.transcodings.sort((a: Transcoding, b: Transcoding) => {
    return PRESET_ORDER.indexOf(a.preset) - PRESET_ORDER.indexOf(b.preset)
  })
  if (!protocol) return transcodings
  return transcodings.filter((t: Transcoding) => t.format.protocol === protocol)
}

// TODO: https://developers.soundcloud.com/blog/api-streaming-urls 所述 opus 和 progressive 要没了
// track_authorization only affects get stream from API, transcoding cache is not affected
export async function parseDownload(track: Track, ignoreDirect: boolean = false): Promise<ParsedDownload> {
  // TODO: 自选编码
  // TODO: secret_token参数获取私人下载链接
  if (!ignoreDirect && track["downloadable"] && config.value.preferDirectDownload) {
    // 处理直连下载 TODO: 开设新section
    try {
      const downloadObj = await getV2ApiJson(`/tracks/${track.id}/download`)
      return {
        finalUrl: downloadObj.redirectUri,
        downloadType: "direct",
        preset: "none",
      }
    } catch (err) {
      // 通过API返回的都是has_downloads_left=false，可能404
      throw new Error(
        `Direct Link failed for track ${track.title} - They might not have Artist Pro and hit the 100 download limit. ${err}`,
      )
    }
  }

  for (const trans of sortTranscodings(track, "hls")) {
    console.debug(`Downloading ${trans.preset} encoding for track ${track.title}`)
    const m3u8meta = await getJson(trans.url, true, true)
    return {
      finalUrl: m3u8meta.url,
      downloadType: trans.format.protocol,
      preset: trans.preset,
    }
  }

  console.debug(`Downloading Progressive MP3 encoding for track ${track.title}`)
  const trans = sortTranscodings(track, "progressive")[0] // Progressive 只有一个MP3
  if (trans) {
    const m3u8meta = await getJson(trans.url, true, true)
    return {
      finalUrl: m3u8meta.url,
      downloadType: trans.format.protocol,
      preset: trans.preset,
    }
  }

  throw new Error("No available streams or encrypted")
}

interface DownloadResponse {
  path: string
  origFileName: string | null
}

function getDownloadTitle(task: DownloadTask) {
  switch (config.value.fileNaming) {
    case "title":
      return task.details.title
    case "artist-title":
      return `${task.details.artist} - ${task.details.title}`
    case "title-artist":
      return `${task.details.title} - ${task.details.artist}`
    default:
      return task.details.title
  }
}

async function downloadAac(m3u8Url: string): Promise<string> {
  const fileId = Math.random().toString(16).substring(2, 16)
  const savePath = await path.join(await path.tempDir(), `cloudie_temp_${fileId}.m4a`)
  const cmd = Command.create("ffmpeg", [
    "-y",
    "-loglevel",
    "warning",
    "-i",
    m3u8Url,
    "-bsf:a",
    "aac_adtstoasc", // remove adts headers
    "-c",
    "copy", // copy audio stream
    "-f",
    "mp4", // output as m4a
    savePath, 
  ])

  const proc = await cmd.execute()
  if (proc.code !== 0) {
    console.error(proc.stderr)
    throw new Error(`ffmpeg failed with code ${proc.code}`)
  }

  return savePath
}

// Handle download progressed
async function downloadProgressed(resp: Response, onProgress: (progress: number) => void) {
  if (!resp.body) throw new Error("Response body is null")

  const contentLength = parseInt(resp.headers.get("Content-Length") || "0")
  if (contentLength === 0)
    console.warn("Content-Length is 0, but still called progressed download.")

  const reader = resp.body!.getReader()
  const bytes = new Uint8Array(contentLength)
  let offset = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes.set(value, offset)
    offset += value.length

    if (contentLength > 0) onProgress(offset / contentLength)
  }

  return bytes
}

export async function downloadTrack(
  parsed: ParsedDownload,
  task: DownloadTask,
  onProgress: (progress: number) => void,
) {
  const sanitizer = /[\\/:*?\"<>|]/g
  const safeFileName = getDownloadTitle(task).replace(sanitizer, "_")
  const playlistDir = await path.join(
    config.value.savePath,
    task.details.playlistName?.replace(sanitizer, "_") || "",
  )

  const finalDir = config.value.playlistSeparateDir ? playlistDir : config.value.savePath

  try {
    await fs.mkdir(finalDir, { recursive: true })
  } catch (_) {}

  let origFileName = null
  let ext = ""
  let bytes: Uint8Array

  switch (parsed.downloadType) {
    case "direct": {
      // 直链下载
      // TODO: Error handling if null
      const resp = await fetch(parsed.finalUrl)
      ext = resp.headers.get("x-amz-meta-file-type")!
      origFileName = resp.headers.get("Content-Disposition")!.split("filename*=utf-8''")[1]

      bytes = await downloadProgressed(resp, onProgress)
      break
    }
    case "progressive": {
      const resp = await fetch(parsed.finalUrl)
      ext = "mp3"

      bytes = await downloadProgressed(resp, onProgress)

      break
    }
    case "hls": {
      if (parsed.preset.includes("aac")) {
        // TODO: progress display
        const tempFileName = await downloadAac(parsed.finalUrl)
        const finalPath = await path.join(finalDir, `${safeFileName}.m4a`)

        await move(tempFileName, finalPath)

        return { path: finalPath, origFileName } as DownloadResponse
      } else if (parsed.preset === "opus_0_0" || parsed.preset.includes("mp3")) {
        // Simply appending every chunk to the end of the previous one
        const resp = await fetch(parsed.finalUrl)
        const m3u8 = await resp.text()
        const urls = m3u8.match(/(http)[^\s]*/g) || []
        const urlProgressMap = new Map(urls.map((url) => [url, 0]))

        const promises = urls.map(async (url) => {
          const resp = await fetch(url)
          return downloadProgressed(resp, (currProgress) => {
            urlProgressMap.set(url, currProgress)

            const totalProgress =
              Array.from(urlProgressMap.values()).reduce((sum, p) => sum + p, 0) / urls.length
            onProgress(totalProgress)
          })
        })

        ext = parsed.preset.includes("opus") ? "opus" : "mp3"
        bytes = Buffer.concat(await Promise.all(promises))
      } else {
        throw new Error(`Unknown preset ${parsed.preset}`) // prob abr_sq
      }
      break
    }
    default:
      throw new Error(`Unknown download type ${parsed.downloadType}`)
  }

  const destFile = await path.join(finalDir, `${safeFileName}.${ext}`)
  await fs.writeFile(destFile, bytes)

  return {
    path: destFile,
    origFileName: origFileName,
  } as DownloadResponse
}
