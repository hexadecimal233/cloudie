<template>
  <div>
    <!-- TODO: 更新删除UI，多选 -->
    <UTabs v-model="activeTab" :items="tabs" :content="false" class="w-full" />
    <UTable ref="table" :ui="{ base: 'table-fixed w-full' }" :columns="columns" :data="filteredItems" />
  </div>
</template>

<script setup lang="tsx" name="DownloadsView">
import { ref, computed, useTemplateRef } from "vue"
import { deleteTasks, downloadTasks, DownloadTask } from "@/systems/download/download"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { i18n } from "@/systems/i18n"
import { message } from "@tauri-apps/plugin-dialog"
import { TableColumn } from "@nuxt/ui"

const table = useTemplateRef("table")
const activeTab = ref<"all" | "downloading" | "completed" | "paused" | "failed">("all")

const tabs = computed(() => [
  { label: i18n.global.t("cloudie.downloads.allDownloads"), value: "all" },
  { label: i18n.global.t("cloudie.downloads.downloading"), value: "downloading" },
  { label: i18n.global.t("cloudie.downloads.completed"), value: "completed" },
  { label: i18n.global.t("cloudie.downloads.paused"), value: "paused" },
  { label: i18n.global.t("cloudie.downloads.failed"), value: "failed" },
])

const columns: TableColumn<DownloadTask>[] = [
  {
    accessorKey: "details.track",
    header: ({}) => i18n.global.t("cloudie.downloads.songInfo"),
    cell: (info: { row: { original: DownloadTask } }) => (
      <TrackTitle
        track={info.row.original.details.track}
        tracks={downloadTasks.value.map((item) => item.details.track)}
      />
    ),
  },
  {
    accessorKey: "details.playlistName",
    header: ({}) => i18n.global.t("cloudie.downloads.playlist"),
    cell: (info: { row: { original: DownloadTask } }) =>
      info.row.original.details.playlistName ?? "-",
    meta: {
      class: {
        th: "w-32 truncate",
        td: "w-32 truncate",
      },
    },
  },
  {
    accessorKey: "task.timestamp",
    header: ({}) => i18n.global.t("cloudie.downloads.addedTime"),
    cell: (info: { row: { original: DownloadTask } }) =>
      new Date(info.row.original.task.timestamp).toLocaleString(),
    meta: {
      class: {
        th: "w-32 truncate",
        td: "w-32 truncate",
      },
    },
  },
  {
    accessorKey: "task.origFileName",
    header: ({}) => i18n.global.t("cloudie.downloads.origName"),
    cell: (info: { row: { original: DownloadTask } }) => info.row.original.task.origFileName ?? "-",
    meta: {
      class: {
        th: "w-40 truncate",
        td: "w-40 truncate",
      },
    },
  },
  {
    accessorKey: "task.status",
    header: ({}) => i18n.global.t("cloudie.downloads.status"),
    cell: (info: { row: { original: DownloadTask } }) => (
      <div class="flex items-center gap-2">
        {info.row.original.downloadingState ? (
          <UProgress v-model={info.row.original.downloadingState.progress} />
        ) : null}
        {getStatusTranslation(info.row.original)}
        {info.row.original.task.status === "failed" ? (
          <UTooltip class="tooltip" text={info.row.original.failedReason}>
            <i-mingcute-information-line />
          </UTooltip>
        ) : null}
      </div>
    ),
    meta: {
      class: {
        th: "w-32 text-center",
        td: "w-32 text-center",
      },
    },
  },
  {
    id: "actions",
    header: ({}) => i18n.global.t("cloudie.downloads.actions"),
    cell: (info: { row: { original: DownloadTask } }) => (
      <div class="flex gap-1">
        {info.row.original.downloadingState && (
          <UButton
            icon="i-mingcute-pause-line"
            onClick={() => info.row.original.pause()}
            variant="ghost"
          />
        )}
        {(info.row.original.task.status === "paused" ||
          info.row.original.task.status === "failed") && (
          <UButton
            icon="i-mingcute-play-line"
            onClick={() => info.row.original.resume()}
            variant="ghost"
          />
        )}
        {info.row.original.task.status === "completed" && (
          <UButton
            icon="i-mingcute-folder-open-line"
            onClick={() => revealItemInDir(info.row.original.task.path ?? "")}
            variant="ghost"
          />
        )}
        <UButton
          icon="i-mingcute-close-line"
          onClick={() => promptDelete([info.row.original])}
          variant="ghost"
        />
      </div>
    ),
    meta: {
      class: {
        th: "w-32 text-center",
        td: "w-32 text-center",
      },
    },
  },
]

const filteredItems = computed(() => {
  const items = downloadTasks.value
  switch (activeTab.value) {
    case "all":
      return items
    case "downloading":
      return items.filter((item) => item.downloadingState)
    case "completed":
      return items.filter((item) => item.task.status === "completed")
    case "paused":
      return items.filter((item) => item.task.status === "paused")
    case "failed":
      return items.filter((item) => item.task.status === "failed")
  }
})

function getStatusTranslation(item: DownloadTask) {
  if (item.downloadingState) {
    return i18n.global.t(`cloudie.downloads.${item.downloadingState.name}`)
  }
  return i18n.global.t(`cloudie.downloads.${item.task.status}`)
}

async function promptDelete(tasks: DownloadTask[]) {
  const result = await message(i18n.global.t("cloudie.toasts.confirmDelete", { c: tasks.length }), {
    buttons: {
      yes: i18n.global.t("cloudie.toasts.deleteLocalFiles"),
      no: i18n.global.t("cloudie.toasts.keepLocalFiles"),
      cancel: i18n.global.t("cloudie.toasts.cancel"),
    },
  })
  if (result === i18n.global.t("cloudie.toasts.deleteLocalFiles")) {
    await deleteTasks(tasks, true)
  } else if (result === i18n.global.t("cloudie.toasts.keepLocalFiles")) {
    await deleteTasks(tasks, false)
  }
}
</script>
