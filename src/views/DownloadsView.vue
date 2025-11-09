<template>
  <div>
    <!-- TODO: 更新删除UI，多选 -->
    <button class="btn btn-sm btn-error">
      {{ $t("cloudie.downloads.deleteSelected") }}
    </button>

    <div class="tabs tabs-border mb-6">
      <input type="radio" name="download_tabs" class="tab" :aria-label="$t('cloudie.downloads.allDownloads')"
        @click="activeTab = 'all'" checked />
      <input type="radio" name="download_tabs" class="tab" :aria-label="$t('cloudie.downloads.downloading')"
        @click="activeTab = 'downloading'" />
      <input type="radio" name="download_tabs" class="tab" :aria-label="$t('cloudie.downloads.completed')"
        @click="activeTab = 'completed'" />
      <input type="radio" name="download_tabs" class="tab" :aria-label="$t('cloudie.downloads.paused')"
        @click="activeTab = 'paused'" />
      <input type="radio" name="download_tabs" class="tab" :aria-label="$t('cloudie.downloads.failed')"
        @click="activeTab = 'failed'" />
    </div>

    <table class="table w-full">
      <thead>
        <tr>
          <th>{{ $t("cloudie.downloads.songInfo") }}</th>
          <th>{{ $t("cloudie.downloads.playlist") }}</th>
          <th>{{ $t("cloudie.downloads.addedTime") }}</th>
          <th>{{ $t("cloudie.downloads.origFileName") }}</th>
          <th>{{ $t("cloudie.downloads.status") }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredItems">
          <!-- TODO: add a download id as a key -->
          <td>
            <TrackTitle :track="item.details.track" :tracks="downloadTasks.map((item)=>item.details.track)" />
          </td>
          <td>
            {{ item.details.playlistName ?? "-" }}
          </td>
          <td>
            {{ new Date(item.task.timestamp).toLocaleString() }}
          </td>
          <td>
            <div class="truncate font-mono" :title="item.task.origFileName ?? ''">
              {{ item.task.origFileName ?? "-" }}
            </div>
          </td>
          <td>
            <div class="flex items-center gap-2">
              <progress v-if="item.downloadingState" class="progress w-56"
                :value="item.downloadingState.progress"></progress>
              {{ getStatusTranslation(item) }}
              <div v-if="item.task.status === 'failed'" class="tooltip" :data-tip="item.failedReason">
                <i-mdi-information class="text-base-content/70"></i-mdi-information>
              </div>
            </div>
          </td>
          <td>
            <div class="flex gap-1">
              <button v-if="item.downloadingState" @click="item.pause()" class="btn btn-sm btn-ghost">
                <i-mdi-pause />
              </button>
              <button v-else-if="item.task.status === 'paused' || item.task.status === 'failed'" @click="item.resume()"
                class="btn btn-sm btn-ghost">
                <i-mdi-play />
              </button>
              <button v-if="item.task.status === 'completed'" class="btn btn-sm btn-ghost"
                @click="revealItemInDir(item.task.path ?? '')">
                <i-mdi-folder-open />
              </button>
              <button @click="promptDelete([item])" class="btn btn-sm btn-ghost">
                <i-mdi-close />
              </button>

              <!-- TODO: Play in cloudie & Duration display -->
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts" name="DownloadsView">
import { ref, computed } from "vue"
import { deleteTasks, downloadTasks, DownloadTask } from "@/systems/download/download"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { i18n } from "@/systems/i18n"
import { message } from "@tauri-apps/plugin-dialog"

const activeTab = ref<"all" | "downloading" | "completed" | "paused" | "failed">("all")

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
