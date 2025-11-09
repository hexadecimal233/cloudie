<template>
  <div class="flex flex-col">
    <div class="mb-2 flex items-center gap-2">
      <div class="flex-1"></div>
      <div>
        <UInput :placeholder="$t('cloudie.trackList.search')" v-model="searchQuery" />
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
      <UTable :virtualize="{
        estimateSize: 96
      }" class="h-96" ref="table" :data="props.playlist.tracks" :columns="columns" v-model:global-filter="searchQuery"
        :loading="props.loading" @contextmenu="(_e, row) => items = getOperationItems(row.original)" />
    </UContextMenu>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref, useTemplateRef } from "vue"
import { formatMillis, isPossibleFreeDownload } from "@/utils/utils"
import { addDownloadTask } from "@/systems/download/download"
import { ExactPlaylist, Track } from "@/utils/types"
import { addMultipleToListeningList, addToListeningList } from "@/systems/player/listening-list"

import { Column } from "@tanstack/vue-table"
import { i18n } from "@/systems/i18n"
import { usePlayerStore } from "@/systems/stores/player"
import { open } from "@tauri-apps/plugin-shell"
import { ContextMenuItem, TableColumn } from "@nuxt/ui"

const props = defineProps<{
  playlist: ExactPlaylist
  loading?: boolean
}>()

const items = ref<ContextMenuItem[]>([])
const searchQuery = ref("")
const table = useTemplateRef("table")

function getOperationItems(track: Track) {
  return [
    [
      {
        label: i18n.global.t("cloudie.trackList.addToListening"),
        icon: "i-mdi-plus",
        onClick: () => addToListeningList(track),
      },
      {
        label: i18n.global.t("cloudie.trackList.listenSelected"),
        icon: "i-mdi-play",
        onClick: () => usePlayerStore().play(track, props.playlist.tracks),
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
        onClick: () => addToPlaylist(track),
      },
      {
        label: i18n.global.t("cloudie.trackList.deleteFromPlaylist"),
        icon: "i-mdi-delete",
        onClick: () => deleteFromPlaylist(track),
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
  Geo
}

// FIXME: table size does not work
const columns: TableColumn<Track>[] = [
  {
    id: "select1",
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
  },
  {
    accessorFn: (_, i) => i,
    id: "index",
    header: ({ column }) => getSortHeader(column, "#"),
    cell: (info) => (info.getValue() as number) + 1, // TODO: type casting
    enableSorting: true,
    meta: {
      class: {
        th: "min-w-16 max-w-16 text-center",
        td: "min-w-16 max-w-16 text-center",
      },
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => getSortHeader(column, i18n.global.t("cloudie.trackList.song")),
    cell: (info) => <TrackTitle track={info.row.original} tracks={props.playlist.tracks} />,
    enableSorting: true,
    meta: {
      class: {
        th: "min-w-0 max-w-full",
        td: "min-w-0 max-w-full",
      },
    },
  },
  {
    accessorKey: "genre",
    header: ({ column }) => getSortHeader(column, i18n.global.t("cloudie.trackList.genre")),
    cell: (info) => info.getValue(),
    filterFn: "includesString",
    meta: {
      class: {
        th: "min-w-16 max-w-16 ",
        td: "min-w-16 max-w-16 ",
      },
    },
    enableSorting: true,
  },
  {
    accessorKey: "tag_list",
    header: i18n.global.t("cloudie.trackList.tags"),
    cell: (info) => {
      return <div class="line-clamp-2"> <Tags tags={info.getValue() as string} /> </div>
    },
    filterFn: "includesString",
    meta: {
      class: {
        th: "min-w-32 max-w-32 ",
        td: "min-w-32 max-w-32 ",
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
        th: "min-w-24 max-w-24 ",
        td: "min-w-24 max-w-24 ",
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
        return <UBadge color="info">{i18n.global.t("cloudie.trackList.source", {
          count: info.row.original.media.transcodings.length,
        })}</UBadge>
      }
    },
    sortingFn: (a, b) => {
      const aDownloadability = getDownloadability(a.original)
      const bDownloadability = getDownloadability(b.original)
      return aDownloadability - bDownloadability
    },
    enableSorting: true,
    meta: {
      class: {
        th: "min-w-32 max-w-32 ",
        td: "min-w-32 max-w-32 ",
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
    <div class="contents flex items-center">
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

async function downloadSelected() {
  for (const row of table.value?.tableApi?.getFilteredSelectedRowModel().rows || []) {
    await download(row.original)
  }
}

async function listenSelected() {
  addMultipleToListeningList(
    table.value?.tableApi?.getFilteredSelectedRowModel().rows.map((row) => row.original) || [],
  )
}

async function download(track: Track) {
  await addDownloadTask(track, props.playlist)
}
</script>