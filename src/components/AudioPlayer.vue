<template>
  <audio
    @timeupdate="onTimeUpdate"
    @onended="onEnded"
    @loadedmetadata="onLoadedMetadata"
    ref="audio"></audio>

  <div class="bg-base-200 relative h-24">
    <progress
      class="progress hover absolute top-0 h-1.5 rounded-none transition-all hover:-top-1.5 hover:h-3"
      :value="playerState.currentTime"
      :max="playerState.duration"></progress>
    <div class="flex h-full w-full px-4 py-3">
      <div class="flex flex-1/3 gap-2">
        <img :src="getCoverUrl(track)" alt="cover" class="skeleton object-cover" />
        <div v-if="track" class="flex flex-col">
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
          <i-mdi-play v-if="playerState.paused" />
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
import { computed, reactive, ref } from "vue"
import PlayOrderSwitch from "./PlayOrderSwitch.vue"
import { getNextTrackIndex as getNextTrackIdx, listeningList } from "@/systems/player/playlist"
import { config } from "@/systems/config"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { parseDownload } from "@/systems/download/parser"

const playerState = reactive({
  currentTime: 0,
  duration: 0,
  paused: true,
})

const audio = ref<HTMLAudioElement | null>(null)

function onTimeUpdate(_event: Event) {
  if (audio.value) {
    playerState.currentTime = audio.value.currentTime
    playerState.duration = audio.value.duration
  }
}

async function nextTrack(offset: number = 1) {
  const trackIndex = await getNextTrackIdx(offset)
  if (trackIndex == -1) {
    // pause and set time to 0 when no next track
    seek(0)
    pause()
    return
  }

  config.value.currentIndex = trackIndex
  seek(0)
  resume()
}

function onEnded() {
  nextTrack()
}

function onLoadedMetadata() {
  if (audio.value) {
    playerState.duration = audio.value.duration
    playerState.paused = audio.value.paused
  }
}

function seek(time: number) {
  if (!audio.value) {
    return
  }

  audio.value.currentTime = time
}

function pause() {
  if (!audio.value) {
    return
  }

  audio.value.pause()
  playerState.paused = true
}

async function resume() {
  if (!audio.value) {
    return
  }

  const parsedDownload = await parseDownload(track.value, true)
  audio.value.src = parsedDownload.finalUrl

  // TODO: error handling

  await audio.value.play()
  playerState.paused = false
}

async function togglePlay() {
  if (!audio.value) {
    return
  }

  if (audio.value.paused) {
    await resume()
  } else {
    pause()
  }
}

const track = computed(() => {
  return listeningList.value[config.value.currentIndex]
})
</script>
