import { path } from "@tauri-apps/api"
import { SOCIAL_NETWORKS, type Track, type WebProfile } from "./types"

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function replaceImageUrl(
  url: string,
  size:
    | "20x20"
    | "50x50"
    | "120x120"
    | "200x200"
    | "500x500"
    | "1080x1080" // Cover / Avatar sizes
    | "1240x260"
    | "2480x520" = "500x500", // Visual sizes
): string {
  return url.replace("-large", `-t${size}`)
}

// Check if a track is possible to free download (e.g. official download link)
export function isPossibleFreeDownload(track: Track) {
  let isFreeDownload = false

  if (track.description) {
    isFreeDownload =
      isFreeDownload ||
      track.description.toLowerCase().includes("free download") ||
      track.description.toLowerCase().includes("free dl")

    if (isFreeDownload) return true
  }
  isFreeDownload =
    isFreeDownload ||
    track.title.toLowerCase().includes("free download") ||
    track.title.toLowerCase().includes("free dl")

  if (isFreeDownload) return true

  // Detect purchase link
  if (track.purchase_url) {
    isFreeDownload =
      isFreeDownload ||
      track.purchase_url.toLowerCase().includes("dropbox.com") ||
      track.purchase_url.toLowerCase().includes("drive.google.com") ||
      track.purchase_url.toLowerCase().includes("mega.nz")
  }

  if (isFreeDownload) return true

  if (track.purchase_title) {
    isFreeDownload =
      isFreeDownload ||
      track.purchase_title.toLowerCase().includes("free download") ||
      track.purchase_title.toLowerCase().includes("free dl")
  }

  return isFreeDownload
}

export function formatMillis(millis: number): string {
  const seconds = Math.floor(millis / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const formattedMinutes = (minutes % 60).toString().padStart(2, "0")
  const formattedSeconds = (seconds % 60).toString().padStart(2, "0")

  return `${hours > 0 ? `${hours}:` : ""}${formattedMinutes}:${formattedSeconds}`
}

export function formatSecs(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// https://stackoverflow.com/questions/26941168/javascript-interpolate-an-array-of-numbers
export function interpolateInto(data: number[], fitCount: number): number[] {
  if (fitCount <= 1 || data.length <= 1 || fitCount === data.length) {
    return data.slice(0, fitCount)
  }

  const springFactor = (data.length - 1) / (fitCount - 1)
  const newData = new Array<number>(fitCount)

  newData[0] = data[0]
  newData[fitCount - 1] = data[data.length - 1]

  for (let i = 1; i < fitCount - 1; i++) {
    const tmp = i * springFactor
    const beforeIndex = Math.floor(tmp)
    const atPoint = tmp - beforeIndex
    const afterIndex = beforeIndex + 1

    const beforeValue = data[beforeIndex]
    const afterValue = data[afterIndex]

    newData[i] = beforeValue + (afterValue - beforeValue) * atPoint
  }

  return newData
}

// from soundcloud json
export function getNetworkName(profile: WebProfile): string {
  if (profile.title) return profile.title

  if (profile.network === "personal" || profile.network === "other") {
    return profile.url.replace(/^https?:\/\//, "")
  }

  if (profile.network === "email") {
    return profile.url
  }

  return SOCIAL_NETWORKS[profile.network as keyof typeof SOCIAL_NETWORKS] || ""
}

export function getNetworkClassName(profile: WebProfile): string {
  return (profile.network || "").replace(/[^a-z]/g, "")
}

export function checkFFmpeg() {
  // TODO: check if ffmpeg is installed
}

export function getArtist(track: Track): string {
  return track.publisher_metadata?.artist ?? track.user?.username ?? ""
}

export function getCoverUrl(track: Track): string {
  return track.artwork_url ?? track.user?.avatar_url ?? ""
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString()
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0"
  return new Intl.NumberFormat().format(num)
}

export function openModal(component: any, props: any) {
  const overlay = useOverlay()

  const modal = overlay.create(component)

  return modal.open(props)
}

// FS utils

import * as fs from "@tauri-apps/plugin-fs"

export async function copyDir(srcDir: string, destDir: string, copyOptions?: fs.CopyFileOptions) {
  try {
    await fs.mkdir(destDir)
  } catch (_) {} // ignore if exists

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

export async function move(
  src: string,
  dst: string,
  copyOptions?: fs.CopyFileOptions,
): Promise<string> {
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
