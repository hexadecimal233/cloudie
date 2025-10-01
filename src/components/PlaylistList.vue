<template>
  <div class="flex flex-col">
    <!-- 空状态 TODO: 搜索歌单名字 -->
    <div v-if="items.length === 0" class="text-center py-8">
      <div class="text-lg mb-2">这里空空如也 (。・ω・。)</div>
      <div class="text-sm text-base-content/70">请尝试刷新或者调整搜索条件</div>
    </div>

    <!-- <span v-if="searchQuery">{{ items.length }} 个结果</span> -->

    <!-- 歌单网格 -->
    <div class="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <div
        v-for="item in items"
        :key="item.playlist?.id || item.system_playlist.id"
        @click="open(item.playlist || item.system_playlist)"
        :title="item.playlist?.title || item.system_playlist.title"
        class="bg-base-200 rounded-box outline flex flex-col gap-1 overflow-hidden hover:-translate-y-1 hover:opacity-70 hover:cursor-pointer transition-all">
        <div class="relative w-full bg-base-300">
          <img :src="getImageUrl(item).value" alt="cover" class="w-full h-full object-cover" />
          <!-- TODO: 加载中占位 -->
        </div>

        <div class="flex flex-col p-3">
          <div class="font-bold truncate text-base-content">
            {{ item.playlist?.title || item.system_playlist.title }}
          </div>
          <div class="text-sm truncate mt-1">
            {{
              item.playlist?.user?.username ||
              `为 ${item.system_playlist.made_for?.username} 创作` ||
              item.system_playlist.description
            }}
          </div>
          <!-- 分别是普通歌单、系统歌单和电台歌单的简介 -->
        </div>
      </div>
    </div>

    <div class="flex justify-center items-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { replaceImageUrl } from "../utils/utils"

const props = defineProps<{
  items: any[]
  cache: Record<number, any> // TODO: 性能优化
}>()

function open(item: any) {
  // TODO: 实现打开逻辑
  alert(`打开 ${item.playlist?.title || item.system_playlist.title}`)
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
