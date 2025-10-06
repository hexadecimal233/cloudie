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
    <span>已选: {{ selectedIds.length }}</span>
  </div>

  <!-- 加载状态 -->

  <div class="flex flex-col">
    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="text-center py-8">
      <div class="text-lg mb-2">这里空空如也 (。・ω・。)</div>
      <div class="text-sm text-base-content/70">请尝试刷新或者调整搜索条件</div>
    </div>

    <span v-if="searchQuery">{{ filteredItems.length }} 个结果</span>

    <table class="table w-full table-fixed">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              class="checkbox"
              @change="selectAll"
              :checked="selectedIds.length === filteredItems.length && filteredItems.length > 0" />
          </th>
          <th>#</th>
          <th>标题</th>
          <th>风格</th>
          <th>时长</th>
          <th>可下载性</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in filteredItems"
          :key="item.track.id"
          class="hover:opacity-70 transition-opacity">
          <td>
            <input type="checkbox" class="checkbox" v-model="selectedIds" :value="item.track.id" />
          </td>

          <td>{{ index + 1 }}</td>

          <td>
            <div class="flex gap-2">
              <img
                :src="item.track.artwork_url || item.track.user?.avatar_url || ''"
                alt="cover"
                class="size-16 object-contain rounded-md" />

              <div class="flex w-full flex-col justify-center">
                <div class="font-bold truncate">
                  {{ item.track.title }}
                </div>

                <div class="text-sm truncate text-base-content/70">
                  {{ item.track.publisher_metadata?.artist || item.track.user?.username }}
                </div>
              </div>
            </div>
          </td>

          <td class="truncate text-base-content/70">{{ item.track.genre }}</td>

          <td class="text-base-content/70">
            {{ formatMillis(item.track.full_duration || item.track.duration) }}
          </td>

          <td>
            <div class="flex gap-2">
              <div v-if="item.track.downloadable" class="badge badge-success">直链</div>
              <div v-else-if="item.track.policy === 'BLOCK'" class="badge badge-warning">地区</div>
              <div v-else-if="item.track.policy === 'SNIP'" class="badge badge-warning">会员</div>
              <div v-else class="badge">{{ item.track.media.transcodings.length }} 轨</div>
              <!-- 未知：MONETIZE-->
            </div>
          </td>

          <td>
            <div class="flex">
              <button class="btn btn-ghost btn-sm" @click="download(item.track)">
                <Icon icon="mdi:download" height="auto" />
              </button>
              <button class="btn btn-ghost btn-sm" @click="openUrl(item.track.permalink_url)">
                <Icon icon="mdi:open-in-new" height="auto" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex justify-center items-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { formatMillis } from "../utils/utils"
import { downloadTrack } from "../utils/download"
import { invoke } from "@tauri-apps/api/core"
import { Icon } from "@iconify/vue"
import { openUrl } from "@tauri-apps/plugin-opener"

// 音乐显示

const selectedIds = ref<number[]>([])
const searchQuery = ref("")
const selectedGenres = ref<string[]>([]) // TODO: 获取tag_list

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

async function download(track: any) {
  try {
    const result = await downloadTrack(track, (info) => {
      return invoke("download_track", {
        finalUrl: info.finalUrl,
        downloadType: info.downloadType,
        preset: info.preset,
        title: track.title,
        playlist: props.playlistName || "",
      })
    })
    console.log("下载成功:", result)
  } catch (error) {
    console.error("下载失败:", error)
    // TODO: 处理下载失败的情况，例如显示错误提示
  }
}

// TODO: 检测可能的免费下载
function isPossibleFreeDownload(track: any): boolean {
  // 检测简介或者标题 是否包含 FREE DOWNLOAD
  let isFreeDownload = false
  if (track.description) {
    isFreeDownload =
      track.description.toLowerCase().includes("free download") ||
      track.description.toLowerCase().includes("free dl")
  }
  isFreeDownload =
    track.title.toLowerCase().includes("free download") ||
    track.title.toLowerCase().includes("free dl")

  // 检测购买链接
  if (track.purchase_url) {
    isFreeDownload =
      track.purchase_url.toLowerCase().includes("dropbox.com") ||
      track.purchase_url.toLowerCase().includes("drive.google.com") ||
      track.purchase_url.toLowerCase().includes("mega.nz")
  }
  if (track.purchase_title) {
    isFreeDownload =
      track.purchase_title.toLowerCase().includes("free download") ||
      track.purchase_title.toLowerCase().includes("free dl")
  }

  return isFreeDownload
}

const props = defineProps<{
  tracks: any[]
  playlistName?: string
}>()

defineEmits(["getPlaylist"])
</script>

<style scoped>
th:nth-child(1),
td:nth-child(1) {
  width: 4rem;
} /* 复选框列 */

th:nth-child(2),
td:nth-child(2) {
  width: 3rem;
} /* 序号列 */

th:nth-child(3),
td:nth-child(3) {
  width: 70%;
} /* 标题列  */

th:nth-child(4),
td:nth-child(4) {
  width: 30%;
} /* 风格列 */

th:nth-child(5),
td:nth-child(5) {
  width: 6rem;
} /* 时长列 */

th:nth-child(6),
td:nth-child(6) {
  width: 6rem;
} /* 可下载性列 */

th:nth-child(7),
td:nth-child(7) {
  width: 8rem;
} /* 操作列 */
</style>
