<template>
  <video @timeupdate="onTimeUpdate" @ended="onEnded" @loadedmetadata="onLoadedMetadata" ref="mediaRef" autoplay
    hidden></video>

  <div v-if="!!playerState.track" class="bg-base-200 relative w-full">
    <!-- Progress Bar and Needle-->
     <!--
    <progress class="progress absolute top-0 h-1.5 w-full rounded-none transition-all hover:-top-1.5 hover:h-3"
      :value="playerState.currentTime" :max="playerState.duration || 100" @click="onProgressClick"></progress>
     -->

    <div class="h-10 bg-primary/10 w-full overflow-hidden">
        <Waveform :waveform-url="playerState.track.waveform_url" :play-progress="playerState.currentTime / (playerState.duration || 1)" @click="onProgressClick"></Waveform>
    </div>

    <div class="flex h-24 w-full px-4 py-3">
      <div class="flex items-center gap-3 w-1/3">
        <img :src="getCoverUrl(playerState.track)" alt="cover" class="object-cover skeleton size-18" />
        <div class="flex flex-col overflow-hidden">
          <p class="font-bold truncate" :title="playerState.track?.title">{{ playerState.track.title }}</p>
          <p class="text-base-content/70 truncate" :title="getArtist(playerState.track)">{{
            getArtist(playerState.track) }}</p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-4 w-1/3">
        <button class="btn btn-ghost btn-circle" @click="openListeningWidget">
          <i-mdi-playlist-play />
        </button>
        <button class="btn btn-ghost btn-circle" @click="nextTrack(-1)">
          <i-mdi-rewind />
        </button>
        <button class="btn btn-primary btn-circle" @click="togglePlay">
          <div v-if="loading" class="loading loa ding-spinner loading-lg"></div>
          <i-mdi-play v-else-if="playerState.paused" />
          <i-mdi-pause v-else />
        </button>
        <button class="btn btn-ghost btn-circle" @click="nextTrack(1)">
          <i-mdi-fast-forward />
        </button>
        <PlayOrderSwitch></PlayOrderSwitch>
      </div>
      <div class="flex items-center justify-end w-1/3">
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ formatSecs(playerState.currentTime) }}</span>
          <span class="text-sm">/</span>
          <span class="text-sm">{{ formatSecs(playerState.duration || 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// FIXME: Clicking too fast cause audio stream mismatch
import { ref, onMounted, onUnmounted } from "vue"
import PlayOrderSwitch from "./PlayOrderSwitch.vue"
import ListeningWidget from "./ListeningWidget.vue"
import {
  getNextTrackIndex,
  setCurrentTrack,
  setTrackUpdateCallback,
  addAndPlay,
  playIndex,
} from "@/systems/player/listening-list"
import { formatSecs, getArtist, getCoverUrl, replaceImageUrl } from "@/utils/utils"
import Hls from "hls.js"
import type { ErrorData } from "hls.js"
import { Track } from "@/utils/types"
import { CachedLoader } from "@/systems/player/loader"
import { M3U8_CACHE_MANAGER } from "@/systems/player/cache"
import { i18n } from "@/systems/i18n"
import { toast } from "vue-sonner"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useModal } from "vue-final-modal"
import { usePlayerStore } from "@/systems/stores/player"
import Waveform from "./Waveform.vue"

// --- HLS 相关的状态和 Ref ---
const mediaRef = ref<HTMLVideoElement | null>(null)
const hlsPlayer = ref<Hls | null>(null)

const loading = ref(false)
const playerState = usePlayerStore()

function updateMedia(track: Track) {
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
}

onMounted(() => {
  // init MediaSession Handlers
  // NOTE: Updating Media here will cause OS not to display before clicking play
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => {
      resume()
    })
    navigator.mediaSession.setActionHandler("pause", () => {
      pause()
    })
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      seek(details.seekTime!)
    })
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      seek(playerState.currentTime + (details.seekOffset ?? 10))
    })
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      seek(playerState.currentTime - (details.seekOffset ?? 10))
    })
    navigator.mediaSession.setActionHandler("stop", () => {
      pause()
      seek(0)
    })
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      nextTrack(-1)
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextTrack(1)
    })
  }

  // set track update callbacks
  setTrackUpdateCallback((idx) => {
    if (idx >= 0) {
      loadSong()
    }
  })

  // TODO: Refactor this to use playerState
  playerState.init({
    onResume: resume,
    onPause: pause,
    onSeek: seek,
    onPlay: addAndPlay,
    onPlayIndex: playIndex,
  })

  // Initialize HLS player if supported
  if (Hls.isSupported() && mediaRef.value) {
    const hls = new Hls({
      fLoader: CachedLoader,
    })
    hlsPlayer.value = hls
    hls.attachMedia(mediaRef.value)

    hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        if (data.response && data.response.code === 403) {
          console.log("403 error detected, reloading M3U8...")
          // Pause playback
          pause()

          // Re-load the current song with fresh M3U8
          loadSong(true) // Force refresh M3U8
        } else {
          console.error("HLS network error:", data)
        }
      } else {
        console.error("HLS Error:", data.type, data.details, data.fatal ? "FATAL" : "NON-FATAL")
      }
    })
  } else if (mediaRef.value?.canPlayType("application/vnd.apple.mpegurl")) {
    console.log("Using native HLS support.")
  } else {
    console.error("HLS is not supported on this browser.")
  }
})

