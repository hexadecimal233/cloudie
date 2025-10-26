<template>
  <div class="mb-2 flex items-center gap-2">
    <button class="btn btn-primary" @click="downloadSelected">
      {{ $t("cloudie.trackList.downloadSelected") }}
    </button>
    <div class="flex-1"></div>
    <label class="label">{{ $t("cloudie.trackList.freeDL") }}</label>
    <input type="checkbox" class="checkbox" v-model="freeFilter" />
    <div class="join">
      <input
        type="text"
        :placeholder="$t('cloudie.trackList.search')"
        class="join-item input"
        v-model="searchQuery" />

      <div class="btn join-item">
        <!-- TODO: TAG support -->
        <i-mdi-tag />
      </div>

      <div class="dropdown dropdown-end join-item">
        <div tabindex="0" role="button" class="btn join-item">
          <i-mdi-music-note />
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
            :key="genre ?? ''"
            :value="genre"
            name="genres"
            :aria-label="genre ?? $t('cloudie.trackList.noGenre')" />
        </form>
      </div>
    </div>

    <span>{{ $t("cloudie.trackList.selected", { count: selectedIds.length }) }}</span>
  </div>

  <!-- 加载状态 -->

  <div class="flex flex-col">
    <span v-if="searchQuery">
      {{ $t("cloudie.trackList.searchResult", { count: filteredItems.length }) }}
    </span>

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
          <th>{{ $t("cloudie.trackList.song") }}</th>
          <th>{{ $t("cloudie.trackList.genre") }}</th>
          <th>{{ $t("cloudie.trackList.duration") }}</th>
          <th>{{ $t("cloudie.trackList.downloadability") }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in filteredItems"
          :key="item.id"
          class="transition-opacity hover:opacity-70">
          <td>
            <input type="checkbox" class="checkbox" v-model="selectedIds" :value="item.id" />
          </td>

          <td>{{ index + 1 }}</td>

          <td>
            <div class="flex gap-2">
              <!-- TODO: add loading skeleton -->
              <img :src="getCoverUrl(item)" alt="cover" class="size-16 rounded-md object-contain" />

              <div class="flex w-full flex-col justify-center">
                <div class="truncate font-bold">
                  {{ item.title }}
                </div>

                <div class="text-base-content/70 truncate text-sm">
                  {{ getArtist(item) }}
                </div>
              </div>
            </div>
          </td>

          <td class="truncate">{{ item.genre }}</td>

          <td>
            {{ formatMillis(item.full_duration) }}
          </td>

          <td>
            <div class="flex gap-2">
              <div v-if="item.downloadable" class="badge badge-success">
                {{ $t("cloudie.trackList.direct") }}
              </div>
              <div v-else-if="item.policy === 'BLOCK'" class="badge badge-warning">
                {{ $t("cloudie.trackList.geoRestrict") }}
              </div>
              <div v-else-if="item.policy === 'SNIP'" class="badge badge-warning">
                {{ $t("cloudie.trackList.premium") }}
              </div>
              <div v-else class="badge">
                {{
                  $t("cloudie.trackList.source", {
                    count: item.media.transcodings.length,
                  })
                }}
              </div>
            </div>
          </td>

          <td>
            <div class="flex justify-center">
              <div
                v-if="getDownloadTask(item).value?.downloadingState"
                class="loading loading-spinner loading-lg"></div>
              <button v-else class="btn btn-ghost btn-sm" @click="download(item)">
                <i-mdi-download />
              </button>
              <button class="btn btn-ghost btn-sm" @click="addToPlaylist(item)">
                <i-mdi-plus />
              </button>
              <button class="btn btn-ghost btn-sm" @click="addAndPlay(item)">
                <i-mdi-play />
              </button>
              <a class="btn btn-ghost btn-sm" :href="item.permalink_url" target="_blank">
                <i-mdi-open-in-new />
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="py-8 text-center">
      <div class="mb-2 text-lg">
        {{ $t("cloudie.common.empty") }}
      </div>
      <div class="text-base-content/70 text-sm">
        {{ $t("cloudie.common.emptyDesc") }}
      </div>
    </div>

    <div class="flex items-center justify-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { formatMillis, getArtist, getCoverUrl } from "@/utils/utils"
import { addDownloadTask, downloadTasks } from "@/systems/download/download"
import { ExactPlaylist, Track } from "@/utils/types"
import { addAndPlay, addToPlaylist } from "@/systems/player/playlist"

// TODO: Implement useInfiniteScroll

const selectedIds = ref<number[]>([])
const freeFilter = ref(false)
const searchQuery = ref("")
const selectedGenres = ref<(string | null)[]>([]) // TODO: 获取tag_list

const props = defineProps<{
  playlist: ExactPlaylist
}>()

// TODO: enhance download task display
function getDownloadTask(item: Track) {
  return computed(() => {
    return downloadTasks.value.find((t) => t.task.trackId === item.id)
  })
}

const filteredItems = computed(() => {
  let items = props.playlist.tracks

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item: any) =>
        item.title.toLowerCase().includes(query) ||
        (item.publisher_metadata?.artist &&
          item.publisher_metadata.artist.toLowerCase().includes(query)) ||
        (item.user?.username && item.user.username.toLowerCase().includes(query)),
    )
  }

  // 类型过滤
  if (selectedGenres.value.length > 0) {
    items = items.filter((item) => selectedGenres.value.includes(item.genre ?? null))
  }

  if (freeFilter.value) {
    items = items.filter((item) => isPossibleFreeDownload(item))
  }

  return items
})

const allGenres = computed(() => {
  const tags = props.playlist.tracks.map((item) => item.genre).filter(Boolean)
  return [...new Set(tags)]
})

function selectAll() {
  const allFilteredIds = filteredItems.value.map((item) => item.id)

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
    const track = props.playlist.tracks.find((item) => item.id === id)
    if (track) {
      await download(track)
    }
  }
}

async function download(track: Track) {
  await addDownloadTask(
    track,
    props.playlist 
  )
}

function isPossibleFreeDownload(track: Track) {
  // 检测简介或者标题 是否包含 FREE DOWNLOAD
  let isFreeDownload = track.downloadable

  if (track.description) {
    isFreeDownload =
      isFreeDownload ||
      track.description.toLowerCase().includes("free download") ||
      track.description.toLowerCase().includes("free dl")
  }
  isFreeDownload =
    isFreeDownload ||
    track.title.toLowerCase().includes("free download") ||
    track.title.toLowerCase().includes("free dl")

  // 检测购买链接
  if (track.purchase_url) {
    isFreeDownload =
      isFreeDownload ||
      track.purchase_url.toLowerCase().includes("dropbox.com") ||
      track.purchase_url.toLowerCase().includes("drive.google.com") ||
      track.purchase_url.toLowerCase().includes("mega.nz")
  }
  if (track.purchase_title) {
    isFreeDownload =
      isFreeDownload ||
      track.purchase_title.toLowerCase().includes("free download") ||
      track.purchase_title.toLowerCase().includes("free dl")
  }

  return isFreeDownload
}
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
  width: 8rem;
} /* 可下载性列 */

th:nth-child(7),
td:nth-child(7) {
  width: 8rem;
} /* 操作列 */
</style>
