<template>
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented transition-colors min-w-0 w-full">
    <TrackTitle class="flex-1 min-w-0" :track="track" :tracks="tracks" :listeningIndex="listeningIndex" :important="important" />

    <div class="flex items-center gap-2">
      <span class="text-sm opacity-50">{{ formatMillis(track.full_duration)
      }}</span>
      <UButton v-if="listeningIndex === undefined" variant="ghost" @click="addToListeningList">
        <i-mdi-plus />
      </UButton>
      <UButton variant="ghost" @click="downloadTrack">
        <i-mdi-download />
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Track, LocalPlaylist } from "@/utils/types"
import { formatMillis } from "@/utils/utils"
import { addToListeningList as addTrackToListeningList } from "@/systems/player/listening-list"
import { addDownloadTask } from "@/systems/download/download"

const props = defineProps<{
  track: Track
  tracks?: Track[]
  listeningIndex?: number
  important?: boolean
}>()

function addToListeningList() {
  addTrackToListeningList(props.track)
}

async function downloadTrack() {
  const playlist = new LocalPlaylist("single-track")
  playlist.tracks = [props.track]
  await addDownloadTask(props.track, playlist)
}
</script>