onUnmounted(() => {
  if (hlsPlayer.value) {
    hlsPlayer.value.destroy()
  }
})

// --- 播放器事件处理 ---

function onTimeUpdate(_event: Event) {
  if (mediaRef.value) {
    playerState.currentTime = mediaRef.value.currentTime

    // 修复 NaN/Infinity 错误: 仅当 duration 是有效数字时才更新
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      playerState.duration = duration
    }
  }
}

function onEnded() {
  nextTrack()
}

function onLoadedMetadata() {
  if (mediaRef.value) {
    // metadata 加载后，duration 通常是正确的了
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      playerState.duration = duration
      loading.value = false
    } else {
      playerState.duration = undefined // 确保非正常值时进入加载状态
      loading.value = true
    }
    playerState.paused = mediaRef.value.paused
  }
}

// --- 播放器控制方法 ---

function openListeningWidget() {
  const { open, close } = useModal({
    component: ListeningWidget,
    attrs: {
      onClose() {
        close()
      },
    },
  })

  open()
}

function seek(time: number) {
  if (!mediaRef.value || !isFinite(time)) {
    return
  }
  const safeTime = Math.max(0, Math.min(time, playerState.duration || time))
  mediaRef.value.currentTime = safeTime
}

// 处理进度条点击事件以实现 Seek
function onProgressClick(percentage: number) {
  if (playerState.duration === undefined) {
    return
  }

  // 2. 计算目标时间
  const targetTime = percentage * playerState.duration

  // 3. 寻址
  seek(targetTime)

  // 4. 如果是暂停状态，寻址后应尝试播放 (用户交互)
  if (playerState.paused) {
    resume()
  }
}

function pause() {
  if (!mediaRef.value) {
    return
  }
  mediaRef.value.pause()
  playerState.paused = true
}

async function loadSong(forceRefreshM3U8: boolean = false) {
  if (!mediaRef.value || !playerState.track) {
    loading.value = false
    return
  }

  if (loading.value) {
    console.warn("Song is already loading")
  }

  // 加载新源之前，将 duration 设为 undefined，显示加载状态
  loading.value = true
  playerState.duration = undefined

  const currentTime = mediaRef.value.currentTime

  try {
    if (hlsPlayer.value) {
      // disable HLS load to prevent multiple segments loading
      hlsPlayer.value.stopLoad()

      updateMedia(playerState.track)

      const trackLink = await M3U8_CACHE_MANAGER.getTrackLink(playerState.track, forceRefreshM3U8)
      // clear previous source

      // load text into a blob to create a url
      const enc = new TextEncoder()
      const blob = new Blob([enc.encode(trackLink)], { type: "application/vnd.apple.mpegurl" })
      hlsPlayer.value.loadSource(URL.createObjectURL(blob))

      hlsPlayer.value.once(Hls.Events.MANIFEST_PARSED, async () => {
        try {
          if (mediaRef.value && playerState.track) {
            // restore load
            hlsPlayer.value!.startLoad(forceRefreshM3U8 ? currentTime : 0)
            // 等待 HLS 解析完成后再播放
            await mediaRef.value!.play()
            playerState.paused = false
          }
        } catch (error) {
          console.error("HLS Play Failed:", error)
          playerState.paused = true
        }
      })
    }
  } catch (error) {
    console.error("Failed to get track link:", error)
    loading.value = false
    toast.error(i18n.global.t("cloudie.toasts.loadFailed"), {
      description: error instanceof Error ? error.message : String(error),
    })

    // automatically loads after a few seconds
    setTimeout(async () => {
      // TODO: abortable task
      await nextTrack()
    }, 5000)
  }
}

async function resume() {
  if (!mediaRef.value || !playerState.track) {
    return
  }

  // --- 1. 检查是否已经加载并准备好播放 ---

  if (mediaRef.value.readyState >= HTMLMediaElement.HAVE_METADATA) {
    try {
      await mediaRef.value.play()
      playerState.paused = false
      return
    } catch (error) {
      console.error("Direct Play Failed (likely policy issue, will try reload):", error)
      // 播放失败（例如，用户交互策略），继续执行下面的加载逻辑，强制刷新源
    }
  }

  loadSong()
}

async function togglePlay() {
  if (!mediaRef.value) {
    return
  }

  if (mediaRef.value.paused) {
    await resume()
  } else {
    pause()
  }
}

async function nextTrack(offset: number = 1) {
  pause()
  const trackIndex = await getNextTrackIndex(offset)

  if (trackIndex === -1) {
    seek(0)
    return
  }

  // Always restart if user clicked the same track
  setCurrentTrack(trackIndex)

  // track will be loaded and resumed by watcher
  seek(0)
}
</script>
