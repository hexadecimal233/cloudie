<template>
  <div class="flex flex-col h-full">
    <div class="mb-2 flex items-center gap-2">
      <div class="flex-1"></div>
      <div>
        <UInput :placeholder="$t('cloudie.trackList.search')" v-model="searchQuery" />
      </div>

      <div class="flex items-center gap-2">
        <UButton label="test" @click="player.play(props.playlist.tracks[0], props.playlist.tracks)">{{
          $t("cloudie.trackList.listenAll") }}</UButton>
        <UButton variant="subtle" @click="addMultipleToListeningList(props.playlist.tracks)">{{
          $t("cloudie.trackList.addAll") }}</UButton>

        <UButton @click="listenSelected">{{ $t("cloudie.trackList.listenSelected") }}</UButton>
        <UButton variant="subtle" @click="addToListening">{{ $t("cloudie.trackList.addToListening") }}</UButton>
        <UButton @click="downloadSelected">{{ $t("cloudie.trackList.download") }}</UButton>
        <UButton variant="subtle" @click="addToPlaylist">{{ $t("cloudie.trackList.addToPlaylist") }}</UButton>
      </div>
    </div>

    <span v-if="searchQuery">
      {{
        $t("cloudie.trackList.searchResult", { count: table?.tableApi?.getFilteredRowModel().rows.length || 0 })
      }}
    </span>
    <span v-else>
      {{ $t("cloudie.trackList.selected", {
        count: table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0
      }) }}
    </span>

    <UContextMenu :items="items">
      <UTable class="h-full" ref="table" :ui="{ base: 'table-fixed w-full' }" :data="props.playlist.tracks"
        :columns="columns" :global-filter="searchQuery || undefined" :loading="props.loading" :virtualize="{
          estimateSize: 80
        }" @contextmenu="(_e, row) => items = getOperationItems(row.original)">
      </UTable>
    </UContextMenu>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref, useTemplateRef } from "vue"
import { formatMillis, isPossibleFreeDownload, openModal } from "@/utils/utils"
import { addDownloadTask } from "@/systems/download/download"
import { ExactPlaylist, Track } from "@/utils/types"
import { addMultipleToListeningList } from "@/systems/player/listening-list"
import PlaylistSelectModal from "@/components/modals/PlaylistSelectModal.vue"

import { Column } from "@tanstack/vue-table"
import { i18n } from "@/systems/i18n"
import { usePlayerStore } from "@/systems/stores/player"
import { open } from "@tauri-apps/plugin-shell"
import { ContextMenuItem, TableColumn } from "@nuxt/ui"
import { useInfiniteScroll } from "@vueuse/core"

const props = defineProps<{
  playlist: ExactPlaylist
  loading?: boolean
  loadMore?: () => void
  hasMore?: boolean
}>()

const items = ref<ContextMenuItem[]>([])
const searchQuery = ref("")
const table = useTemplateRef("table")
const player = usePlayerStore()

onMounted(() => {
  useInfiniteScroll(
    table.value?.$el,
    () => {
      console.log("load more")
      props.loadMore?.()
    },
    {
      distance: 200,
      canLoadMore: () => {
        return !!props.loadMore && !props.loading && props.hasMore
      },
    },
  )
})

function getOperationItems(track: Track) {
  return [
    [
      {
        label: i18n.global.t("cloudie.trackList.addToListening"),
        icon: "i-mdi-plus",
        onClick: () => addMultipleToListeningList([track]),
      },
      {
        label: i18n.global.t("cloudie.trackList.listenSelected"),
        icon: "i-mdi-play",
        onClick: () => player.play(track, props.playlist.tracks),
      },
      {
        label: i18n.global.t("cloudie.trackList.openInNew"),
        icon: "i-mdi-open-in-new",
        onClick: () => open(track.permalink_url),
      },
    ],
    [
      {
        label: i18n.global.t("cloudie.trackList.addToPlaylist"),
        icon: "i-mdi-plus",
        onClick: () => addTracksToPlaylist([track]),
      },
    ],
  ]
}

function getDownloadability(track: Track) {
  if (isPossibleFreeDownload(track)) {
    return Downloadability.FreeDL
  } else if (track.downloadable) {
    return Downloadability.Direct
  } else if (track.policy === "SNIP") {
    return Downloadability.Premium
  } else if (track.policy === "BLOCK") {
    return Downloadability.Geo
  } else {
    return Downloadability.Normal
  }
}

enum Downloadability {
  FreeDL = 0,
  Direct,
  Normal,
  Premium,
  Geo,
}

