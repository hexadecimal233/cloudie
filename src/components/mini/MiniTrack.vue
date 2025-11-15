<template>
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented/50 transition-colors min-w-0 w-full h-18">
    <TrackTitle class="flex-1 min-w-0" :track="track" :tracks="tracks" :listeningIndex="listeningIndex" />

    <div class="flex items-center gap-2">
      <span class="text-sm opacity-50">{{ formatMillis(track.full_duration) }}</span>
      <UButton
      variant="ghost"
        :icon="user.isLikedTrack(track.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'" 
        :color="user.isLikedTrack(track.id) ? 'primary' : 'neutral'"
         @click="user.toggleLikeTrack(track.id)" />
      <UButton color="neutral" icon="i-mingcute-add-line" v-if="listeningIndex === undefined" variant="ghost" @click="addToListeningList" />
      <UButton color="neutral" icon="i-mingcute-download-line" variant="ghost" @click="downloadTrack" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Track, LocalPlaylist } from "@/utils/types"
import { formatMillis } from "@/utils/utils"
import { addToListeningList as addTrackToListeningList } from "@/systems/player/listening-list"
import { addDownloadTask } from "@/systems/download/download"
import { useUserStore } from "@/systems/stores/user"

const user = useUserStore()

const props = defineProps<{
  track: Track
  tracks?: Track[]
  listeningIndex?: number
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