<template>
  <div>
    <div v-if="currentPlaylist" class="text-xl">{{ currentPlaylist.title }}</div>
    <div>
      <TrackList
        :tracks="currentPlaylist.tracks"
        :playlistId="currentPlaylist.id.toString()"
        :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts" name="PlaylistView">
import { ExactPlaylist, SystemPlaylist, UserPlaylist } from "@/utils/types"
import { computed, onMounted, ref } from "vue"
import { usePlaylistsStore } from "@/systems/stores/playlists"
import { fetchPlaylistUpdates, savePlaylist, tryGetPlaylist } from "@/systems/playlist-cache"
import { i18n } from "@/systems/i18n"

const playlistsStore = usePlaylistsStore()
const toast = useToast()

// 从store获取当前播单
const playlistRef = playlistsStore.currentResp
const currentPlaylist = computed(() => {
  const playlist = playlistRef!.system_playlist ?? playlistRef!.playlist
  if (!playlist.tracks) {
    playlist.tracks = [] // a fix for no tracks
  }
  return playlist as unknown as ExactPlaylist
})

const loading = ref(true)

// TODO: 监听路由参数变化，加载播单数据

function setPlaylist(playlist: ExactPlaylist) {
  if (playlistRef!.system_playlist) {
    playlistRef!.system_playlist = playlist as unknown as SystemPlaylist
  } else {
    playlistRef!.playlist = playlist as unknown as UserPlaylist
  }
}

onMounted(async () => {
  let playlistId = playlistsStore.currentResp!.playlist
    ? playlistsStore.currentResp!.playlist.id
    : playlistsStore.currentResp!.system_playlist.id

  try {
    // FIXME: the orders are messed up after querying from database
    let currentPlaylist = await tryGetPlaylist(playlistId)
    const newCreatedPlaylist = !currentPlaylist
    if (!currentPlaylist) {
      // typescript is dumb and cannot infer currentPlaylist is no longer null
      currentPlaylist = await fetchPlaylistUpdates(playlistsStore.currentResp!)
    }

    setPlaylist(currentPlaylist)

    loading.value = false

    await savePlaylist(currentPlaylist)

    if (!newCreatedPlaylist) {
      // Reactively update playtlist meta
      fetchPlaylistUpdates(
        playlistsStore.currentResp!,
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
    toast.add({
      color: "error",
      title: i18n.global.t("skye.toasts.playlistOpenFailed"),
      description: err.message,
    })
    return
  }
})
</script>
