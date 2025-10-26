<template>
  <audio
    @timeupdate="onTimeUpdate"
    @onended="onEnded"
    @loadedmetadata="onLoadedMetadata"
    ref="audio"
    src="https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.mp3"></audio>

  <div class="bg-base-200 flex h-28 flex-col">
    <div>
      <progress
        class="progress h-1"
        :value="audio?.currentTime || 0"
        :max="audio?.duration || 0"></progress>
    </div>
    <div class="flex h-full w-full px-2">
      <div class="flex flex-1/3 gap-2">
        <img :src="getCoverUrl(track)" alt="cover" class="skeleton h-20 object-cover" />
        <div v-if="track" class="flex flex-col">
          <p class="font-bold">{{ track.title }}</p>
          <p class="text-base-content/70">{{ getArtist(track) }}</p>
        </div>
      </div>

      <div class="flex flex-1/3 items-center justify-center gap-4">
        <button class="btn btn-ghost btn-circle">
          <i-mdi-playlist-play />
        </button>
        <button class="btn btn-ghost btn-circle">
          <i-mdi-rewind />
        </button>
        <button class="btn btn-primary btn-circle" @click="togglePlay">
          <i-mdi-play v-if="audio?.paused" />
          <i-mdi-pause v-else />
        </button>
        <button class="btn btn-ghost btn-circle">
          <i-mdi-fast-forward />
        </button>
        <PlayOrderSwitch></PlayOrderSwitch>
      </div>
      <div class="flex-1/3">XXX</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "vue"
import PlayOrderSwitch from "./PlayOrderSwitch.vue"
import { listeningList } from "@/systems/player/playlist"
import { config } from "@/systems/config"
import { getArtist, getCoverUrl } from "@/utils/utils"

// 1. 创建响应式状态来存储原生音频属性
const playerState = reactive({
  currentTime: 0,
  duration: 0,
  paused: true,
})

const audio = ref<HTMLAudioElement | null>(null)

function onTimeUpdate(event: Event) {
  if (audio.value) {
    playerState.currentTime = audio.value.currentTime
    playerState.duration = audio.value.duration
  }
}

function onEnded() {
  playerState.paused = true
  // 处理播放结束逻辑...
}

function onLoadedMetadata() {
  if (audio.value) {
    playerState.duration = audio.value.duration
    playerState.paused = audio.value.paused
  }
}

async function togglePlay() {
  if (!audio.value) {
    return
  }

  if (audio.value.paused) {
    await audio.value.play()
    playerState.paused = false
  } else {
    audio.value.pause()
    playerState.paused = true
  }
}

const track = computed(() => {
  return listeningList.value[config.value.currentIndex]
})
</script>
