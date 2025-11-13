<template>
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented transition-colors min-w-0 w-full">
    <img :src="getCoverUrl(playlist)" :alt="playlist.name || playlist.title"
      class="w-16 h-16 rounded-lg object-cover" />
    <div>
      <span class="font-bold text-lg">{{ playlist.name || playlist.title }}</span>
      <p class="text-sm opacity-70">{{ (playlist.tracks || []).length }} {{ $t("cloudie.trackList.song") }}</p>
    </div>
    <button class="btn btn-primary btn-sm ml-auto" @click="playAll">
      <i-mdi-play />
      {{ $t("cloudie.common.play") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { getCoverUrl } from "@/utils/utils"
import { BasePlaylist, LocalPlaylist, Track } from "@/utils/types"
import { usePlayerStore } from "@/systems/stores/player"

const props = defineProps<{
  playlist: BasePlaylist
}>()

const playerStore = usePlayerStore()

// TODO: playall
function playAll() {
  const tracks = props.playlist.tracks || []
  if (tracks.length > 0) {
    playerStore.play(tracks[0], tracks)
  }
}
</script>

<style scoped>
.mini-playlist {
  background-color: var(--fallback-b1, oklch(var(--b1)));
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>