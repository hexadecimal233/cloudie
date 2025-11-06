<template>
  <div class="mb-2 flex items-center gap-2">
    <div class="flex-1"></div>
    <label class="label">{{ $t("cloudie.trackList.freeDL") }}</label>
    <input type="checkbox" class="checkbox" v-model="freeFilter" />
    <div class="join">
      <input type="text" :placeholder="$t('cloudie.trackList.search')" class="join-item input" :value="searchQuery"
        @input="e => searchQuery = (e.target as HTMLInputElement).value" />

      <!-- Tags Filter -->
      <div class="dropdown dropdown-end join-item">
        <div tabindex="0" role="button" class="btn join-item">
          <i-mdi-tag />
        </div>
        <div tabindex="0" class="dropdown-content bg-base-100 rounded-box z-1 w-80 p-4 border">
          <div class="form-control">
            <label class="label">
              <span class="label-text">TODO: Tags (space separated)</span>
            </label>
            <input type="text" placeholder="Enter tags..." class="input input-bordered" v-model="tagsInput" />
          </div>
        </div>
      </div>

      <!-- Genre Filter -->
      <div class="dropdown dropdown-end join-item">
        <div tabindex="0" role="button" class="btn join-item">
          <i-mdi-music-note />
        </div>
        <form tabindex="0"
          class="dropdown-content bg-base-100 rounded-box z-1 max-h-64 w-[calc(100vw/2)] space-y-2 space-x-2 overflow-y-auto border p-2"
          @change="handleGenreFilter">
          <input class="btn btn-primary" type="reset" value="×" @click="resetFilters" />
          <input class="btn max-w-32 truncate" type="checkbox" v-for="genre in allGenres" :key="genre ?? ''"
            :value="genre" name="genres" :aria-label="genre ?? $t('cloudie.trackList.noGenre')" />
        </form>
      </div>
    </div>

    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn">
        <i-mdi-ellipsis-horizontal />
      </div>
      <ul tabindex="-1" class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
        <li>
          <a @click="downloadSelected">
            {{ $t("cloudie.trackList.download") }}
          </a>
        </li>
        <li>
          <a @click="addToPlaylist">
            {{ $t("cloudie.trackList.addToPlaylist") }}
          </a>
        </li>
        <li>
          <a @click="listenSelected">
            {{ $t("cloudie.trackList.addToListening") }}
          </a>
        </li>
        <li>
          <a @click="deleteFromPlaylist">
            {{ $t("cloudie.trackList.deleteFromPlaylist") }}
          </a>
        </li>
      </ul>
    </div>
  </div>

  <!-- 加载状态 -->

  <div class="flex flex-col">
    <span v-if="searchQuery || genreFilters.length > 0 || tagsFilters.length > 0">
      {{
        $t("cloudie.trackList.searchResult", { count: table.getFilteredRowModel().rows.length })
      }}
    </span>
    <span v-else>
      {{ $t("cloudie.trackList.selected", { count: table.getFilteredSelectedRowModel().rows.length }) }}
    </span>

    <table class="table w-full table-fixed">
      <thead>
        <!-- TODO: STYLE -->
        <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <th v-for="header in headerGroup.headers" :key="header.id" :class="[
            'uppercase tracking-wider text-lg',
            header.column.getCanSort()
              ? 'cursor-pointer select-none hover:bg-gray-50'
              : '',
          ]" @click="header.column.getToggleSortingHandler()?.($event)">
            <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
              :props="header.getContext()" />
            <span v-if="header.column.getCanSort()" class="inline-block">
              <i-mdi-arrow-up v-if="header.column.getIsSorted() as string == 'asc'" class="h-[1em]" />
              <i-mdi-arrow-down v-if="header.column.getIsSorted() as string == 'desc'" class="h-[1em]" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.getRowModel().rows" :key="row.id">
          <td v-for="cell in row.getVisibleCells()" :key="cell.id">
            <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
          </td>
        </tr>
        <tr v-if="table.getRowModel().rows.length === 0">
          <td :colspan="table.getAllColumns().length" class="text-center py-8">
            <div class="mb-2 text-lg">
              {{ $t("cloudie.common.empty") }}
            </div>
            <div class="text-base-content/70 text-sm">
              {{ $t("cloudie.common.emptyDesc") }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex items-center justify-center pt-4">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { ref, computed, watch } from "vue"
import { formatMillis, getArtist, getCoverUrl } from "@/utils/utils"
import { addDownloadTask, downloadTasks } from "@/systems/download/download"
import { ExactPlaylist, Track } from "@/utils/types"
import { addMultipleToListeningList, addToListeningList } from "@/systems/player/listening-list"

import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  createColumnHelper,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  RowSelectionState,
} from "@tanstack/vue-table"
import { i18n } from "@/systems/i18n"
import { usePlayerStore } from "@/systems/stores/player"

const props = defineProps<{
  playlist: ExactPlaylist
}>()

// Custom filter function for tags
const tagsFilter: FilterFn<Track> = (row, columnId, filterValue) => {
  if (!filterValue || filterValue.length === 0) return true

  const trackTags = row.getValue(columnId) as string
  if (!trackTags) return false

  const trackTagsArray = trackTags
    .toLowerCase()
    .split(" ")
    .filter((tag) => tag.trim() !== "")

  // Check if all filter tags are included in track tags
  return filterValue.every((filterTag: string) =>
    trackTagsArray.some((trackTag) => trackTag.includes(filterTag.toLowerCase())),
  )
}