const columns: TableColumn<Track>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <UCheckbox
        modelValue={
          table.getIsSomePageRowsSelected() ? "indeterminate" : table.getIsAllPageRowsSelected()
        }
        onUpdate:modelValue={(value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value)
        }
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <UCheckbox
        modelValue={row.getIsSelected()}
        onUpdate:modelValue={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
        aria-label="Select track"
      />
    ),
    meta: {
      class: {
        th: "w-8",
        td: "w-8",
      },
    },
  },
  {
    accessorFn: (_, i) => i,
    id: "index",
    header: ({ column }) => getSortHeader(column, "#"),
    cell: (info) => (info.getValue() as number) + 1, // TODO: type casting
    enableSorting: true,
    meta: {
      class: {
        th: "w-16",
        td: "w-16",
      },
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => getSortHeader(column, i18n.global.t("cloudie.trackList.song")),
    cell: (info) => <TrackTitle track={info.row.original} tracks={props.playlist.tracks} />,
    enableSorting: true,
  },
  {
    accessorKey: "genre",
    header: ({ column }) => getSortHeader(column, i18n.global.t("cloudie.trackList.genre")),
    cell: (info) => {
      return <UTooltip text={info.getValue() as string}>{info.getValue()}</UTooltip>
    },
    filterFn: "includesString",
    meta: {
      class: {
        th: "w-32 truncate",
        td: "w-32 truncate",
      },
    },
    enableSorting: true,
  },
  {
    // TODO: tag list tooltip
    accessorKey: "tag_list",
    header: i18n.global.t("cloudie.trackList.tags"),
    cell: (info) => {
      return <Tags class="overflow-x-scroll" tags={info.getValue() as string} />
    },
    filterFn: "includesString",
    meta: {
      class: {
        th: "w-32",
        td: "w-32",
      },
    },
  },
  {
    accessorKey: "full_duration",
    header: ({ column }) => getSortHeader(column, i18n.global.t("cloudie.trackList.duration")),
    cell: (info) => formatMillis(info.getValue() as number),
    enableSorting: true,
    meta: {
      class: {
        th: "w-20",
        td: "w-20",
      },
    },
  },
  {
    id: "downloadability",
    header: ({ column }) =>
      getSortHeader(column, i18n.global.t("cloudie.trackList.downloadability")),
    cell: (info) => {
      const downloadability = getDownloadability(info.row.original)
      if (downloadability === Downloadability.FreeDL) {
        return <UBadge color="success">{i18n.global.t("cloudie.trackList.freeDL")}</UBadge>
      } else if (downloadability === Downloadability.Direct) {
        return <UBadge color="info">{i18n.global.t("cloudie.trackList.direct")}</UBadge>
      } else if (downloadability === Downloadability.Geo) {
        return <UBadge color="error">{i18n.global.t("cloudie.trackList.geoRestrict")}</UBadge>
      } else if (downloadability === Downloadability.Premium) {
        return <UBadge color="warning">{i18n.global.t("cloudie.trackList.premium")}</UBadge>
      } else {
        return (
          <UBadge color="info">
            {i18n.global.t("cloudie.trackList.source", {
              count: info.row.original.media.transcodings.length,
            })}
          </UBadge>
        )
      }
    },
    // FIXME: sorting
    sortingFn: (a, b) => {
      const aDownloadability = getDownloadability(a.original)
      const bDownloadability = getDownloadability(b.original)
      return aDownloadability - bDownloadability
    },
    enableSorting: true,
    meta: {
      class: {
        th: "w-36 text-center",
        td: "w-36 text-center",
      },
    },
  },
]

function getSortHeader(column: Column<Track>, text: string) {
  const isSorted = column.getIsSorted()
  const sortIcon = isSorted
    ? isSorted === "asc"
      ? "i-lucide-arrow-up-narrow-wide"
      : "i-lucide-arrow-down-wide-narrow"
    : "i-lucide-arrow-down-up"

  return (
    <div class="flex items-center">
      {text}
      <UButton
        class="opacity-40"
        color="neutral"
        variant="ghost"
        icon={sortIcon}
        onClick={() => column.toggleSorting()}
      />
    </div>
  )
}

// TODO: Implement useInfiniteScroll
// We use search instead of genre filter
// const allGenres = computed(() => {
//   const tags = props.playlist.tracks.map((item) => item.genre).filter(Boolean)
//   return [...new Set(tags)]
// })

function selected() {
  return table.value?.tableApi?.getFilteredSelectedRowModel().rows || []
}

async function downloadSelected() {
  for (const row of selected()) {
    await download(row.original)
  }
}

function listenSelected() {
  const selectedRows = selected()
  if (!selectedRows.length) return

  player.play(
    selectedRows[0].original,
    selectedRows.map((row) => row.original),
  )
}

async function addToListening() {
  addMultipleToListeningList(
    selected().map((row) => row.original),
  )
}

async function addTracksToPlaylist(tracks: Track[]) {
  if (!tracks.length) return
  await openModal(
    PlaylistSelectModal,
    {
      tracks: tracks,
    },
  )
}

async function addToPlaylist() {
  const selectedRows = selected()
  if (!selectedRows.length) return
  await addTracksToPlaylist(selectedRows.map((row) => row.original))
}

async function download(track: Track) {
  await addDownloadTask(track, props.playlist)
}
</script>