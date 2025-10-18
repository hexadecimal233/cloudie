// TODO: playlist downloader
// TODO: optimize the database operations

import { ref, watch } from "vue"
import { getJson, getV2ApiJson } from "./api"
import { invoke } from "@tauri-apps/api/core"
import { config } from "./config"
import { getArtist } from "./utils"
import { db, DownloadTask, getDownloadDetail, getDownloadTasks } from "@/db"
import * as schema from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * 下载管理器部分
 */

interface DownloadResponse {
  path: string
  origFileName: string
}

export const downloadTasks = ref<DownloadTask[]>(await getDownloadTasks())
watch(downloadTasks, tryRunTask, { deep: true })
function getDownloadTitle(track: any) {
  switch (config.value.fileNaming) {
    case "title":
      return track.title
    case "artist-title":
      return `${getArtist(track)} - ${track.title}`
    case "title-artist":
      return `${track.title} - ${getArtist(track)}`
    default:
      return track.title
  }
}

async function updateDownloadDBEntry(params: DownloadTask) {
  await db
    .update(schema.downloadTasks)
    .set({
      path: params.path,
      origFileName: params.origFileName,
      status: params.status,
    })
    .where(eq(schema.downloadTasks.id, params.id))
}

// TODO: currently using demo playlist, and playlist currently passed as a string
export async function addDownloadTask(track: any, playlist: any) {
  // TODO: do download after playlist & track id checks
  let playlistId: string | null = null
  if (typeof playlist === "string") {
    playlistId = playlist
    const objTemp = { title: playlist }
    await db.insert(schema.playlists).values({
      playlistId,
      meta: JSON.stringify(objTemp),
    })
  }

  const task: typeof schema.downloadTasks.$inferInsert = {
    trackId: track.id,
    playlistId: playlistId,
    timestamp: Date.now(),
    origFileName: null,
    path: "",
    status: "pending",
  }

  await db.insert(schema.localTracks).values({
    trackId: task.trackId,
    meta: JSON.stringify(track),
  })
  const insertedTask = await db.insert(schema.downloadTasks).values(task).returning()

  console.log(insertedTask)
  downloadTasks.value.push(insertedTask[0])
}

export async function resumeDownload(id: number) {
  const task = downloadTasks.value.find((t) => t.id === id)
  if (task) {
    task.status = "pending"
    await updateDownloadDBEntry(task)
  }
}

export async function deleteTask(id: number) {
  await db.delete(schema.downloadTasks).where(eq(schema.downloadTasks.id, id))

  downloadTasks.value = downloadTasks.value.filter((t) => t.id !== id)
}

export async function deleteAllTasks() {
  await db.delete(schema.downloadTasks)

  downloadTasks.value = []
}

function tryRunTask() {
  const pendingTasks = downloadTasks.value.filter((t) => t.status === "pending")
  const runningTasks = downloadTasks.value.filter(
    (t) => t.status === "getinfo" || t.status === "downloading",
  )

  const availableSlots = Math.max(0, config.value.parallelDownloads - runningTasks.length)
  const tasksToRun = pendingTasks.sort((a, b) => b.timestamp - a.timestamp).slice(0, availableSlots)

  for (const task of tasksToRun) {
    runTask(task)
  }
}

async function runTask(task: DownloadTask) {
  const detail = (await getDownloadDetail([task.trackId]))[0]
  task.status = "getinfo"
  await updateDownloadDBEntry(task)
  // TODO: 已开始下载提示 已完成下载提示

  try {
    const info = await getDownloadInfo(detail.track)
    task.status = "downloading"
    await updateDownloadDBEntry(task)

    try {
      const response = await invoke<DownloadResponse>("download_track", {
        finalUrl: info.finalUrl,
        downloadType: info.downloadType,
        preset: info.preset,
        title: getDownloadTitle(detail.track),
        playlistName: detail.playlistName, // target folder
      })

      task.path = response.path
      task.origFileName = response.origFileName
      task.status = "completed" // FIXME: Completed does not get updated
      await updateDownloadDBEntry(task)
    } catch (err) {
      console.log("下载失败: ", err) // TODO: 处理下载失败的情况，例如显示错误提示
      task.status = "failed"
      await updateDownloadDBEntry(task)
    }
  } catch (err) {
    console.log("下载失败: ", err) // TODO: 处理下载失败的情况，例如显示错误提示
    task.status = "failed"
    await updateDownloadDBEntry(task)
  }
}

