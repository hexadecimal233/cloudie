import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { PlaylistLike, ExactPlaylist, UserPlaylist, Track } from "@/utils/types"
import { savePlaylist } from "@/systems/playlist-cache"
import { getPlaylist } from "@/utils/api"
import { getCoverUrl } from "@/utils/utils"

export const usePlaylistsStore = defineStore("playlists", () => {
  // State
  const currentResp = ref<null | PlaylistLike>(null)
  const loadedPlaylists = ref<Map<string, ExactPlaylist>>(new Map())
  const coverCachePlaylists = ref<Record<number, UserPlaylist>>({}) // 有些专获取不到artwork

  // Actions
  // Get reactive cover cache
  function getCoverCache(playlistId: number) {
    if (!coverCachePlaylists.value[playlistId]) {
      getPlaylist(playlistId, "mini").then((res) => {
        coverCachePlaylists.value[playlistId] = res
      })
    }

    return computed(() => {
      const item = coverCachePlaylists.value[playlistId]
      if (item) {
        const track = item.tracks?.[0] as Track
        return getCoverUrl(track)
      } else {
        return "" // unset
      }
    })
  }

  // 获取已加载的播单
  function getLoadedPlaylist(playlistId: string) {
    return loadedPlaylists.value.get(playlistId)
  }

  // 检查播单是否已加载
  function isPlaylistLoaded(playlistId: string) {
    return loadedPlaylists.value.has(playlistId)
  }

  // 保存播单到store
  function savePlaylistToStore(playlist: ExactPlaylist) {
    loadedPlaylists.value.set(playlist.id.toString(), playlist)
    // 同时保存到缓存
    savePlaylist(playlist)
  }

  return {
    // State
    currentResp,
    loadedPlaylists,

    // Actions
    getCoverCache,
    getLoadedPlaylist,
    isPlaylistLoaded,
    savePlaylistToStore,
  }
})
