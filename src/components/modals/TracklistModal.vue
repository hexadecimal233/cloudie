<template>
  <VueFinalModal
    class="flex items-center justify-center"
    overlay-transition="vfm-fade"
    content-transition="vfm-fade"
    content-class="max-w-screen modal-box opacity-100 ">
    <div v-if="currentResp" class="text-xl">
      {{ currentResp.playlist?.title || currentResp.system_playlist?.title }}
    </div>
    <div>
      <TrackList :tracks="tracks" :playlist-response="currentResp">
        <template #bottom>
          <template v-if="loading">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </template>

          <template v-else>
            <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
          </template>
        </template>
      </TrackList>
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
import { getPlaylist } from "@/systems/cache"
import { toast } from "vue-sonner"
import { i18n } from "@/systems/i18n"
import { savePlaylist } from "@/systems/cache"

const props = defineProps<{
  currentResp: PlaylistLike
}>()

const playlistRef = ref(props.currentResp)
const loading = ref(true)
const tracks = ref<Track[]>([])

onMounted(async () => {
  let playlistId = props.currentResp.playlist
    ? props.currentResp.playlist.id
    : props.currentResp.system_playlist.id

  try {
    let currentPlaylist = await getPlaylist(playlistId)
    const newCreatedPlaylist = !currentPlaylist
    if (newCreatedPlaylist) {
      currentPlaylist = await fetchPlaylistUpdates(props.currentResp)
    }

    tracks.value = currentPlaylist!.tracks as Track[]
    loading.value = false

    await savePlaylist(currentPlaylist)

    if (!newCreatedPlaylist) {
      // Reactively update playtlist meta
      fetchPlaylistUpdates(
        props.currentResp,
        (props.currentResp.playlist ?? props.currentResp.system_playlist).tracks!.map((t) => t.id), // FIXME: Undefinded???
      ).then((playlist) => {
        if (playlistRef.value.system_playlist) {
          playlistRef.value.system_playlist = playlist as SystemPlaylist
        } else {
          playlistRef.value.playlist = playlist as Playlist
        }
      })
    }
  } catch (err: any) {
    console.error("PlaylistList open error:", err)
    toast.error(i18n.global.t("cloudie.toasts.playlistOpenFailed"), {
      description: err.message,
    })
    return
  }
})

const emit = defineEmits<{
  (e: "close"): void
}>()
</script>
