<template>
  <div class="flex flex-col">
    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">下载</legend>

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
      <div>
        <input
          type="range"
          min="1"
          max="6"
          value="3"
          class="range"
          v-model="config.parallelDownloads" />
        {{ config.parallelDownloads }}
      </div>

      <label class="label cursor-pointer">文件命名方式</label>
      <select class="select" v-model="config.fileNaming">
        <option value="title">标题</option>
        <option value="artist-title">艺术家 - 标题</option>
        <option value="title-artist">标题 - 艺术家</option>
      </select>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.playlistSeparateDir" />
        <span>将播单下载保存到单独目录</span>
      </label>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.preferDirectDownload" />
        <span>优先直链下载</span>
      </label>

      <label class="label">
        <input type="checkbox" class="toggle" v-model="config.nonMp3Convert" />
        <span>非 MP3 文件是否转换为 MP3 或 FLAC</span>
      </label>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.addCover" />
        <span>添加封面</span>
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">杂项</legend>

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
      <legend class="fieldset-legend">登录</legend>

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

      <label class="label">
        Soundcloud OAuth 令牌
        <div
          class="tooltip"
          data-tip="OAuth 令牌能通过在 Soundcloud 打开开发者工具 > Cookies > oauth_token 查看">
          <Icon icon="mdi:help-circle" />
        </div>
      </label>
      <input
        type="text"
        class="input"
        placeholder="Soundcloud OAuth 令牌"
        v-model="config.oauthToken" />
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">关于</legend>

      <div class="flex flex-col items-center gap-2">
        <img src="/logo.png" alt="logo" class="h-[120px] w-fit" />

        <span class="text-xl font-bold">Cloudie</span>

        <span>一个可爱的 Soundcloud 客户端</span>

        <span>版本: {{ versionInfo.version }}</span>
        <span>最新: {{ versionInfo.latestVersion }}</span>

        <div class="flex gap-2">
          <a class="btn" href="https://github.com/hexadecimal233/cloudie" target="_blank">
            <Icon icon="mdi:github" height="auto"></Icon>
            项目地址
          </a>
          <a class="btn" href="https://github.com/hexadecimal233/cloudie/issues" target="_blank">
            <Icon icon="mdi:bug" height="auto"></Icon>
            反馈问题
          </a>
        </div>

        <div></div>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts" name="SettingsView">
import { Icon } from "@iconify/vue"
import { config } from "../utils/config"
import { open } from "@tauri-apps/plugin-dialog"
import { refreshClientId } from "../utils/api"
import { getVersion } from "@tauri-apps/api/app"
import { onMounted, ref } from "vue"

const versionInfo = ref({
  version: "",
  latestVersion: "",
})

onMounted(async () => {
  versionInfo.value.version = await getVersion()
  try {
    versionInfo.value.latestVersion = "xxxx"
    // TODO: 从github获取最新版本
  } catch (error) {
    versionInfo.value.latestVersion = "获取失败"
    console.error("获取最新版本失败: ", error)
  }
})

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
