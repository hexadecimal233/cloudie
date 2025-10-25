/**
 * The Download Manager
 */

import { ref } from "vue"
import { config } from "@/systems/config"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { db, DEMO_PLAYLIST, DemoPlaylist } from "@/systems/db"
import * as schema from "@/systems/db/schema"
import { desc, eq } from "drizzle-orm"
import { downloadTrack, parseDownload } from "./parser"
import { toast } from "vue-sonner"
import { Playlist, SystemPlaylist, Track } from "@/utils/types"
import { i18n } from "@/systems/i18n"

type DownloadTask0 = typeof schema.downloadTasks.$inferSelect

export class DownloadTask {
  readonly task: DownloadTask0
  details: DownloadDetail
  downloadingState?: DownloadStat

  constructor(downloadTask: DownloadTask0, details: DownloadDetail, state?: DownloadStat) {
    this.task = downloadTask
    this.details = details
    this.downloadingState = state
  }

  // trackId playlistId timestamp should be set on creation

  async setPath(path: string) {
    await this.updateDb({ path })
    this.task.path = path
  }

  async setOrigFileName(origFileName: string | null) {
    await this.updateDb({ origFileName })
    this.task.origFileName = origFileName
  }

  async setStatus(status: DownloadTask0["status"]) {
    await this.updateDb({ status })
    this.task.status = status
  }

  async resume() {
    if (this.downloadingState) {
      throw new Error("Download task is running")
    }

    this.downloadingState = new DownloadStat()
    tryRunTask() // inform download event
  }

  async pause() {
    if (!this.downloadingState) {
      throw new Error("Download task is paused")
    }

    this.downloadingState = new DownloadStat()
  }

  async delete() {
    try {
      await this.pause()
    } catch (err) {} // ignore already paused

    await db.delete(schema.downloadTasks).where(eq(schema.downloadTasks.taskId, this.task.taskId))

    downloadTasks.value = downloadTasks.value.filter((t) => t.task.taskId !== this.task.taskId)
  }

  async updateDb(attrs: Partial<DownloadTask0>) {
    await db
      .update(schema.downloadTasks)
      .set(attrs)
      .where(eq(schema.downloadTasks.taskId, this.task.taskId))
  }
}

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
    // metas
    this.playlist = playlist
    this.track = track
  }
}

export const downloadTasks = ref<DownloadTask[]>([])

export async function initDownload() {
  const rawResults = await db.query.downloadTasks.findMany({
    orderBy: [desc(schema.downloadTasks.timestamp)],
    with: {
      localTrack: true,
      playlist: true,
    },
  })

  const results: DownloadTask[] = rawResults.map((row) => {
    const track = JSON.parse(row.localTrack.meta)

    let playlist = JSON.parse(row.playlist.meta)

    return new DownloadTask(row, new DownloadDetail(playlist, track))
  })

  downloadTasks.value = results

  tryRunTask()
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
    status: "paused",
    path: "",
  }

  await db
    .insert(schema.localTracks)
    .values({
      trackId: track.id,
      meta: JSON.stringify(track),
    })
    .onConflictDoUpdate({
      target: schema.localTracks.trackId,
      set: {
        meta: JSON.stringify(track),
      },
    })

  const pendingTask = new DownloadTask(
    (await db.insert(schema.downloadTasks).values(task).returning())[0],
    new DownloadDetail(playlist ?? DEMO_PLAYLIST, track),
    new DownloadStat(),
  )

  downloadTasks.value.unshift(pendingTask) // add to the most recent
  pendingTask.resume()
  console.debug("New download task: ", pendingTask)
}

export async function deleteAllTasks() {
  // 暂停所有任务
  for (const task of downloadTasks.value) {
    try {
      await task.pause()
    } catch (err) {} // ignore already paused
  }

  await db.delete(schema.downloadTasks)
  downloadTasks.value = []
}

function tryRunTask() {
  const pendingTasks = downloadTasks.value.filter((t) => t.downloadingState?.name === "pending")
  const runningTasks = downloadTasks.value.filter(
    (t) => t.downloadingState?.name === "getinfo" || t.downloadingState?.name === "downloading",
  )

  const availableSlots = Math.max(0, config.value.parallelDownloads - runningTasks.length)
  const tasksToRun = pendingTasks
    .sort((a, b) => b.task.timestamp - a.task.timestamp)
    .slice(0, availableSlots)

  for (const task of tasksToRun) {
    runTask(task)
  }
}

async function runTask(task: DownloadTask) {
  if (!task.downloadingState) {
    throw new Error("Download task state is undefined")
  }

  task.downloadingState.name = "getinfo"
  console.debug(task.downloadingState.name, task)

  try {
    const parsed = await parseDownload(task.details.track)
    task.downloadingState.name = "downloading"
    console.debug(task.downloadingState.name, task)

    const response = await downloadTrack(parsed, task, (progress) => {
      task.downloadingState!.progress = progress
    })

    task.setPath(response.path)
    task.setOrigFileName(response.origFileName)
    task.setStatus("completed")
    task.downloadingState = undefined
    console.debug(task.task.status, task)
  } catch (err) {
    console.error("Download failed: ", err)
    toast.error(i18n.global.t("cloudie.toasts.downloadFailed"), {
      description: err as string,
    })
    task.setStatus("failed")
    task.downloadingState = undefined
  }
}
