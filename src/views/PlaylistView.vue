<template>
  <!-- Tab 导航 -->
  <div class="tabs tabs-border mb-6">
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      :aria-label="$t('cloudie.playlists.playlist')"
      @click="activeTab = 'playlist'"
      checked />
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      :aria-label="$t('cloudie.playlists.systemPlaylist')"
      @click="activeTab = 'system'" />
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      :aria-label="$t('cloudie.playlists.album')"
      @click="activeTab = 'album'" />
  </div>

  <!-- 歌单列表 -->
  <PlaylistList :items="filteredItems" :cache="coverCache">
    <template #bottom>
      <template v-if="collection.loading.value">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
      </template>

      <template v-else-if="collection.hasNext.value">
        <button class="btn" @click="collection.fetchNext">{{ $t("cloudie.common.loadMore") }}</button>
      </template>

      <template v-else>
        <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
      </template>
    </template>
  </PlaylistList>
</template>

<script setup lang="ts" name="PlaylistView">
import { ref, onMounted, computed, watch } from "vue"
import { getPlaylist, useLibrary } from "@/utils/api"
import PlaylistList from "@/components/PlaylistList.vue"
import { PlaylistLike } from "@/utils/types"

const coverCache = ref<Record<number, any>>({}) // 有些专获取不到artwork，因为到时候还要用所以就共用一下缓存
const activeTab = ref<"system" | "playlist" | "album">("playlist")

const collection = useLibrary()

const filteredItems = computed(() => {
  switch (activeTab.value) {
    case "system":
      return collection.data.value.filter((item) => item.type === "system-playlist-like")
    case "playlist":
      return collection.data.value.filter(
        (item) => item.type === "playlist-like" && !item.playlist?.is_album,
      )
    case "album":
      return collection.data.value.filter(
        (item) => item.type === "playlist-like" && item.playlist?.is_album === true,
      )
  }
})

async function fetchPlaylist(id: number) {
  if (coverCache.value[id]) {
    return coverCache.value[id]
  }

  const res = await getPlaylist(id)
  coverCache.value[id] = res
  return res
}

// Watch for new items and fetch missing artwork
watch(
  () => collection.data.value,
  (newData) => {
    newData.forEach((item: PlaylistLike) => {
      if (item.playlist && !item.playlist.artwork_url) {
        fetchPlaylist(item.playlist.id)
      }
    })
  },
)

onMounted(() => {
  collection.fetchNext()
})
</script>
