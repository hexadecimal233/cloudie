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
      <TrackList :playlist="currentPlaylist">
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
import { ExactPlaylist, Playlist, PlaylistLike, SystemPlaylist } from "@/utils/types"
import { computed, onMounted, ref } from "vue"
import { fetchPlaylistUpdates } from "@/systems/cache"
import { getPlaylist } from "@/systems/cache"
import { toast } from "vue-sonner"
import { i18n } from "@/systems/i18n"
import { savePlaylist } from "@/systems/cache"

const props = defineProps<{
  currentResp: PlaylistLike
}>()

const playlistRef = ref(props.currentResp)
const currentPlaylist = computed(() => {
  const playlist = playlistRef.value.system_playlist ?? playlistRef.value.playlist
  if (!playlist.tracks) {
    playlist.tracks = [] // a fix for no tracks
  }
  return playlist as unknown as ExactPlaylist
})

const loading = ref(true)

function setPlaylist(playlist: ExactPlaylist) {
  if (playlistRef.value.system_playlist) {
    playlistRef.value.system_playlist = playlist as unknown as SystemPlaylist
  } else {
    playlistRef.value.playlist = playlist as unknown as Playlist
  }
}

onMounted(async () => {
  let playlistId = props.currentResp.playlist
    ? props.currentResp.playlist.id
    : props.currentResp.system_playlist.id

  try {
    // FIXME: the orders are messed up after querying from database
    let currentPlaylist = await getPlaylist(playlistId)
    const newCreatedPlaylist = !currentPlaylist
    if (!currentPlaylist) {
      // typescript is dumb and cannot infer currentPlaylist is no longer null
      currentPlaylist = await fetchPlaylistUpdates(props.currentResp)
    }

    setPlaylist(currentPlaylist)

    loading.value = false

    await savePlaylist(currentPlaylist)

    if (!newCreatedPlaylist) {
      // Reactively update playtlist meta
      fetchPlaylistUpdates(
        props.currentResp,
        currentPlaylist.tracks!.map((t) => t.id),
      )
        .then((playlist) => {
          console.log("playlist refreshed")
          setPlaylist(playlist)
        })
        .catch((e) => {
          console.error("Failed to refresh playlist", e)
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
