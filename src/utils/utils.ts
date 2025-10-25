import { path } from "@tauri-apps/api"
import { Track } from "./types"

export function replaceImageUrl(url: string, size: number = 500) {
  /*
  availableSizes: [[20, "t20x20"], [50, "t50x50"], [120, "t120x120"], [200, "t200x200"], [500, "t500x500"], [1080, "t1080x1080"]],
  availableVisualsSizes: [[1240, "t1240x260"], [2480, "t2480x520"]],
  */
  return url.replace("-large", `-t${size}x${size}`)
}

export function formatMillis(millis: number) {
  const seconds = Math.floor(millis / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const formattedMinutes = (minutes % 60).toString().padStart(2, "0")
  const formattedSeconds = (seconds % 60).toString().padStart(2, "0")

  return `${hours > 0 ? `${hours}:` : ""}${formattedMinutes}:${formattedSeconds}`
}

export function checkFFmpeg() {
  // TODO: check if ffmpeg is installed
}

export function getArtist(track: Track): string {
  return track.publisher_metadata?.artist ?? track.user?.username ?? ""
}

export function getCoverUrl(track: Track): string {
  return track.artwork_url ?? track.user.avatar_url ?? ""
}

import * as fs from "@tauri-apps/plugin-fs"

export async function copyDir(
  srcDir: string,
  destDir: string,
  copyOptions?: fs.CopyFileOptions,
): Promise<void> {
  try {
    await fs.mkdir(destDir)
  } catch (e) {} // ignore if exists

  const entries = await fs.readDir(srcDir)

  for (const entry of entries) {
    const srcPath = await path.join(srcDir, entry.name)
    const destPath = await path.join(destDir, entry.name)

    if (entry.isDirectory) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath, copyOptions)
    }
  }
}

export async function move(src: string, dst: string, copyOptions?: fs.CopyFileOptions): Promise<string> {
  if (!(await fs.exists(src))) {
    throw new Error(`Source path '${src}' does not exist.`)
  }

  let real_dst = dst
  const isSrcDir = (await fs.lstat(src)).isDirectory

  if (await fs.exists(dst)) {
    const isDstDir = (await fs.lstat(dst)).isDirectory

    if (isDstDir) {
      const basename = src.split(/[/\\]/).pop()
      if (!basename) {
        throw new Error(`Invalid source path '${src}'.`)
      }
      real_dst = `${dst}/${basename}`

      if (await fs.exists(real_dst)) {
        throw new Error(`Destination path '${real_dst}' already exists.`)
      }
    }
  }

  try {
    await fs.rename(src, real_dst)
    return real_dst
  } catch (renameError) {
    try {
      if (isSrcDir) {
        await copyDir(src, real_dst, copyOptions)
        await fs.remove(src, { recursive: true })
      } else {
        await fs.copyFile(src, real_dst, copyOptions)
        await fs.remove(src)
      }
    } catch (copyRemoveError) {
      throw new Error(
        `Failed to move '${src}' to '${real_dst}' after rename attempt: ${copyRemoveError}`,
      )
    }
  }

  return real_dst
}
