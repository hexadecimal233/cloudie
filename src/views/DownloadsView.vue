<template>
  <!-- FIXME: 有时不更新？？？-->
  <!-- 更新用户UX -->
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
        <th>歌单</th>
        <th>时间</th>
        <th>元文件名</th>
        <th>状态</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in filteredItems" :key="item.trackId">
        <td>
          {{ item.title }}
        </td>
        <td>
          {{ item.playlistName }}
        </td>
        <td>
          {{ new Date(item.timestamp).toLocaleString() }}
        </td>
        <td>
          {{ item.origFileName }}
        </td>
        <td>
          {{ getStatusText(item.status) }}
        </td>
        <td>
          <div class="flex">
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
              @click="tryOpenItem(item)">
              <Icon icon="mdi:folder-open" height="auto"></Icon>
            </button>
            <button @click="cancelDownload(item.trackId)" class="btn btn-sm btn-ghost">
              <Icon icon="mdi:close" height="auto"></Icon>
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { DownloadTask, downloadTasks } from "../utils/download"
import { Icon } from "@iconify/vue"
import { revealItemInDir } from "@tauri-apps/plugin-opener"

const activeTab = ref<"all" | "downloading" | "completed" | "paused" | "failed">("all")

// 根据当前tab过滤项目
const filteredItems = computed(() => {
  switch (activeTab.value) {
    case "all":
      return downloadTasks.value
    case "downloading":
      return downloadTasks.value.filter(
        (item) =>
          item.status === "downloading" || item.status === "pending" || item.status === "getinfo",
      )
    case "completed":
      return downloadTasks.value.filter((item) => item.status === "completed")
    case "paused":
      return downloadTasks.value.filter((item) => item.status === "paused")
    case "failed":
      return downloadTasks.value.filter((item) => item.status === "failed")
  }
})

function tryOpenItem(item: DownloadTask) {
  try {
    console.log("尝试打开文件:", item.path)
    revealItemInDir(item.path)
  } catch (error) {
    // TODO: 显示文件已删除
    console.error("打开目录失败:", error)
  }
}

function getStatusText(status: string) {
  const statusMap = {
    downloading: "下载中",
    getinfo: "获取信息中",
    paused: "已暂停",
    completed: "已完成",
    failed: "下载失败",
    pending: "排队中",
  }
  return statusMap[status as keyof typeof statusMap]
}

const pauseDownload = async (_trackId: number) => {
  try {
    throw new Error("unimplemented")
  } catch (error) {
    console.error("暂停下载失败:", error)
  }
}

const resumeDownload = async (_trackId: number) => {
  try {
    throw new Error("unimplemented")
  } catch (error) {
    console.error("继续下载失败:", error)
  }
}

const cancelDownload = async (_trackId: number) => {
  try {
    throw new Error("unimplemented")
  } catch (error) {
    console.error("取消下载失败:", error)
  }
}

const clearDownloadQueue = async () => {
  try {
    throw new Error("unimplemented")
  } catch (error) {
    console.error("清空下载队列失败:", error)
  }
}
</script>
