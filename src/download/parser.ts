import { getJson, getV2ApiJson } from "@/utils/api"
import { config } from "@/utils/config"

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

interface ParsedDownload {
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
export async function parseDownload(track: any): Promise<ParsedDownload> {
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
