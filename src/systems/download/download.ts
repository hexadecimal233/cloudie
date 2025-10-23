/**
 * The Download Manager
 */

import { ref, watch } from "vue"
import { config } from "@/systems/config"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { db, DEMO_PLAYLIST, DemoPlaylist } from "@/systems/db"
import * as schema from "@/systems/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { downloadTrack, parseDownload } from "./parser"
import { toast } from "vue-sonner"
import { Playlist, SystemPlaylist, Track } from "@/utils/types"
import { i18n } from "@/systems/i18n"

type DownloadTask = typeof schema.downloadTasks.$inferSelect

class DownloadStat {
  progress: number = 0 // from 0 to 1
  name: "pending" | "getinfo" | "downloading" = "pending"
}

class DownloadDetail {
  title: string
  artist: string
  coverUrl: string
  playlistName?: string
  playlist: Playlist | SystemPlaylist | DemoPlaylist
  track: Track

  constructor(playlist: Playlist | SystemPlaylist | DemoPlaylist, track: Track) {
    this.title = track.title
    this.artist = getArtist(track)
    this.coverUrl = getCoverUrl(track)
    this.playlistName = playlist.title || undefined
    this.playlist = playlist
    this.track = track
  }
}

export interface FrontendDownloadTask extends DownloadTask {
  state?: DownloadStat
  details: DownloadDetail
}


export const downloadTasks = ref<FrontendDownloadTask[]>([])
watch(
  downloadTasks,
  async (v, _oldV) => {
    // 1. 执行任务
    tryRunTask()
    // 2. 更新下载详情
    for (const task of v) {
      await updateDownloadDBEntry(task) // TODO: 性能优化，只更新变化的字段
    }
  },
  { deep: true },
)

export async function initDownload() {
  const rawResults = await db.query.downloadTasks.findMany({
    orderBy: [desc(schema.downloadTasks.timestamp)],
    with: {
      localTrack: true,
      playlist: true,
    },
  })

  const results: FrontendDownloadTask[] = rawResults.map((row) => {
    const track = JSON.parse(row.localTrack.meta)

    let playlist = JSON.parse(row.playlist.meta)
    let playlistName: string = playlist.title ?? undefined

    return {
      trackId: row.trackId,
      playlistId: row.playlistId,
      timestamp: row.timestamp,
      origFileName: row.origFileName,
      path: row.path,
      status: row.status,
      // details
      details: {
        title: track.title,
        artist: getArtist(track),
        coverUrl: getCoverUrl(track),
        playlistName: playlistName,
        playlist: playlist,
        track: track,
      },
    }
  })

  downloadTasks.value = results
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

export async function addDownloadTask(
  track: Track,
  playlist: SystemPlaylist | Playlist | undefined,
) {
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
    status: "paused",
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

  const pendingTask = (
    await db.insert(schema.downloadTasks).values(task).returning()
  )[0] as FrontendDownloadTask
  pendingTask.state = new DownloadStat()
  pendingTask.details = new DownloadDetail(playlist ?? DEMO_PLAYLIST, track)

  console.debug("New download task: ", pendingTask)
  downloadTasks.value.unshift(pendingTask)
}

export async function resumeDownload(downloadTask: FrontendDownloadTask) {
  if (downloadTask.state) {
    throw new Error("Download task is running")
  }

  downloadTask.state = new DownloadStat()
}

export async function pauseDownload(downloadTask: FrontendDownloadTask) {
  if (!downloadTask.state) {
    throw new Error("Download task is paused")
  }

  downloadTask.state = undefined

  console.error("TODO: Pause download. ", downloadTask)
}

export async function deleteTask(downloadTask: FrontendDownloadTask) {
  try {
    await pauseDownload(downloadTask)
  } catch (err) {} // ignore already paused

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
  // 暂停所有任务
  for (const task of downloadTasks.value) {
    try {
      await pauseDownload(task)
    } catch (err) {} // ignore already paused
  }

  await db.delete(schema.downloadTasks)

  downloadTasks.value = []
}

function tryRunTask() {
  const pendingTasks = downloadTasks.value.filter((t) => t.state?.name === "pending")
  const runningTasks = downloadTasks.value.filter(
    (t) => t.state?.name === "getinfo" || t.state?.name === "downloading",
  )

  const availableSlots = Math.max(0, config.value.parallelDownloads - runningTasks.length)
  const tasksToRun = pendingTasks.sort((a, b) => b.timestamp - a.timestamp).slice(0, availableSlots)

  for (const task of tasksToRun) {
    runTask(task)
  }
}

async function runTask(task: FrontendDownloadTask) {
  if (!task.state) {
    throw new Error("Download task state is undefined")
  }

  task.state.name = "getinfo"
  console.debug(task.state.name, task)

  try {
    const parsed = await parseDownload(task.details.track)
    task.state.name = "downloading"
    console.debug(task.state.name, task)

    const response = await downloadTrack(parsed, task, (progress) => {
      task.state!.progress = progress
    })

    task.path = response.path
    task.origFileName = response.origFileName
    task.status = "completed"
    task.state = undefined
    console.debug(task.status, task)
  } catch (err) {
    console.error("Download failed: ", err)
    toast.error(i18n.global.t("cloudie.toasts.downloadFailed"), {
      description: err as string,
    })
    task.status = "failed"
    task.state = undefined
  }
}
