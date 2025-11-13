<template>
  <div class="flex flex-col">
    <div class="grid grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      <div v-for="item in items" :key="item.playlist?.id ?? item.system_playlist!.id" @click="openPlaylist(item)"
        :title="item.playlist?.title ?? item.system_playlist!.title"
        class="bg-elevated rounded-md flex flex-col gap-1 overflow-hidden shadow-xs transition-all hover:-translate-y-1 hover:cursor-pointer hover:opacity-70">
        <div class="bg-accented relative aspect-square w-full">
          <img v-if="getImageUrl(item).value" :src="getImageUrl(item).value" alt="cover"
            class="h-full w-full object-cover" />
          <USkeleton v-else class="absolute inset-0 h-full w-full rounded-none" />
        </div>
        <div class="flex flex-col p-3">
          <div class="truncate font-bold">
            {{ item.playlist?.title ?? item.system_playlist!.title }}
          </div>
          <div class="mt-1 truncate text-sm">
            {{
              item.playlist?.user.username ||
              (item.system_playlist!.made_for
                ? $t("cloudie.library.madeFor", {
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
import { replaceImageUrl } from "@/utils/utils"
import { PlaylistLike } from "@/utils/types"
import { useRouter } from "vue-router"
import { usePlaylistsStore } from "@/systems/stores/playlists"
import { computed } from "vue"

defineProps<{
  items: PlaylistLike[]
}>()

const router = useRouter()
const playlistsStore = usePlaylistsStore()

function openPlaylist(likeResp: PlaylistLike) {
  const playlistId = likeResp.playlist?.id ?? likeResp.system_playlist!.id
  playlistsStore.currentResp = likeResp

  if (likeResp.system_playlist) {
    router.push(`/system-playlist/${playlistId}`)
  } else {
    router.push(`/user-playlist/${playlistId}`)
  }
}

// get & fetch missing artwork
function getImageUrl(item: PlaylistLike) {
  return computed(() => {
    let artworkUrl = ""
    if (item.playlist) {
      if (item.playlist.artwork_url) {
        artworkUrl = item.playlist.artwork_url
      } else {
        artworkUrl = playlistsStore.getCoverCache(item.playlist.id).value
      }
    } else {
      artworkUrl = item.system_playlist.artwork_url
    }

    if (!artworkUrl) return ""

    return replaceImageUrl(artworkUrl)
  })
}
</script>
