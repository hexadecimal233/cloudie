import { getJson, getV2ApiJson } from "@/utils/api"
import { config } from "@/utils/config"

const PRIORITY = [
  "aac_256k",
  "aac_160k",
  "opus_0_0",
  "mp3_1_0",
  "mp3_0_1",
  "mp3_standard",
  "mp3_0_0",
  "abr_sq", // not sure whats this
]

type Quality = (typeof PRIORITY)[number]

interface Transcoding {
  url: string
  preset: Quality
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
  quality: "sq" | "hq" // sq and hq makes no difference, only affects aac it seems
  is_legacy_transcoding: boolean
}

interface ParsedDownload {
  finalUrl: string
  downloadType: "direct" | "progressive" | "hls" | "ctr-encrypted-hls" | "cbc-encrypted-hls"
  preset: Quality | "none"
}

// get transcodings in descending order of priority
function sortTranscodings(track: any, protocol?: "progressive" | "hls"): Transcoding[] {
  const transcodings = track.media.transcodings.sort((a: Transcoding, b: Transcoding) => {
    return PRIORITY.indexOf(b.preset) - PRIORITY.indexOf(a.preset)
  })
  if (!protocol) return transcodings
  return transcodings.filter((t: Transcoding) => t.format.protocol === protocol)
}

// TODO: https://developers.soundcloud.com/blog/api-streaming-urls 所述 opus 和 progressive 要没了
// track_authorization only affects get stream from API, transcoding cache is not affected
export async function parseDownload(track: any): Promise<ParsedDownload> {
  // TODO: 自选编码
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

  for (const trans of sortTranscodings(track, "hls")) {
    try {
      console.log(`正在下载${trans.preset}编码`)
      const m3u8meta = await getJson(trans.url, true, true)
      return {
        finalUrl: m3u8meta.url,
        downloadType: trans.format.protocol,
        preset: trans.preset,
      }
    } catch (err) {
      console.log(`下载${trans.preset}编码失败: `, err)
    }
  }

  console.log("正在下载Progressive MP3编码")
  const trans = sortTranscodings(track, "progressive")[0] // Progressive 只有一个MP3
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
