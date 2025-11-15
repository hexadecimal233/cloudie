import { defineStore } from "pinia"
import {
  getCurrentTrack,
  getNextTrackIndex,
  setCurrentTrack,
  setTrackUpdateCallback,
  addAndPlay as thePlay,
  playIndex as thePlayIndex,
} from "../player/listening-list"
import type { Track } from "@/utils/types"
import Hls, { ErrorData } from "hls.js"
import { i18n } from "../i18n"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getArtist, getCoverUrl, replaceImageUrl } from "@/utils/utils"
import { M3U8_CACHE_MANAGER } from "../player/cache"
import { CachedLoader } from "../player/loader"
import { Ref } from "vue"
import { config } from "../config"
import { addToHistory } from "@/utils/api"

class PlayerState {
  currentTime: number = 0
  duration: number | undefined = undefined
  loading: boolean = false
  isPaused: boolean = true
}
// Player stuff
let mediaRef: Ref<HTMLVideoElement | null> | undefined
let hlsPlayer: Hls | undefined

// FIXME: Clicking too fast cause audio stream mismatch
export const usePlayerStore = defineStore("player", {
  state: (): PlayerState => {
    return {
      ...new PlayerState(),
    }
  },
  getters: {
    track: (): Track | undefined => getCurrentTrack(),
    mediaRef: (): Ref<HTMLVideoElement | null> | undefined => mediaRef,
  },
  actions: {
    updateMedia(track: Track) {
      // Update MediaSession & Window Title
      if ("mediaSession" in navigator) {
        const coverUrl = getCoverUrl(track)
        const type = coverUrl.includes("png") ? "image/png" : "image/jpeg"

        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: getArtist(track),
          artwork: [
            { src: replaceImageUrl(coverUrl, "120x120"), sizes: "120x120", type: type },
            { src: replaceImageUrl(coverUrl, "200x200"), sizes: "200x200", type: type },
          ],
        })
      }

      getCurrentWindow().setTitle(track.title + " - " + getArtist(track) + " - Cloudie")
    },

    async nextTrack(offset: number = 1) {
      this.pause()
      const trackIndex = await getNextTrackIndex(offset)

      if (trackIndex === -1) {
        this.seek(0)
        return
      }

      // Always restart if user clicked the same track
      setCurrentTrack(trackIndex)

      // track will be loaded and resumed automatically by watcher
      this.seek(0)
    },
    async loadSong(forceRefreshM3U8: boolean = false) {
      if (!mediaRef || !mediaRef.value || !this.track) {
        this.loading = false
        return
      }

      if (this.loading) {
        console.warn("Song is already loading")
      }

      // 加载新源之前，将 duration 设为 undefined，显示加载状态
      this.loading = true
      this.duration = undefined

      const currentTime = mediaRef.value.currentTime ?? 0

      try {
        if (hlsPlayer) {
          // disable HLS load to prevent multiple segments loading
          hlsPlayer.stopLoad()

          this.updateMedia(this.track)

          const trackLink = await M3U8_CACHE_MANAGER.getTrackLink(this.track, forceRefreshM3U8)
          // clear previous source

          // load text into a blob to create a url
          const enc = new TextEncoder()
          const blob = new Blob([enc.encode(trackLink)], { type: "application/vnd.apple.mpegurl" })
          hlsPlayer.loadSource(URL.createObjectURL(blob))

          hlsPlayer.once(Hls.Events.MANIFEST_PARSED, async () => {
            try {
              if (mediaRef && this.track) {
                // restore load
                hlsPlayer!.startLoad(forceRefreshM3U8 ? currentTime : 0)
                // 等待 HLS 解析完成后再播放
                await mediaRef.value?.play()

                // 当这首曲子加载完毕开始播放
                if (config.value.noHistory) return
                addToHistory(this.track) // FIXME: will also be called if m3u8 error
              }
            } catch (error) {
              console.error("HLS Play Failed:", error)
            }
          })
        }
      } catch (error) {
        console.error("Failed to get track link:", error)
        this.loading = false
        useToast().add({
          color: "error",
          title: i18n.global.t("cloudie.toasts.loadFailed"),
          description: error instanceof Error ? error.message : String(error),
        })

        // automatically loads after a few seconds
        setTimeout(async () => {
          // TODO: abortable task
          await this.nextTrack()
        }, 5000)
      }
    },
    seek(time: number) {
      if (!mediaRef || !mediaRef.value || !isFinite(time)) {
        return
      }
      const safeTime = Math.max(0, Math.min(time, this.duration || time))
      mediaRef.value.currentTime = safeTime
    },
    async resume() {
      if (!mediaRef || !mediaRef.value || !this.track) {
        return
      }

      // --- 1. 检查是否已经加载并准备好播放 ---

      if (mediaRef.value.readyState >= HTMLMediaElement.HAVE_METADATA) {
        try {
          await mediaRef.value.play()
          return
        } catch (error) {
          console.error("Direct Play Failed (likely policy issue, will try reload):", error)
          // 播放失败（例如，用户交互策略），继续执行下面的加载逻辑，强制刷新源
        }
      }

      this.loadSong()
    },
    pause() {
      if (!mediaRef || !mediaRef.value) {
        return
      }
      mediaRef.value.pause()
    },
    init(mref: Ref<HTMLVideoElement | null>) {
      console.log("init player", mref.value)
      if (mediaRef) {
        console.warn("Player is already initialized")
      }

      mediaRef = mref // directly pass reactivity
      // init MediaSession Handlers
      // NOTE: Updating Media here will cause OS not to display before clicking play
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", () => {
          this.resume()
        })
        navigator.mediaSession.setActionHandler("pause", () => {
          this.pause()
        })
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          this.seek(details.seekTime!)
        })
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          this.seek(this.currentTime + (details.seekOffset ?? 10))
        })
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          this.seek(this.currentTime - (details.seekOffset ?? 10))
        })
        navigator.mediaSession.setActionHandler("stop", () => {
          this.pause()
          this.seek(0)
        })
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          this.nextTrack(-1)
        })
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          this.nextTrack(1)
        })
      }

      // set track update callbacks
      setTrackUpdateCallback((idx) => {
        if (idx >= 0) {
          this.loadSong()
        }
      })

      // Initialize HLS player if supported
      if (Hls.isSupported() && mref.value) {
        const hls = new Hls({
          fLoader: CachedLoader,
        })
        hlsPlayer = hls
        hls.attachMedia(mref.value)

        hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (data.response && data.response.code === 403) {
              console.log("403 error detected, reloading M3U8...")
              // Pause playback
              this.pause()

              // Re-load the current song with fresh M3U8
              this.loadSong(true) // Force refresh M3U8
            } else {
              console.error("HLS network error:", data)
            }
          } else {
            console.error("HLS Error:", data.type, data.details, data.fatal ? "FATAL" : "NON-FATAL")
          }
        })
      } else if (mref.value?.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("Using native HLS support.")
      } else {
        console.error("HLS is not supported on this browser.")
      }
    },
    play(track: Track, replacedTracklist?: Track[]) {
      thePlay(track, replacedTracklist)
    },
    playIndex(index: number) {
      thePlayIndex(index)
    },
  },
})
