/**
 * The Download Manager
 */

// TODO: optimize the database operations
import { ref, watch } from "vue"
import { invoke } from "@tauri-apps/api/core"
import { config } from "@/systems/config"
import { getArtist } from "@/utils/utils"
import { db, DownloadDetail, DownloadTask, getDownloadDetail, getDownloadTasks } from "@/systems/db"
import * as schema from "@/systems/db/schema"
import { and, eq } from "drizzle-orm"
import { parseDownload } from "./parser"
import { toast } from "vue-sonner"
import { Playlist, SystemPlaylist, Track } from "@/utils/types"
import { i18n } from "@/systems/i18n"

interface DownloadResponse {
  path: string
  origFileName: string
}

const downloadTasks = ref<DownloadTask[]>([])
export const downloadDetails = ref<DownloadDetail[]>([])
watch(
  downloadTasks,
  async (v, _oldV) => {
    // 1. 执行任务
    tryRunTask()
    // 2. 更新下载详情
    for (const task of v) {
      await updateDownloadDBEntry(task) // TODO: 性能优化，只更新变化的字段
    }
    downloadDetails.value = await getDownloadDetail(v)
  },
  { deep: true },
)

export async function initDownload() {
  downloadTasks.value = await getDownloadTasks() // details will get updated in watcher
}

function getDownloadTitle(track: Track) {
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
    .where(
      and(
        eq(schema.downloadTasks.trackId, params.trackId),
        eq(schema.downloadTasks.playlistId, params.playlistId),
      ),
    )
}

export async function addDownloadTask(track: Track, playlist: SystemPlaylist | Playlist | undefined) {
  const playlistId = playlist ? (playlist.id as string) : "liked" // playlist.id is number when its user
  if (playlist) {
    await db
      .insert(schema.playlists)
      .values({
        playlistId,
        meta: JSON.stringify(playlist),
      })
      .onConflictDoUpdate({
        target: schema.playlists.playlistId,
        set: {
          meta: JSON.stringify(playlist),
        },
      })
  }

  const task: typeof schema.downloadTasks.$inferInsert = {
    trackId: track.id,
    playlistId,
    timestamp: Date.now(),
    origFileName: null,
    path: "",
    status: "pending",
  }

  await db
    .insert(schema.localTracks)
    .values({
      trackId: task.trackId,
      meta: JSON.stringify(track),
    })
    .onConflictDoUpdate({
      target: schema.localTracks.trackId,
      set: {
        meta: JSON.stringify(track),
      },
    })

  const insertedTask = await db.insert(schema.downloadTasks).values(task).returning()

  console.debug("New download task: ", insertedTask)
  downloadTasks.value.push(insertedTask[0])
}

export async function resumeDownload(downloadTask: DownloadTask) {
  const task = downloadTasks.value.find(
    (t) => t.trackId === downloadTask.trackId && t.playlistId === downloadTask.playlistId,
  )
  if (task) {
    task.status = "pending"
  }
}

export async function pauseDownload(_downloadTask: DownloadTask) {
  throw new Error("Unimplemented")

  //  const task = downloadTasks.value.find(
  //    (t) => t.trackId === downloadTask.trackId && t.playlistId === downloadTask.playlistId,
  //  )
  //  if (task) {
  //    task.status = "paused"
  //    await updateDownloadDBEntry(task)
  //  }
}

export async function deleteTask(downloadTask: DownloadTask) {
  await pauseDownload(downloadTask)
  await db
    .delete(schema.downloadTasks)
    .where(
      and(
        eq(schema.downloadTasks.trackId, downloadTask.trackId),
        eq(schema.downloadTasks.playlistId, downloadTask.playlistId),
      ),
    )

  downloadTasks.value = downloadTasks.value.filter(
    (t) => t.trackId !== downloadTask.trackId || t.playlistId !== downloadTask.playlistId,
  )
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
  const detail = (await getDownloadDetail([task]))[0]
  task.status = "getinfo"
  console.debug(task.status, task)

  try {
    const info = await parseDownload(detail.track)
    task.status = "downloading"
    console.debug(task.status, task)

    const response = await invoke<DownloadResponse>("download_track", {
      finalUrl: info.finalUrl,
      downloadType: info.downloadType,
      preset: info.preset,
      title: getDownloadTitle(detail.track),
      playlistName: detail.playlistName, // Target folder name
    })

    task.path = response.path
    task.origFileName = response.origFileName
    task.status = "completed"
    console.debug(task.status, task)
  } catch (err) {
    console.error("Download failed: ", err)
    toast.error(i18n.global.t("cloudie.toasts.downloadFailed"), {
      description: err as string,
    })
    task.status = "failed"
  }
}
