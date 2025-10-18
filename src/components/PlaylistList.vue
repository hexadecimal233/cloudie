<template>
  <div v-if="!currentItem" class="flex flex-col">
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
        :key="item.playlist?.id || item.system_playlist.id"
        @click="open(item)"
        :title="item.playlist?.title || item.system_playlist.title"
        class="bg-base-200 rounded-box flex flex-col gap-1 overflow-hidden outline transition-all hover:-translate-y-1 hover:cursor-pointer hover:opacity-70">
        <div class="bg-base-300 relative w-full">
          <img :src="getImageUrl(item).value" alt="cover" class="h-full w-full object-cover" />
          <!-- TODO: 加载中占位 -->
        </div>

        <div class="flex flex-col p-3">
          <div class="text-base-content truncate font-bold">
            {{ item.playlist?.title || item.system_playlist.title }}
          </div>
          <div class="mt-1 truncate text-sm">
            {{
              item.playlist?.user?.username ||
              $t("cloudie.playlists.madeFor", { name: item.system_playlist.made_for?.username }) ||
              item.system_playlist.description
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

  <div v-else>
    <button class="btn btn-primary" @click="currentItem = null">返回 TODO: 图标</button>
    <!-- TODO: 歌单标题显示 -->
    <TrackList :tracks="currentItem" :callback-item="currentResponse"></TrackList>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { replaceImageUrl } from "../utils/utils"
import { getV2ApiJson } from "../utils/api"
import TrackList from "./TrackList.vue"

const playlistTracksCache = ref<Record<number | string, any[]>>({}) // 系统播单id是string，歌单id是number
const currentItem = ref<any>(null)
const currentResponse = ref<any>(null)

const props = defineProps<{
  items: any[]
  cache: Record<number, any> // TODO: 性能优化
}>()

// TODO: 可视化加载
async function open(item: any) {
  if (playlistTracksCache.value[item.playlist?.id || item.system_playlist.id]) {
    currentItem.value = playlistTracksCache.value[item.playlist?.id || item.system_playlist.id]
  }

  try {
    let partialTracks: any[]
    if (item.playlist) {
      partialTracks = (
        await getV2ApiJson(`/playlists/${item.playlist.id}`, { representation: "full" })
      ).tracks
    } else {
      partialTracks = item.system_playlist.tracks
    }

    // 一次请求最多50个id (并行)
    const promises = []
    for (let i = 0; i < partialTracks.length; i += 50) {
      promises.push(
        getV2ApiJson("/tracks", {
          ids: partialTracks
            .slice(i, i + 50)
            .map((item: any) => item.id)
            .join(","),
        }),
      )
    }
    const finalTracks = (await Promise.all(promises)).flat()

    currentResponse.value = item
    playlistTracksCache.value[item.playlist?.id || item.system_playlist.id] = finalTracks
    currentItem.value = finalTracks
  } catch (err) {
    console.log(err) // TODO: 处理错误
  }
}

function getImageUrl(item: any) {
  return computed(() => {
    let artworkUrl = ""
    if (item.playlist) {
      artworkUrl = item.playlist.artwork_url || props.cache[item.playlist.id]?.tracks[0].artwork_url
    } else {
      artworkUrl =
        item.system_playlist.artwork_url ||
        props.cache[item.system_playlist.id]?.tracks[0].artwork_url
    }

    if (!artworkUrl) return ""

    return replaceImageUrl(artworkUrl, 200)
  })
}
</script>
