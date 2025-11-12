<template>
  <video @timeupdate="onTimeUpdate" @ended="onEnded" @loadedmetadata="onLoadedMetadata" @play="onPlay" @pause="onPause"
    ref="mediaRef" autoplay hidden></video>

  <div v-if="!!playerState.track" class="bg-muted relative w-full">
    <!-- TODO: Progress Bar and Needle than waveform -->
    <div class="h-10 bg-elevated w-full overflow-hidden">
      <Waveform :waveform-url="playerState.track.waveform_url"
        :play-progress="playerState.currentTime / (playerState.duration || 1)" @click="onProgressClick"></Waveform>
    </div>

    <div class="flex w-full px-4 py-3">
      <TrackTitle :track="playerState.track" class="w-1/3" hide-play />

      <div class="flex items-center justify-center gap-4 w-1/3">
        <ListeningListButton />
        <UButton size="xl" class="rounded-full cursor-pointer" icon="i-mdi-rewind" variant="soft" @click="playerState.nextTrack(-1)" />
        <UButton :loading="playerState.loading" :icon="playerState.isPaused ? 'i-mdi-play' : 'i-mdi-pause'" size="xl"
          class="rounded-full cursor-pointer" @click="togglePlay" />
        <UButton size="xl" class="rounded-full cursor-pointer" icon="i-mdi-fast-forward" variant="soft"
          @click="playerState.nextTrack()" />
        <PlayOrderButton />
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
import { ref, onMounted } from "vue"
import { usePlayerStore } from "@/systems/stores/player"
const playerState = usePlayerStore()

const mediaRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  // TODO: Refactor this to use playerState
  playerState.init(mediaRef)
})

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
      playerState.duration = undefined // 确保非正常值时进入加载状态
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

function onProgressClick(percentage: number) {
  const targetTime = percentage * (playerState.duration ?? playerState.track?.duration ?? 0) // FIXME: clicking when initial loading cause next track

  playerState.seek(targetTime)

  if (playerState.isPaused) {
    playerState.resume()
  }
}

async function togglePlay() {
  if (!playerState.isPaused) {
    playerState.pause()
  } else {
    await playerState.resume()
  }
}
</script>
