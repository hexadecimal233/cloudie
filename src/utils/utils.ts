import { path } from "@tauri-apps/api"
import { Track } from "./types"

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function replaceImageUrl(url: string, size:
  "20x20" | "50x50" | "120x120" | "200x200" | "500x500" | "1080x1080" | // Cover / Avatar sizes
  "1240x260" | "2480x520" // Visual sizes
  = "500x500") {
  return url.replace("-large", `-t${size}`)
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
  } catch (e) { } // ignore if exists

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
