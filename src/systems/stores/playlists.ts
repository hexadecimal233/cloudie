import { defineStore } from "pinia"
import { computed } from "vue"
import { PlaylistLike, ExactPlaylist, UserPlaylist, Track } from "@/utils/types"
import { savePlaylist } from "@/systems/playlist-cache"
import { getPlaylist } from "@/utils/api"
import { getCoverUrl } from "@/utils/utils"

// TODO: Finish Playlists Store, do not add non ExactPlaylist to loadedPlaylists
interface PlaylistsState {
  currentResp: null | PlaylistLike
  loadedPlaylists: Map<string, ExactPlaylist>
  coverCachePlaylists: Record<number, UserPlaylist> // 有些专获取不到artwork
}

export const usePlaylistsStore = defineStore("playlists", {
  state: (): PlaylistsState => {
    return {
      currentResp: null,
      loadedPlaylists: new Map(), // TODO
      coverCachePlaylists: {},
    }
  },
  getters: {
    getCoverCache: (state) => {
      return (playlistId: number) => {
        if (!state.coverCachePlaylists[playlistId]) {
          getPlaylist(playlistId, "mini").then((res) => {
            state.coverCachePlaylists[playlistId] = res
          })
        }

        return computed(() => {
          const item = state.coverCachePlaylists[playlistId]
          if (item) {
            const track = item.tracks?.[0] as Track
            return getCoverUrl(track)
          } else {
            return "" // unset
          }
        })
      }
    },
  },
  actions: {},
})
