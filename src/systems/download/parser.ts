import { getJson, getV2ApiJson } from "@/utils/api"
import { config } from "@/systems/config"
import { Preset, PRESET_ORDER, Track, Transcoding } from "@/utils/types"

interface ParsedDownload {
  finalUrl: string
  downloadType: "direct" | "progressive" | "hls" | "ctr-encrypted-hls" | "cbc-encrypted-hls"
  preset: Preset | "none"
}

// get transcodings in descending order of priority
function sortTranscodings(track: Track, protocol?: "progressive" | "hls"): Transcoding[] {
  const transcodings = track.media.transcodings.sort((a: Transcoding, b: Transcoding) => {
    return PRESET_ORDER.indexOf(b.preset) - PRESET_ORDER.indexOf(a.preset)
  })
  if (!protocol) return transcodings
  return transcodings.filter((t: Transcoding) => t.format.protocol === protocol)
}

// TODO: https://developers.soundcloud.com/blog/api-streaming-urls 所述 opus 和 progressive 要没了
// track_authorization only affects get stream from API, transcoding cache is not affected
export async function parseDownload(track: Track): Promise<ParsedDownload> {
  // TODO: 自选编码
  // TODO: secret_token参数获取私人下载链接
  if (track["downloadable"] && config.value.preferDirectDownload) {
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

  throw new Error("无音频流或音频流已加密")
}
