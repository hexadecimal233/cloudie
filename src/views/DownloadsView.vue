<template>
  <!-- 更新用户UX -->
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
    <!-- TODO: 打开目录/系统播放器 -->
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
      <tr v-for="item in filteredItems" :key="item.trackId">
        <td>
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="h-12 w-12 rounded">
                <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" />
                <div v-else class="bg-base-300 flex h-full w-full items-center justify-center">
                  <Icon icon="mdi:music" class="text-base-content opacity-50" />
                </div>
              </div>
            </div>
            <div class="flex flex-col">
              <div class="font-bold">{{ item.title }}</div>
              <div class="text-sm opacity-70">ID: {{ item.trackId }}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="text-sm">{{ item.artist }}</div>
        </td>
        <td>
          {{ item.playlistName ?? "-" }}
        </td>
        <td>
          {{ new Date(item.timestamp).toLocaleString() }}
        </td>
        <td>
          <div class="truncate font-mono" :title="item.origFileName">
            {{ item.origFileName ?? "-" }}
          </div>
        </td>
        <td>
          {{ $t(`cloudie.downloads.${item.status}`) }}
        </td>
        <td>
          <div class="flex gap-1">
            <button
              v-if="
                item.status === 'downloading' ||
                item.status === 'pending' ||
                item.status === 'getinfo'
              "
              @click="pauseDownload(item.trackId)"
              class="btn btn-sm btn-ghost">
              <Icon icon="mdi:pause" height="auto"></Icon>
            </button>
            <button
              v-if="item.status === 'paused' || item.status === 'failed'"
              @click="resumeDownload(item.trackId)"
              class="btn btn-sm btn-ghost">
              <Icon icon="mdi:play" height="auto"></Icon>
            </button>
            <button
              v-if="item.status === 'completed'"
              class="btn btn-sm btn-ghost"
              @click="revealItemInDir(item.path ?? '')">
              <Icon icon="mdi:folder-open" height="auto"></Icon>
            </button>
            <button @click="deleteTask(item.trackId)" class="btn btn-sm btn-ghost">
              <Icon icon="mdi:close" height="auto"></Icon>
            </button>

            <!-- TODO: Play in cloudie & Duration display -->
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { deleteAllTasks, deleteTask, downloadTasks, resumeDownload } from "../utils/download"
import { Icon } from "@iconify/vue"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { getDownloadDetail, DownloadDetail } from "../utils/database"

const activeTab = ref<"all" | "downloading" | "completed" | "paused" | "failed">("all")
const downloadDetails = ref<DownloadDetail[]>([])

// 获取下载详细信息
async function fetchDownloadDetails() {
  if (downloadTasks.value.length === 0) {
    downloadDetails.value = []
    return
  }

  const trackIds = downloadTasks.value.map((task) => task.trackId)
  downloadDetails.value = await getDownloadDetail(trackIds)
}

// TODO: 是否和download.ts中的监听重复
watch(downloadTasks, fetchDownloadDetails, { deep: true })

onMounted(() => {
  fetchDownloadDetails()
})

// 根据当前tab过滤项目
const filteredItems = computed(() => {
  const items = downloadDetails.value
  switch (activeTab.value) {
    case "all":
      return items
    case "downloading":
      return items.filter(
        (item) =>
          item.status === "downloading" || item.status === "pending" || item.status === "getinfo",
      )
    case "completed":
      return items.filter((item) => item.status === "completed")
    case "paused":
      return items.filter((item) => item.status === "paused")
    case "failed":
      return items.filter((item) => item.status === "failed")
  }
})

const pauseDownload = async (_trackId: number) => {
  try {
    throw new Error("unimplemented")
  } catch (error) {
    console.error("暂停下载失败:", error)
  }
}
</script>
