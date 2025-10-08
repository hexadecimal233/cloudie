<template>
  <div class="mb-2 flex justify-end gap-2">
    <button class="btn btn-primary" @click="downloadSelected">下载选中</button>
    <div class="join">
      <input type="text" placeholder="搜索" class="join-item input" v-model="searchQuery" />

      <div class="btn join-item">
        <Icon icon="mdi:tag" height="auto"></Icon>
      </div>

      <div class="dropdown dropdown-end join-item">
        <div tabindex="0" role="button" class="btn join-item">
          <Icon icon="mdi:music-note" height="auto"></Icon>
        </div>
        <form
          tabindex="0"
          class="dropdown-content bg-base-100 rounded-box z-1 max-h-64 w-[calc(100vw/2)] space-y-2 space-x-2 overflow-y-auto border p-2"
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
    </div>

    <span>已选: {{ selectedIds.length }}</span>
  </div>

  <!-- 加载状态 -->

  <div class="flex flex-col">
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
          :key="getTrack(item).id"
          class="transition-opacity hover:opacity-70">
          <td>
            <input
              type="checkbox"
              class="checkbox"
              v-model="selectedIds"
              :value="getTrack(item).id" />
          </td>

          <td>{{ index + 1 }}</td>

          <td>
            <div class="flex gap-2">
              <img
                :src="getTrack(item).artwork_url || getTrack(item).user?.avatar_url || ''"
                alt="cover"
                class="size-16 rounded-md object-contain" />

              <div class="flex w-full flex-col justify-center">
                <div class="truncate font-bold">
                  {{ getTrack(item).title }}
                </div>

                <div class="text-base-content/70 truncate text-sm">
                  {{ getArtist(getTrack(item)) }}
                </div>
              </div>
            </div>
          </td>

          <td class="truncate">{{ getTrack(item).genre }}</td>

          <td>
            {{ formatMillis(getTrack(item).full_duration || getTrack(item).duration) }}
          </td>

          <td>
            <div class="flex gap-2">
              <div v-if="getTrack(item).downloadable" class="badge badge-success">直链</div>
              <div v-else-if="getTrack(item).policy === 'BLOCK'" class="badge badge-warning">
                地区
              </div>
              <div v-else-if="getTrack(item).policy === 'SNIP'" class="badge badge-warning">
                会员
              </div>
              <div v-else class="badge">{{ getTrack(item).media.transcodings.length }} 轨</div>
              <!-- 未知：MONETIZE-->
            </div>
          </td>

          <td>
            <div class="flex">
              <button class="btn btn-ghost btn-sm" @click="download(getTrack(item))">
                <Icon icon="mdi:download" height="auto" />
              </button>
              <a class="btn btn-ghost btn-sm" :href="getTrack(item).permalink_url" target="_blank">
                <Icon icon="mdi:open-in-new" height="auto" />
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="py-8 text-center">
      <div class="mb-2 text-lg">这里空空如也 (。・ω・。)</div>
      <div class="text-base-content/70 text-sm">请尝试刷新或者调整搜索条件</div>
    </div>

    <div class="flex items-center justify-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { formatMillis, getArtist } from "../utils/utils"
import { addDownloadTask } from "../utils/download"
import { Icon } from "@iconify/vue"

// 音乐显示

const selectedIds = ref<number[]>([])
const searchQuery = ref("")
const selectedGenres = ref<string[]>([]) // TODO: 获取tag_list

function getTrack(item: any) {
  if (props.playlistName === undefined) {
    return item.track
  } else {
    return item
  }
}

const filteredItems = computed(() => {
  let items = props.tracks

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item: any) =>
        getTrack(item).title.toLowerCase().includes(query) ||
        (getTrack(item).publisher_metadata?.artist &&
          getTrack(item).publisher_metadata.artist.toLowerCase().includes(query)) ||
        (getTrack(item).user?.username &&
          getTrack(item).user.username.toLowerCase().includes(query)),
    )
  }

  // 类型过滤
  if (selectedGenres.value.length > 0) {
    items = items.filter((item) => selectedGenres.value.includes(getTrack(item).genre))
  }

  return items
})

const allGenres = computed(() => {
  const tags = props.tracks.map((item) => getTrack(item).genre).filter(Boolean)
  return [...new Set(tags)]
})

function selectAll() {
  const allFilteredIds = filteredItems.value.map((item) => getTrack(item).id)

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

// 下载选中
async function downloadSelected() {
  for (const id of selectedIds.value) {
    const track = props.tracks.find((item) => getTrack(item).id === id)
    if (track) {
      download(getTrack(track))
    }
  }
}

function download(track: any) {
  addDownloadTask(track, props.playlistName || "")
}

// TODO: 检测可能的免费下载
/*

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
*/

const props = defineProps<{
  tracks: any[]
  playlistName?: string // 播单的话就返回的不是collection了
}>()
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
