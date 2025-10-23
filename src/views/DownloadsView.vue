<template>
  <!-- TODO: 更新删除UI -->
  <button @click="deleteAllTasks" class="btn btn-sm btn-error">
    {{ $t("cloudie.downloads.clearAll") }}
  </button>

  <div class="tabs tabs-border mb-6">
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      :aria-label="$t('cloudie.downloads.allDownloads')"
      @click="activeTab = 'all'"
      checked />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      :aria-label="$t('cloudie.downloads.downloading')"
      @click="activeTab = 'downloading'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      :aria-label="$t('cloudie.downloads.completed')"
      @click="activeTab = 'completed'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      :aria-label="$t('cloudie.downloads.paused')"
      @click="activeTab = 'paused'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      :aria-label="$t('cloudie.downloads.failed')"
      @click="activeTab = 'failed'" />
  </div>

  <table class="table w-full">
    <thead>
      <tr>
        <th>{{ $t("cloudie.downloads.songInfo") }}</th>
        <th>{{ $t("cloudie.downloads.artist") }}</th>
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
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="h-12 w-12 rounded">
                <img
                  v-if="item.details.coverUrl"
                  :src="item.details.coverUrl"
                  :alt="item.details.title" />
                <div v-else class="bg-base-300 flex h-full w-full items-center justify-center">
                  <i-mdi-music class="text-base-content opacity-50" />
                </div>
              </div>
            </div>
            <div class="flex flex-col">
              <div class="font-bold">{{ item.details.title }}</div>
              <div class="text-sm opacity-70">ID: {{ item.trackId }}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="text-sm">{{ item.details.artist }}</div>
        </td>
        <td>
          {{ item.details.playlistName ?? "-" }}
        </td>
        <td>
          {{ new Date(item.timestamp).toLocaleString() }}
        </td>
        <td>
          <div class="truncate font-mono" :title="item.origFileName ?? ''">
            {{ item.origFileName ?? "-" }}
          </div>
        </td>
        <td>
          <div class="flex items-center gap-2">
            <progress
              v-if="item.state"
              class="progress w-56"
              :value="item.state.progress"></progress>
            {{ getStatusTranslation(item) }}
          </div>
        </td>
        <td>
          <div class="flex gap-1">
            <button v-if="item.state" @click="pauseDownload(item)" class="btn btn-sm btn-ghost">
              <i-mdi-pause />
            </button>
            <button
              v-else-if="item.status === 'paused' || item.status === 'failed'"
              @click="resumeDownload(item)"
              class="btn btn-sm btn-ghost">
              <i-mdi-play />
            </button>
            <button
              v-if="item.status === 'completed'"
              class="btn btn-sm btn-ghost"
              @click="revealItemInDir(item.path ?? '')">
              <i-mdi-folder-open />
            </button>
            <button @click="deleteTask(item)" class="btn btn-sm btn-ghost">
              <i-mdi-close />
            </button>

            <!-- TODO: Play in cloudie & Duration display -->
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import {
  deleteAllTasks,
  deleteTask,
  downloadTasks,
  FrontendDownloadTask,
  pauseDownload,
  resumeDownload,
} from "@/systems/download/download"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { i18n } from "@/systems/i18n"

const activeTab = ref<"all" | "downloading" | "completed" | "paused" | "failed">("all")

const filteredItems = computed(() => {
  const items = downloadTasks.value
  switch (activeTab.value) {
    case "all":
      return items
    case "downloading":
      return items.filter((item) => item.state)
    case "completed":
      return items.filter((item) => item.status === "completed")
    case "paused":
      return items.filter((item) => item.status === "paused")
    case "failed":
      return items.filter((item) => item.status === "failed")
  }
})

function getStatusTranslation(item: FrontendDownloadTask) {
  if (item.state) {
    return i18n.global.t(`cloudie.downloads.${item.state.name}`)
  }
  return i18n.global.t(`cloudie.downloads.${item.status}`)
}
</script>
