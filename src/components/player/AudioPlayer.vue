<template>
  <div class="bg-muted relative w-full transition-transform" v-if="playerState.track">
    <!-- TODO: Progress Bar and Needle than waveform -->
    <div class="h-10 bg-elevated w-full overflow-hidden">
      <Waveform :track="playerState.track"></Waveform>
    </div>

    <div class="flex w-full px-4 py-3">
      <TrackTitle :track="playerState.track" class="w-1/3" hide-play />

      <div class="flex items-center justify-center gap-4 w-1/3">
        <ListeningListButton />
        <UButton
          size="xl"
          class="rounded-full cursor-pointer"
          icon="i-mingcute-skip-previous-line"
          variant="soft"
          @click="playerState.nextTrack(-1)" />
        <UButton
          :loading="playerState.loading"
          :icon="playerState.isPaused ? 'i-mingcute-play-line' : 'i-mingcute-pause-line'"
          size="xl"
          class="rounded-full cursor-pointer"
          @click="togglePlay" />
        <UButton
          size="xl"
          class="rounded-full cursor-pointer"
          icon="i-mingcute-skip-forward-line"
          variant="soft"
          @click="playerState.nextTrack()" />
        <PlayOrderButton />
      </div>
      <div class="flex items-center justify-end w-1/3">
        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            class="rounded-full cursor-pointer"
            icon="i-mingcute-fullscreen-line"
            variant="ghost"
            @click="playerState.isFullscreen = !playerState.isFullscreen" />
          <span class="text-sm"
            >{{ formatSecs(isNaN(playerState.currentTime) ? 0 : playerState.currentTime) }}</span
          >
          <span class="text-sm">/</span>
          <span class="text-sm"
            >{{ formatSecs(isFinite(playerState.duration) ? playerState.duration : 0) }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from "@/systems/stores/player"
import { formatSecs } from "@/utils/utils"

const playerState = usePlayerStore()

async function togglePlay() {
  if (!playerState.isPaused) {
    playerState.pause()
  } else {
    await playerState.resume()
  }
}
</script>