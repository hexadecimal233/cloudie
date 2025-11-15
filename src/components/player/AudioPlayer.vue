<template>
  <video @timeupdate="onTimeUpdate" @ended="onEnded" @loadedmetadata="onLoadedMetadata" @play="onPlay" @pause="onPause"
    ref="mediaRef" autoplay hidden></video>

  <div class="bg-muted relative w-full transition-transform" v-if="playerState.track">
    <!-- TODO: Progress Bar and Needle than waveform -->
    <div class="h-10 bg-elevated w-full overflow-hidden">
      <Waveform :track="playerState.track"></Waveform>
    </div>

    <div class="flex w-full px-4 py-3">
      <TrackTitle :track="playerState.track" class="w-1/3" hide-play />

      <div class="flex items-center justify-center gap-4 w-1/3">
        <ListeningListButton />
        <UButton size="xl" class="rounded-full cursor-pointer" icon="i-mingcute-skip-previous-line" variant="soft" @click="playerState.nextTrack(-1)" />
        <UButton :loading="playerState.loading" :icon="playerState.isPaused ? 'i-mingcute-play-line' : 'i-mingcute-pause-line'" size="xl"
          class="rounded-full cursor-pointer" @click="togglePlay" />
        <UButton size="xl" class="rounded-full cursor-pointer" icon="i-mingcute-skip-forward-line" variant="soft"
          @click="playerState.nextTrack()" />
        <PlayOrderButton />
      </div>
      <div class="flex items-center justify-end w-1/3">
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ formatSecs(isNaN(playerState.currentTime) ? 0 : playerState.currentTime) }}</span>
          <span class="text-sm">/</span>
          <span class="text-sm">{{ formatSecs(isFinite(playerState.duration) ? playerState.duration : 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { usePlayerStore } from "@/systems/stores/player"
const playerState = usePlayerStore()

const mediaRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  playerState.init(mediaRef)
})

function onTimeUpdate(_event: Event) {
  if (mediaRef.value) {
    // 修复 NaN/Infinity 错误: 仅当 duration 是有效数字时才更新
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      playerState.currentTime = mediaRef.value.currentTime
      playerState.duration = duration
    } else {
      console.warn("Invalid duration value:", duration)
    }
  }
}

function onEnded() {
  playerState.nextTrack()
}

function onLoadedMetadata() {
  if (mediaRef.value) {
    // metadata 加载后，duration 通常是正确的了
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      playerState.duration = duration
      playerState.loading = false
    } else {
      console.warn("Invalid duration value on load:", duration)
      playerState.duration = Infinity // 确保非正常值时进入加载状态
      playerState.loading = true
    }
  }
}

function onPlay() {
  playerState.isPaused = false
}

function onPause() {
  playerState.isPaused = true
}

import { formatSecs } from "@/utils/utils"

async function togglePlay() {
  if (!playerState.isPaused) {
    playerState.pause()
  } else {
    await playerState.resume()
  }
}
</script>
