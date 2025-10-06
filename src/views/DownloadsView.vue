<template>
  <button @click="clearDownloadQueue" class="btn btn-sm btn-error">清空下载队列</button>

  <div class="tabs tabs-border mb-6">
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      aria-label="所有下载"
      @click="activeTab = 'all'"
      checked />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      aria-label="下载中"
      @click="activeTab = 'downloading'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      aria-label="已完成"
      @click="activeTab = 'completed'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      aria-label="已暂停"
      @click="activeTab = 'paused'" />
    <input
      type="radio"
      name="download_tabs"
      class="tab"
      aria-label="失败"
      @click="activeTab = 'failed'" />
  </div>

  <table class="table w-full">
    <!-- TODO: 打开目录/系统播放器 -->
    <thead>
      <tr>
        <th>歌曲信息</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in filteredItems" :key="item.trackId">
        <td>
          <div class="font-semibold">{{ item.title }}</div>
          <div class="text-sm text-gray-600">{{ item.artist }} - {{ item.playlistName }}</div>
        </td>
        <td>
          <div class="badge" :class="getStatusBadgeClass(item.status)">
            {{ getStatusText(item.status) }}
          </div>
        </td>
        <td>
          <div class="flex gap-1">
            <button
              v-if="item.status === 'downloading' || item.status === 'pending'"
              @click="pauseDownload(item.trackId)"
              class="btn btn-xs btn-warning">
              暂停
            </button>
            <button
              v-if="item.status === 'paused'"
              @click="resumeDownload(item.trackId)"
              class="btn btn-xs btn-success">
              继续
            </button>
            <button
              v-if="item.status === 'failed'"
              @click="retryDownload(item.trackId)"
              class="btn btn-xs btn-info">
              重试
            </button>
            <button @click="cancelDownload(item.trackId)" class="btn btn-xs btn-error">取消</button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { DownloadTask } from "../utils/download"

const activeTab = ref<"all" | "pending" | "downloading" | "completed" | "paused" | "failed">("all")

// 根据当前tab过滤项目
const filteredItems = computed(() => {
  switch (activeTab.value) {
    case "all":
      return downloadItems.value
    case "downloading":
    case "pending":
      return downloadItems.value.filter(
        (item) => item.status === "downloading" || item.status === "pending"
      )
    case "completed":
      return downloadItems.value.filter((item) => item.status === "completed")
    case "paused":
      return downloadItems.value.filter((item) => item.status === "paused")
    case "failed":
      return downloadItems.value.filter((item) => item.status === "failed")
  }
})

const downloadItems = ref<DownloadTask[]>([
  {
    trackId: 1,
    title: "测试音乐 - 夜空中最亮的星",
    artist: "逃跑计划",
    playlistName: "华语经典",
    timestamp: new Date().getTime(),
    path: "D:\\Downloads\\测试音乐 - 夜空中最亮的星.mp3",
    status: "downloading",
  },
  {
    trackId: 2,
    title: "测试音乐 - 演员",
    artist: "薛之谦",
    playlistName: "流行金曲",
    timestamp: new Date().getTime(),
    path: "D:\\Downloads\\测试音乐 - 演员.mp3",
    status: "failed",
  },
  {
    trackId: 3,
    title: "测试音乐 - 告白气球",
    artist: "周杰伦",
    playlistName: "华语流行",
    timestamp: new Date().getTime(),
    path: "D:\\Downloads\\测试音乐 - 告白气球.mp3",
    status: "completed",
  },
])

function getStatusText(status: string) {
  const statusMap = {
    downloading: "下载中",
    paused: "已暂停",
    completed: "已完成",
    failed: "下载失败",
  }
  return statusMap[status as keyof typeof statusMap]
}

function getStatusBadgeClass(status: string) {
  const classMap = {
    downloading: "badge-primary",
    paused: "badge-warning",
    completed: "badge-success",
    failed: "badge-error",
  }
  return classMap[status as keyof typeof classMap]
}

const pauseDownload = async (_trackId: number) => {
  try {
    // await downloadManager.pauseDownload(trackId)
  } catch (error) {
    console.error("暂停下载失败:", error)
  }
}

const resumeDownload = async (_trackId: number) => {
  try {
    // await downloadManager.resumeDownload(trackId)
  } catch (error) {
    console.error("继续下载失败:", error)
  }
}

const retryDownload = async (_trackId: number) => {
  try {
    // await downloadManager.retryDownload(trackId)
  } catch (error) {
    console.error("重试下载失败:", error)
  }
}

const cancelDownload = async (_trackId: number) => {
  try {
    // await downloadManager.cancelDownload(trackId)
  } catch (error) {
    console.error("取消下载失败:", error)
  }
}

const clearDownloadQueue = async () => {
  try {
    // await downloadManager.clearDownloadQueue()
  } catch (error) {
    console.error("清空下载队列失败:", error)
  }
}
</script>
