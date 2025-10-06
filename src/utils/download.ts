// TODO: downloaded item database TODO: cover
// TODO: playlist downloader

import { getJson, getV2ApiJson } from "./api"

export interface DownloadTask {
  trackId: number
  title: string
  origFileName: string
  playlistName: string
  timestamp: number
  path: string
  status: "pending" | "downloading" | "paused" | "completed" | "failed"
}

interface Transcoding {
  url: string
  preset: "aac_160k" | "mp3_1_0" | "opus_0_0" | "abr_sq" | "mp3_0_1" | "mp3_standard" | "mp3_0_0" // note: opus(480k) > aac(160k) > mp3 (128k)，后面四个在老一点的歌曲会遇到
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

interface DownloadInfo {
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
    t.quality === "hq" ? -1 : 1
  )
  if (!protocol) return transcodings
  return transcodings.filter((t: Transcoding) => t.format.protocol === protocol)
}

export async function downloadTrack(
  track: any,
  callback: (info: DownloadInfo) => Promise<String>
): Promise<String> {
  // TODO: 自选编码，现在默认最高音质
  // TODO: track_authorization参数什么用？
  // TODO: secret_token参数什么用？
  if (track["downloadable"]) {
    // 处理直连下载 TODO: 开设新section
    try {
      const downloadObj = await getV2ApiJson(`/tracks/${track.id}/download`) // 通过API返回的都是has_downloads_left=false，可能404, 不是artistpro下载数量不能超过100
      return await callback({
        finalUrl: downloadObj.redirectUri,
        downloadType: "direct",
        preset: "none",
      })
    } catch (err) {
      console.log("直连下载失败: ", err)
    }
  }

  const transcodings = sortTranscodings(track, "hls")

  if (transcodings.length > 0) {
    console.log("正在下载Opus编码")
    let trans = transcodings.find((t: Transcoding) => t.preset === "opus_0_0")
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return await callback({
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        })
      } catch (err) {
        console.log("下载Opus编码失败: ", err)
      }
    }

    console.log("正在下载AAC编码")
    trans = transcodings.find((t: Transcoding) => t.preset === "aac_160k")
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return await callback({
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        })
      } catch (err) {
        console.log("下载AAC编码失败: ", err)
      }
    }

    console.log("正在下载HLS MP3编码")
    trans = transcodings.find((t: Transcoding) => t.preset.indexOf("mp3") !== -1)
    if (trans) {
      try {
        const m3u8meta = await getJson(trans.url, true, true)
        return await callback({
          finalUrl: m3u8meta.url,
          downloadType: trans.format.protocol,
          preset: trans.preset,
        })
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
      return await callback({
        finalUrl: m3u8meta.url,
        downloadType: trans.format.protocol,
        preset: trans.preset,
      })
    } catch (err) {
      console.log("下载Progressive MP3编码失败: ", err)
    }
  }

  throw new Error("无音频流或音频流已加密")
}
