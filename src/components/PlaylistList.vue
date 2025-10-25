<template>
  <div class="flex flex-col">
    <!-- 空状态 TODO: 搜索歌单名字 -->
    <div v-if="items.length === 0" class="py-8 text-center">
      <div class="mb-2 text-lg">{{ $t("cloudie.common.empty") }}</div>
      <div class="text-base-content/70 text-sm">{{ $t("cloudie.common.emptyDesc") }}</div>
    </div>

    <!-- <span v-if="searchQuery">{{ items.length }} 个结果</span> -->

    <!-- 歌单网格 -->
    <div class="grid grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      <div
        v-for="item in items"
        :key="item.playlist?.id ?? item.system_playlist!.id"
        @click="open(item)"
        :title="item.playlist?.title ?? item.system_playlist!.title"
        class="bg-base-200 rounded-box flex flex-col gap-1 overflow-hidden outline transition-all hover:-translate-y-1 hover:cursor-pointer hover:opacity-70">
        <div class="bg-base-300 relative w-full aspect-square">
          <img
            v-if="getImageUrl(item).value"
            :src="getImageUrl(item).value"
            alt="cover"
            class="h-full w-full object-cover" />
          <div v-else class="skeleton rounded-none h-full w-full absolute inset-0"></div>
        </div>
        <div class="flex flex-col p-3">
          <div class="text-base-content truncate font-bold">
            {{ item.playlist?.title ?? item.system_playlist!.title }}
          </div>
          <div class="mt-1 truncate text-sm">
            {{
              item.playlist?.user.username ||
              (item.system_playlist!.made_for
                ? $t("cloudie.playlists.madeFor", {
                    name: item.system_playlist!.made_for?.username,
                  })
                : item.system_playlist!.description)
            }}
          </div>
          <!-- 分别是普通歌单、系统歌单和电台歌单的简介 -->
        </div>
      </div>
    </div>

    <div class="flex items-center justify-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { replaceImageUrl } from "../utils/utils"
import { toast } from "vue-sonner"
import { PlaylistLike, Track } from "@/utils/types"
import { i18n } from "@/systems/i18n"
import TracklistModal from "./modals/TracklistModal.vue"
import { useModal } from "vue-final-modal"
import { fetchPlaylistUpdates, getPlaylist, savePlaylist } from "@/systems/cache"

const props = defineProps<{
  items: PlaylistLike[]
  cache: Record<number, any> // TODO: 性能优化
}>()

// TODO: 可视化加载
async function open(likeResp: PlaylistLike) {
  let playlistId = likeResp.playlist ? likeResp.playlist.id : likeResp.system_playlist.id

  try {
    let currentPlaylist = await getPlaylist(playlistId)
    if (!currentPlaylist) {
      currentPlaylist = await fetchPlaylistUpdates(likeResp)
    }

    const { open, close } = useModal({
      component: TracklistModal,
      attrs: {
        tracks: currentPlaylist!.tracks as Track[],
        currentResponse: likeResp,
        shouldAutoUpdate: !currentPlaylist,
        onClose() {
          close()
        },
      },
    })

    open()

    savePlaylist(currentPlaylist)
  } catch (err: any) {
    console.error("PlaylistList open error:", err)
    toast.error(i18n.global.t("cloudie.toasts.playlistOpenFailed"), {
      description: err.message,
    })
    return
  }
}

function getImageUrl(item: PlaylistLike) {
  return computed(() => {
    let artworkUrl = ""
    if (item.playlist) {
      artworkUrl = item.playlist.artwork_url || props.cache[item.playlist.id]?.tracks[0].artwork_url
    } else {
      artworkUrl = item.system_playlist.artwork_url
    }

    if (!artworkUrl) return ""

    return replaceImageUrl(artworkUrl, 200)
  })
}
</script>
