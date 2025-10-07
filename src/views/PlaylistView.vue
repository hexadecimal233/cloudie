<template>
  <!-- Tab 导航 -->
  <div class="tabs tabs-border mb-6">
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      aria-label="歌单"
      @click="activeTab = 'playlist'"
      checked />
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      aria-label="系统推荐"
      @click="activeTab = 'system'" />
    <input
      type="radio"
      name="playlist_tabs"
      class="tab"
      aria-label="专辑"
      @click="activeTab = 'album'" />
  </div>

  <!-- 歌单列表 -->
  <PlaylistList :items="filteredItems" :cache="cache">
    <template #bottom>
      <template v-if="loading">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">加载中...</span>
      </template>

      <template v-else-if="hasNext">
        <button class="btn" @click="fetchNext">加载更多</button>
      </template>

      <template v-else>
        <span class="ml-2">没有更多了</span>
      </template>
    </template>
  </PlaylistList>
</template>

<script setup lang="ts" name="PlaylistView">
import { ref, onMounted, computed } from "vue"
import { getJson, getV2ApiJson } from "../utils/api"
import PlaylistList from "../components/PlaylistList.vue"

const playlists = ref<any[]>([])
const cache = ref<Record<number, any>>({}) // 有些专获取不到artwork，因为到时候还要用所以就共用一下缓存
const loading = ref(false)
const nextHref = ref("")
const hasNext = ref(false)
const activeTab = ref<"system" | "playlist" | "album">("playlist")

// 根据当前tab过滤项目
const filteredItems = computed(() => {
  switch (activeTab.value) {
    case "system":
      return playlists.value.filter((item) => item.type === "system-playlist-like")
    case "playlist":
      return playlists.value.filter(
        (item) => item.type === "playlist-like" && !item.playlist?.is_album,
      )
    case "album":
      return playlists.value.filter(
        (item) => item.type === "playlist-like" && item.playlist?.is_album === true,
      )
  }
})

async function fetchNext() {
  loading.value = true

  const promise = nextHref.value
    ? getJson(nextHref.value)
    : getV2ApiJson("/me/library/all", { limit: 30 })

  try {
    const res = await promise
    playlists.value = [...playlists.value, ...(res.collection || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href || ""

    // Fetch missing artwork URLs in the background
    res.collection.forEach((item: any) => {
      if (!item.playlist.artwork_url && item.playlist.id) {
        fetchPlaylist(item.playlist.id)
      }
    })
  } catch (err) {
    // TODO: Error alert
    console.error(err)
    return
  } finally {
    loading.value = false
  }
}

async function fetchPlaylist(id: number) {
  if (cache.value[id]) {
    return cache.value[id]
  }

  const res = await getV2ApiJson(`/playlists/${id}`)
  cache.value[id] = res
  return res
}

onMounted(fetchNext)
</script>
