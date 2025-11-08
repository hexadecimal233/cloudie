<template>
  <!-- TODO: RESTYLE -->
  <div class="mini-track flex items-center gap-3 p-2 rounded-lg hover:bg-base-200  transition-colors min-w-0 w-full">
    <div class="relative size-12 cursor-pointer" @click="playTrack">
      <div class="absolute inset-0 flex items-center justify-center">
        <i-mdi-play class="text-white text-2xl" />
      </div>
      <img :src="getCoverUrl(track)" :alt="track.title" class="size-12 rounded object-cover" />
    </div>

    <div class="flex-1 min-w-0">
      <h3 class="text-sm truncate">{{ track.title }}</h3>
      <p class="text-xs opacity-70 truncate">{{ getArtist(track) }}</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm opacity-50">{{ formatMillis(track.full_duration) }}</span>
      <button v-if="listeningIndex === undefined" class="btn btn-ghost btn-sm" @click="addToListeningList">
        <i-mdi-plus />
      </button>
      <button class="btn btn-ghost btn-sm" @click="downloadTrack">
        <i-mdi-download />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Track, LocalPlaylist } from "@/utils/types"
import { formatMillis, getArtist, getCoverUrl } from "@/utils/utils"
import { addToListeningList as addTrackToListeningList } from "@/systems/player/listening-list"
import { addDownloadTask } from "@/systems/download/download"
import { usePlayerStore } from "@/systems/stores/player"

const props = defineProps<{
  track: Track
  tracks?: Track[]
  listeningIndex?: number
}>()
const playerStore = usePlayerStore()

function playTrack() {
  if (props.listeningIndex !== undefined) {
    playerStore.playIndex(props.listeningIndex)
  } else if (props.tracks !== undefined) {
    playerStore.play(props.track, props.tracks)
  } else {
    playerStore.play(props.track, [props.track])
  }
}

function addToListeningList() {
  addTrackToListeningList(props.track)
}

async function downloadTrack() {
  const playlist = new LocalPlaylist("single-track")
  playlist.tracks = [props.track]
  await addDownloadTask(props.track, playlist)
}
</script>

<style scoped>
.mini-track {
  transition: all 0.2s ease;
}

.mini-track:hover {
  transform: translateY(-1px);
}
</style>