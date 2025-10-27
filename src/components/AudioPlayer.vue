<template>
  <video
    @timeupdate="onTimeUpdate"
    @ended="onEnded"
    @loadedmetadata="onLoadedMetadata"
    ref="mediaRef"
    autoplay
    hidden></video>

  <div v-if="track" class="bg-base-200 relative h-24">
    <!-- FIXME: ERROR on delete track -->
    <!-- Progress Bar and Needle-->
    <progress
      class="progress absolute top-0 h-1.5 w-full rounded-none transition-all hover:-top-1.5 hover:h-3"
      :value="playerState.currentTime"
      :max="playerState.duration"
      @click="onProgressClick"></progress>

    <div class="flex h-full w-full px-4 py-3">
      <div class="flex flex-1/3 gap-2">
        <img :src="getCoverUrl(track)" alt="cover" class="skeleton object-cover" />
        <div class="flex flex-col">
          <p class="font-bold">{{ track.title }}</p>
          <p class="text-base-content/70">{{ getArtist(track) }}</p>
        </div>
      </div>

      <div class="flex flex-1/3 items-center justify-center gap-4">
        <button class="btn btn-ghost btn-circle">
          <i-mdi-playlist-play />
        </button>
        <button class="btn btn-ghost btn-circle" @click="nextTrack(-1)">
          <i-mdi-rewind />
        </button>
        <button class="btn btn-primary btn-circle" @click="togglePlay">
          <div v-if="playerState.loading" class="loading loading-spinner loading-lg"></div>
          <i-mdi-play v-else-if="playerState.paused" />
          <i-mdi-pause v-else />
        </button>
        <button class="btn btn-ghost btn-circle" @click="nextTrack(1)">
          <i-mdi-fast-forward />
        </button>
        <PlayOrderSwitch></PlayOrderSwitch>
      </div>
      <div class="flex-1/3">XXX</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from "vue"
import PlayOrderSwitch from "./PlayOrderSwitch.vue"
import {
  getNextTrackIndex as getNextTrackIdx,
  getCurrentTrack,
  setCurrentTrack,
  setTrackUpdateCallback,
  getNthTrack,
} from "@/systems/player/playlist"
import { getArtist, getCoverUrl, replaceImageUrl } from "@/utils/utils"
import { parseHlsLink } from "@/systems/download/parser"
import Hls from "hls.js"
import { Track } from "@/utils/types"

// --- HLS 相关的状态和 Ref ---
const mediaRef = ref<HTMLVideoElement | null>(null)
const hlsPlayer = ref<Hls | null>(null)
// 记录当前加载的 URL，用于避免重复加载
const currentMediaUrl = ref<string>()

// --- 播放器状态 ---
const playerState = reactive<{
  currentTime: number
  duration: number | undefined // 允许 undefined 以表示加载中
  loading: boolean
  paused: boolean
}>({
  currentTime: 0,
  duration: undefined, // 初始设置为 undefined
  loading: false,
  paused: true,
})

function updateMedia(track: Track) {
  // Update MediaSession
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
}

const track = computed(() => {
  return getCurrentTrack()
})

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
      seek(details.seekOffset ?? 10)
    })
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      seek(details.seekOffset ?? -10)
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
    updateMedia(getNthTrack(idx)) // FIXME: dont update when single repeat.
    loadSong()
  })

  // Initialize HLS player if supported
  if (Hls.isSupported() && mediaRef.value) {
    const hls = new Hls()
    hlsPlayer.value = hls
    hls.attachMedia(mediaRef.value)

    hls.on(Hls.Events.ERROR, (_event, data) => {
      console.error("HLS Error:", data.type, data.details, data.fatal ? "FATAL" : "NON-FATAL")
      if (data.fatal) {
        hls.destroy()
        // ...
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
      playerState.loading = false
    } else {
      playerState.duration = undefined // 确保非正常值时进入加载状态
      playerState.loading = true
    }
    playerState.paused = mediaRef.value.paused
  }
}

// --- 播放器控制方法 ---

function seek(time: number) {
  if (!mediaRef.value || !isFinite(time)) {
    return
  }
  mediaRef.value.currentTime = time
}

// 处理进度条点击事件以实现 Seek
function onProgressClick(event: MouseEvent) {
  const progressElement = event.currentTarget as HTMLProgressElement
  if (!progressElement || playerState.duration === undefined) {
    return
  }

  // 1. 获取点击位置的百分比
  const rect = progressElement.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percent = clickX / rect.width

  // 2. 计算目标时间
  const targetTime = percent * playerState.duration

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

async function loadSong() {
  if (!mediaRef.value || !track.value || playerState.loading) {
    return
  }

  // 加载新源之前，将 duration 设为 undefined，显示加载状态
  playerState.loading = true
  playerState.duration = undefined

  const finalUrl = await parseHlsLink(track.value)
  const isHls = finalUrl.includes(".m3u8")

  if (isHls && hlsPlayer.value) {
    // 2a. 使用 hls.js 播放 M3U8
    hlsPlayer.value.loadSource(finalUrl)

    hlsPlayer.value.once(Hls.Events.MANIFEST_PARSED, async () => {
      try {
        // 等待 HLS 解析完成后再播放
        await mediaRef.value!.play()
        playerState.paused = false
        currentMediaUrl.value = finalUrl
      } catch (error) {
        console.error("HLS Play Failed:", error)
        playerState.paused = true
      }
    })
  } else {
    // 2b. 普通音频/原生 HLS 逻辑
    mediaRef.value.src = finalUrl
    mediaRef.value.load() // 必须调用 load() 来触发加载

    try {
      // 尝试播放
      await mediaRef.value.play()
      playerState.paused = false
      currentMediaUrl.value = finalUrl
    } catch (error) {
      console.error("Play Failed (Native):", error)
      playerState.paused = true
    }
  }
}

async function resume() {
  if (!mediaRef.value || !track.value) {
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
  const trackIndex = await getNextTrackIdx(offset)

  if (trackIndex === -1) {
    seek(0)
    pause()
    return
  }

  // Always restart if user clicked the same track
  setCurrentTrack(trackIndex)

  // track will be loaded and resumed by watcher
  seek(0)
  pause()
}
</script>
