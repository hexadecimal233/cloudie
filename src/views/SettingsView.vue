<template>
  <div class="flex flex-col">
    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">下载设置</legend>

      <label class="label">保存路径</label>
      <div class="join">
        <input
          type="text"
          class="input join-item"
          placeholder="保存路径"
          v-model="config.savePath" />
        <button class="btn join-item" @click="openSavePathDialog">
          <Icon icon="mdi:folder-open" height="auto" />
        </button>
      </div>

      <label class="label">并行下载数量</label>
      <input
        type="number"
        class="input"
        placeholder="并行下载数量"
        v-model="config.parallelDownloads" />

      <label class="label cursor-pointer">
        <span>将播单下载保存到单独目录</span>
        <input type="checkbox" class="toggle" v-model="config.playlistSeparateDir" />
      </label>

      <label class="label cursor-pointer">
        <span>优先直链下载</span>
        <input type="checkbox" class="toggle" v-model="config.preferDirectDownload" />
      </label>

      <label class="label">
        <span>非 MP3 文件是否转换为 MP3 或 FLAC</span>
        <input type="checkbox" class="toggle" v-model="config.nonMp3Convert" />
      </label>

      <label class="label cursor-pointer">文件命名方式</label>
      <select class="select" v-model="config.fileNaming">
        <option value="title">标题</option>
        <option value="artist-title">艺术家 - 标题</option>
        <option value="title-artist">标题 - 艺术家</option>
      </select>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">杂项设置</legend>

      <!-- TODO: 写入封面 -->

      <label class="label cursor-pointer">
        <span>将 BPM 和调性保存到本地</span>
        <input type="checkbox" class="toggle" v-model="config.analyzeBpmAndKey" />
      </label>

      <label class="label cursor-pointer">
        <span>VirtualDJ 助手</span>
        <input type="checkbox" class="toggle" v-model="config.virtualDjSupport" />
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">登录设置</legend>

      <label class="label">Soundcloud 客户端 ID</label>
      <div class="join">
        <input
          type="text"
          class="input join-item"
          placeholder="Soundcloud 客户端 ID"
          v-model="config.clientId" />
        <button class="btn join-item" @click="refreshClientId()">
          <!-- TODO: 可视化-->
          <Icon icon="mdi:refresh" height="auto" />
        </button>
      </div>

      <label class="label">Soundcloud OAuth 令牌</label>
      <input
        type="text"
        class="input"
        placeholder="Soundcloud OAuth 令牌"
        v-model="config.oauthToken" />
    </fieldset>
  </div>
</template>

<script setup lang="ts" name="SettingsView">
import { onUnmounted } from "vue"
import { Icon } from "@iconify/vue"
import { config, saveConfig } from "../utils/config"
import { open } from "@tauri-apps/plugin-dialog"
import { openUrl } from "@tauri-apps/plugin-opener"
import { refreshClientId } from "../utils/api"

async function openSavePathDialog() {
  const file = await open({
    multiple: false,
    directory: true,
  })

  if (file) {
    config.value.savePath = file
  }
}
</script>