/**
 * 链接获取部分
 */
interface Transcoding {
  url: string
  preset: "aac_160k" | "mp3_1_0" | "opus_0_0" | "abr_sq" | "mp3_0_1" | "mp3_standard" | "mp3_0_0"
  duration: number // in millis
  snipped: boolean
  format: {
    protocol: "progressive" | "hls" | "ctr-encrypted-hls" | "cbc-encrypted-hls" // TODO: 暂时不支持加密流
    mime_type:
      | 'audio/mp4; codecs="mp4a.40.2"'
      | "audio/mpegurl"
      | "audio/mpeg"
      | 'audio/ogg; codecs="opus"'
  }
  quality: "sq" | "hq" // 没听到过HQ（没开会员x
  is_legacy_transcoding: boolean
}

interface DownloadInfo {
  finalUrl: string
  downloadType: "direct" | "progressive" | "hls" | "ctr-encrypted-hls" | "cbc-encrypted-hls"
  preset:
    | "aac_160k"
    | "mp3_1_0"
    | "opus_0_0"
    | "abr_sq"
    | "mp3_0_1"
    | "mp3_standard"
    | "mp3_0_0"
    | "none"
}

// 最高音质优先
function sortTranscodings(track: any, protocol?: "progressive" | "hls"): Transcoding[] {
  const transcodings = track.media.transcodings.sort((t: Transcoding) =>
    t.quality === "hq" ? -1 : 1,
  )
  if (!protocol) return transcodings
  return transcodings.filter((t: Transcoding) => t.format.protocol === protocol)
}

// TODO: https://developers.soundcloud.com/blog/api-streaming-urls 所述 opus 和 progressive 要没了
async function getDownloadInfo(track: any): Promise<DownloadInfo> {
  // TODO: 自选编码，现在默认最高音质
  // TODO: track_authorization参数什么用？
  // TODO: secret_token参数获取私人下载链接
  if (track["downloadable"] && config.value.preferDirectDownload) {
    // 处理直连下载 TODO: 开设新section
    try {
      const downloadObj = await getV2ApiJson(`/tracks/${track.id}/download`) // 通过API返回的都是has_downloads_left=false，可能404, 不是artistpro下载数量不能超过100
      return {
        finalUrl: downloadObj.redirectUri,
        downloadType: "direct",
        preset: "none",
      }
    } catch (err) {
      console.log("直连下载失败: ", err)
    }
  }

  const transcodings = sortTranscodings(track, "hls")

  if (transcodings.length > 0) {
    let trans: Transcoding | undefined

    console.log("正在下载AAC编码")
    trans = transcodings.find((t: Transcoding) => t.preset === "aac_160k")
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return {
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        }
      } catch (err) {
        console.log("下载AAC编码失败: ", err)
      }
    }

    console.log("正在下载Opus编码")
    trans = transcodings.find((t: Transcoding) => t.preset === "opus_0_0")
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return {
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        }
      } catch (err) {
        console.log("下载Opus编码失败: ", err)
      }
    }

    console.log("正在下载HLS MP3编码")
    trans = transcodings.find((t: Transcoding) => t.preset.indexOf("mp3") !== -1)
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return {
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        }
      } catch (err) {
        console.log("下载HLS MP3编码失败: ", err)
      }
    }
  }

  console.log("正在下载Progressive MP3编码")
  const trans = sortTranscodings(track, "progressive")[0] // Progressive 貌似只有一个MP3
  if (trans) {
    try {
      const m3u8meta = await getJson(trans.url, true, true)
      return {
        finalUrl: m3u8meta.url,
        downloadType: trans.format.protocol,
        preset: trans.preset,
      }
    } catch (err) {
      console.log("下载Progressive MP3编码失败: ", err)
    }
  }

  throw new Error("无音频流或音频流已加密")
}
