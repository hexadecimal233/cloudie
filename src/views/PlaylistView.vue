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
      <template v-if="loading">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
      </template>

      <template v-else-if="hasNext">
        <button class="btn" @click="fetchNext">{{ $t("cloudie.common.loadMore") }}</button>
      </template>

      <template v-else>
        <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
      </template>
    </template>
  </PlaylistList>
</template>

<script setup lang="ts" name="PlaylistView">
import { ref, onMounted, computed } from "vue"
import { getJson, getV2ApiJson } from "@/utils/api"
import PlaylistList from "@/components/PlaylistList.vue"
import { CollectionResp, PlaylistLike } from "@/utils/types"

const playlists = ref<PlaylistLike[]>([])
const coverCache = ref<Record<number, any>>({}) // 有些专获取不到artwork，因为到时候还要用所以就共用一下缓存
const loading = ref(false)
const nextHref = ref<string | null>(null)
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
    const res: CollectionResp<PlaylistLike> = await promise
    playlists.value = [...playlists.value, ...(res.collection || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href

    // Fetch missing artwork URLs in the background
    res.collection.forEach((item: PlaylistLike) => {
      if (item.playlist && !item.playlist.artwork_url) {
        fetchPlaylist(item.playlist.id)
      }
    })
  } catch (err) {
    console.error("PlaylistView fetchNext error:", err)
    // TODO: display error on page
    return
  } finally {
    loading.value = false
  }
}

async function fetchPlaylist(id: number) {
  if (coverCache.value[id]) {
    return coverCache.value[id]
  }

  const res = await getV2ApiJson(`/playlists/${id}`)
  coverCache.value[id] = res
  return res
}

onMounted(fetchNext)
</script>
