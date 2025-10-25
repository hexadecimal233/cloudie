<template>
  <VueFinalModal
    class="flex items-center justify-center"
    overlay-transition="vfm-fade"
    content-transition="vfm-fade"
    content-class="max-w-screen modal-box opacity-100">
    <div v-if="currentResponse" class="text-xl">
      {{ currentResponse.playlist?.title || currentResponse.system_playlist?.title }}
    </div>
    <div>
      <TrackList :tracks="tracks" :playlist-response="currentResponse" />
    </div>
    <div class="modal-action">
      <button class="btn" @click="emit('close')">{{ $t("cloudie.toasts.close") }}</button>
    </div>
  </VueFinalModal>
</template>

<script setup lang="ts">
import { VueFinalModal } from "vue-final-modal"
import TrackList from "../TrackList.vue"
import { Playlist, PlaylistLike, SystemPlaylist, Track } from "@/utils/types"
import { onMounted, ref } from "vue"
import { fetchPlaylistUpdates } from "@/systems/cache"

const props = defineProps<{
  tracks: Track[]
  currentResponse: PlaylistLike
  shouldAutoUpdate: boolean
}>()

const playlistRef = ref(props.currentResponse)

onMounted(() => {
  if (props.shouldAutoUpdate) {
    // Reactively update playtlist meta
    fetchPlaylistUpdates(
      props.currentResponse,
      (props.currentResponse.playlist ?? props.currentResponse.system_playlist).tracks!.map(
        (t) => t.id,
      ),
    ).then((playlist) => {
      if (playlistRef.value.system_playlist) {
        playlistRef.value.system_playlist = playlist as SystemPlaylist
      } else {
        playlistRef.value.playlist = playlist as Playlist
      }
    })
  }
})

const emit = defineEmits<{
  (e: "close"): void
}>()
</script>
