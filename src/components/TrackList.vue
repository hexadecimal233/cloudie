<template>
  <div class="flex justify-end mb-2 gap-2">
    <input type="text" placeholder="搜索" class="input" v-model="searchQuery" />

    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn">标签筛选</div>
      <form
        tabindex="0"
        class="dropdown-content max-h-64 space-x-2 space-y-2 w-[calc(100vw/2)] overflow-y-auto bg-base-100 border rounded-box z-1 p-2"
        @change="handleGenreFilter">
        <input class="btn btn-primary" type="reset" value="×" @click="resetFilters" />
        <input
          class="btn max-w-32 truncate"
          type="checkbox"
          v-for="genre in allGenres"
          :key="genre"
          :value="genre"
          name="genres"
          :aria-label="genre" />
      </form>
    </div>
    <button class="btn btn-primary" @click="selectAll" :disabled="filteredItems.length === 0">
      {{
        selectedIds.length === filteredItems.length && filteredItems.length > 0
          ? "取消全选"
          : "全选"
      }}
    </button>
    <div class="btn btn-ghost btn-sm">已选: {{ selectedIds.length }}</div>
  </div>

  <!-- 加载状态 -->

  <div class="flex flex-col">
    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="text-center py-8">
      <div class="text-lg mb-2">这里空空如也 (。・ω・。)</div>
      <div class="text-sm text-base-content/70">请尝试刷新或者调整搜索条件</div>
    </div>

    <span v-if="searchQuery">{{ filteredItems.length }} 个结果</span>
    
    <!-- 歌曲 -->
    <div
      v-for="item in filteredItems"
      :key="item.track.id"
      class="h-20 bg-base-200 w-full p-2 flex gap-2 items-center even:bg-base-100 hover:opacity-70 transition-opacity">
      <input type="checkbox" class="checkbox" v-model="selectedIds" :value="item.track.id" />
      <img
        :src="item.track.artwork_url || item.track.user?.avatar_url || ''"
        alt="cover"
        class="size-16 object-contain rounded-md flex-none" />

      <div class="flex-1 flex gap-2 items-center overflow-hidden">
        <div class="flex w-full flex-col text-md min-w-0">
          <div class="flex items-center gap-2">
            <div class="font-bold truncate">{{ item.track.title }}</div>

            <div class="flex-1"></div>

            <span class="text-base-content/70">{{ formatMillis(item.track.duration) }}</span>
            <div v-if="item.track.genre" class="badge badge-primary truncate flex-none">
              # {{ item.track.genre }}
            </div>
          </div>

          <div class="text-sm truncate text-base-content/70">
            {{ item.track.publisher_metadata?.artist || item.track.user?.username }}
          </div>
        </div>
      </div>

      <button class="btn btn-primary flex-none" @click="download(item.track)">下载</button>
    </div>

    <div class="flex justify-center items-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { formatMillis } from "../utils/utils"

// 音乐显示

const selectedIds = ref<number[]>([])
const searchQuery = ref("")
const selectedGenres = ref<string[]>([])

const filteredItems = computed(() => {
  let items = props.tracks

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item: any) =>
        item.track.title.toLowerCase().includes(query) ||
        (item.track.publisher_metadata?.artist &&
          item.track.publisher_metadata.artist.toLowerCase().includes(query)) ||
        (item.track.user?.username && item.track.user.username.toLowerCase().includes(query))
    )
  }

  // 类型过滤
  if (selectedGenres.value.length > 0) {
    items = items.filter((item) => selectedGenres.value.includes(item.track.genre))
  }

  return items
})

const allGenres = computed(() => {
  const tags = props.tracks.map((item) => item.track.genre).filter(Boolean)
  return [...new Set(tags)]
})

function selectAll() {
  const allFilteredIds = filteredItems.value.map((item) => item.track.id)

  if (selectedIds.value.length === allFilteredIds.length && allFilteredIds.length > 0) {
    selectedIds.value = []
  } else {
    selectedIds.value = allFilteredIds
  }
}

function handleGenreFilter(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.type === "checkbox" && target.name === "genres") {
    if (target.checked) {
      selectedGenres.value.push(target.value)
    } else {
      selectedGenres.value = selectedGenres.value.filter((genre) => genre !== target.value)
    }
  }
}

function resetFilters() {
  selectedGenres.value = []
}

function download(song: any) {
  // TODO: 实现下载逻辑
  alert(`下载 ${song.title}`)
}

const props = defineProps<{
  tracks: any[]
}>()
</script>
