<template>
  <div class="flex flex-col">
    <div class="flex justify-center">
      <div class="flex flex-col justify-center items-center p-8 bg-base-300 rounded-box">
        <img src="/logo.png" alt="logo" class="h-[150px]" />

        <span class="text-xl">一个 Soundcloud 可视化下载工具</span>
      </div>
    </div>

    <div class="divider"></div>

    <fieldset class="fieldset text-lg border-base-300 rounded-box border p-4">
      <legend class="fieldset-legend">基本设置</legend>

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

      <label class="label cursor-pointer">
        <span>将 BPM 和调性保存到本地</span>
        <input type="checkbox" class="toggle" v-model="config.analyzeBpmAndKey" />
      </label>

      <label class="label cursor-pointer">
        <span>VirtualDJ 助手</span>
        <input type="checkbox" class="toggle" v-model="config.virtualDjSupport" />
      </label>
    </fieldset>

    <fieldset class="fieldset text-lg border-base-300 rounded-box border p-4">
      <legend class="fieldset-legend">登录设置</legend>

      <label class="label">Soundcloud 客户端 ID</label>
      <input
        type="text"
        class="input"
        placeholder="Soundcloud 客户端 ID"
        v-model="config.clientId" />

      <label class="label">Soundcloud OAuth 令牌</label>
      <input
        type="text"
        class="input"
        placeholder="Soundcloud OAuth 令牌"
        v-model="config.oauthToken" />

      <button class="btn w-max">刷新登录</button>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from "vue"
import { Icon } from "@iconify/vue"
import { config, saveConfig } from "../utils/config"
import { open } from "@tauri-apps/plugin-dialog"

onUnmounted(saveConfig) // FIXME: 配置在输入后保存

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
