/**
 * The Download Manager
 */

import { ref } from "vue"
import { config } from "@/systems/config"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { db } from "@/systems/db"
import * as schema from "@/systems/db/schema"
import { desc, DrizzleQueryError, eq, inArray } from "drizzle-orm"
import { downloadTrack, parseDownload } from "./parser"
import { toast } from "vue-sonner"
import { BasePlaylist, Track } from "@/utils/types"
import { i18n } from "@/systems/i18n"
import { invoke } from "@tauri-apps/api/core"
import * as fs from "@tauri-apps/plugin-fs"

type DownloadTask0 = typeof schema.downloadTasks.$inferSelect

export class DownloadTask {
  readonly task: DownloadTask0
  details: DownloadDetail
  downloadingState?: DownloadStat
  failedReason: string = ""

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

  resume() {
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

    await new Promise((resolve) => setTimeout(resolve, 100)) // simulated waiting TODO: implement pausing logic

    this.downloadingState = undefined
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
  playlist: BasePlaylist
  track: Track

  constructor(playlist: BasePlaylist, track: Track) {
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

export async function addDownloadTask(track: Track, playlist: BasePlaylist) {
  const playlistId = playlist ? playlist.id.toString() : "liked" // playlist.id is number when its user

  const task: typeof schema.downloadTasks.$inferInsert = {
    trackId: track.id,
    playlistId,
    timestamp: Date.now(),
    origFileName: null,
    status: "paused",
    path: "",
  }

  try {
    const pendingTask = new DownloadTask(
      (await db.insert(schema.downloadTasks).values(task).returning())[0],
      new DownloadDetail(playlist, track),
    )

    downloadTasks.value.unshift(pendingTask) // add to the most recent
    pendingTask.resume()
    console.log("New download task: ", pendingTask)
  } catch (err: any) {
    if (err instanceof DrizzleQueryError) {
      err.cause?.message.includes("UNIQUE constraint failed")

      console.warn("Duplicate download tasks: ", task)
    } else {
      console.error(": ", task)
      toast.error(i18n.global.t("cloudie.toasts.addDownloadFailed"), {
        description: err.message,
      })
    }
  }
}

export async function deleteTasks(tasks: DownloadTask[], deleteFile: boolean) {
  if (tasks.length === 0) {
    return
  }

  const taskIds: number[] = []

  for (const task of tasks) {
    try {
      await task.pause()
    } catch (_) {} // already paused

    taskIds.push(task.task.taskId)
  }

  if (deleteFile) {
    for (const task of tasks) {
      if (task.task.path) {
        fs.remove(task.task.path).catch((err) => {
          console.error("Error deleting file:", err)
        })
      }
    }
  }

  await db.delete(schema.downloadTasks).where(inArray(schema.downloadTasks.taskId, taskIds))

  downloadTasks.value = downloadTasks.value.filter((task) => !taskIds.includes(task.task.taskId))
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

    try {
      await invoke("add_tags", {
        filePath: task.task.path,
        title: task.details.title,
        album: task.details.playlistName,
        artist: task.details.artist,
        coverUrl: config.value.addCover ? task.details.coverUrl : undefined,
      })
    } catch (error) {
      console.error(`Error adding tags to ${task.task.path}，Ignoring tags...`, error)
    }

    task.setStatus("completed")
    task.downloadingState = undefined
    console.debug(task.task.status, task)
  } catch (err) {
    console.error("Download failed: ", err)
    task.setStatus("failed")
    task.failedReason = err as string
    task.downloadingState = undefined
  }
}