// FIXME: table size does not work
const columnHelper = createColumnHelper<Track>()
const columns = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      // select / deselect all
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        class="checkbox"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        class="checkbox"
      />
    ),
    size: 50,
  }),
  columnHelper.accessor((_row, i) => i, {
    id: "index",
    header: "#",
    cell: (info) => info.getValue() + 1,
    enableSorting: true,
    size: 50,
  }),
  columnHelper.accessor("title", {
    header: i18n.global.t("cloudie.trackList.song"),
    cell: (info) => (
      <div class="flex items-center gap-2">
        <img
          src={getCoverUrl(info.row.original)}
          alt="cover"
          class="size-16 rounded-md object-contain"
        />
        <div class="flex flex-col">
          <div class="truncate font-bold">{info.row.original.title}</div>
          <div class="truncate text-base-content/70">{getArtist(info.row.original)}</div>
        </div>
      </div>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor("genre", {
    header: i18n.global.t("cloudie.trackList.genre"),
    cell: (info) => info.getValue(),
    enableSorting: true,
    filterFn: "includesString",
    size: 100,
  }),
  columnHelper.accessor("tag_list", {
    header: i18n.global.t("cloudie.trackList.tags"),
    cell: (info) => info.getValue(),
    filterFn: tagsFilter,
    size: 100,
  }),
  columnHelper.accessor("full_duration", {
    header: i18n.global.t("cloudie.trackList.duration"),
    cell: (info) => formatMillis(info.getValue()),
    enableSorting: true,
    size: 50,
  }),
  columnHelper.display({
    id: "downloadability",
    header: i18n.global.t("cloudie.trackList.downloadability"),
    cell: (info) => {
      // TODO: warning styles & free download display
      if (info.row.original.downloadable) {
        return i18n.global.t("cloudie.trackList.direct")
      } else if (info.row.original.policy === "BLOCK") {
        return i18n.global.t("cloudie.trackList.geoRestrict")
      } else if (info.row.original.policy === "SNIP") {
        return i18n.global.t("cloudie.trackList.premium")
      } else {
        return i18n.global.t("cloudie.trackList.source", {
          count: info.row.original.media.transcodings.length,
        })
      }
    },
    size: 50,
  }),
  columnHelper.display({
    id: "operations",
    header: "-",
    cell: (info) => {
      const downloadButton = getDownloadTask(info.row.original).value?.downloadingState ? (
        <div class="loading loading-spinner loading-lg" />
      ) : (
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          onClick={() => download(info.row.original)}>
          <i-mdi-download />
        </button>
      )

      return (
        <div class="flex items-center gap-2">
          {downloadButton}
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => addToListeningList(info.row.original)}>
            <i-mdi-plus />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => usePlayerStore().playSong(info.row.original, props.playlist.tracks)}>
            <i-mdi-play />
          </button>
          <a class="btn btn-ghost btn-sm" href={info.row.original.permalink_url} target="_blank">
            <i-mdi-open-in-new />
          </a>
        </div>
      )
    },
    size: 100,
  }),
]

const sorting = ref<SortingState>([])
const searchQuery = ref("")
const rowSelection = ref<RowSelectionState>({})
const freeFilter = ref(false)
const genreFilters = ref<string[]>([])
const tagsInput = ref("")
const tagsFilters = computed(() => {
  return tagsInput.value
    .split(" ")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "")
})

const columnFilters = ref<ColumnFiltersState>([])

// Watch for changes in filters and update columnFilters
watch(
  [genreFilters, tagsFilters],
  () => {
    columnFilters.value = [
      {
        id: "tag_list",
        value: tagsFilters.value,
      },
      {
        id: "genre",
        value: genreFilters.value,
      },
    ].filter((f) => {
      return f.value && f.value.length > 0 // filter out empties
    })
  },
  { deep: true },
)

const table = useVueTable({
  get data() {
    let tracks = props.playlist.tracks

    // Apply free download filter if enabled
    if (freeFilter.value) {
      tracks = tracks.filter((track) => isPossibleFreeDownload(track))
    }

    return tracks
  },
  columns,
  state: {
    get sorting() {
      return sorting.value
    },
    get globalFilter() {
      return searchQuery.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value =
      typeof updaterOrValue === "function" ? updaterOrValue(sorting.value) : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value =
      typeof updaterOrValue === "function" ? updaterOrValue(rowSelection.value) : updaterOrValue
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value =
      typeof updaterOrValue === "function" ? updaterOrValue(columnFilters.value) : updaterOrValue
  },
  // 启用功能
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
})

// TODO: Implement useInfiniteScroll

function getDownloadTask(item: Track) {
  return computed(() => {
    return downloadTasks.value.find((t) => t.task.trackId === item.id)
  })
}

const allGenres = computed(() => {
  const tags = props.playlist.tracks.map((item) => item.genre).filter(Boolean)
  return [...new Set(tags)]
})

function handleGenreFilter(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.type === "checkbox" && target.name === "genres") {
    if (target.checked) {
      genreFilters.value.push(target.value)
    } else {
      genreFilters.value = genreFilters.value.filter((genre) => genre !== target.value)
    }
  }
}

function resetFilters() {
  genreFilters.value = []
  tagsInput.value = ""
  freeFilter.value = false
}

// 下载选中
async function downloadSelected() {
  for (const row of table.getFilteredSelectedRowModel().rows) {
    await download(row.original)
  }
}

async function listenSelected() {
  addMultipleToListeningList(table.getFilteredSelectedRowModel().rows.map((row) => row.original))
}

async function download(track: Track) {
  await addDownloadTask(track, props.playlist)
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