<template>
  <div class="flex flex-col">
    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.appearance") }}</legend>

      <label class="label cursor-pointer">{{ $t("cloudie.settings.config.language") }}</label>
      <select class="select" v-model="config.language">
        <option value="zh-cn">简体中文</option>
        <option value="en">English</option>
      </select>

      <label class="label cursor-pointer">{{ $t("cloudie.settings.config.theme") }}</label>
      <select class="select" v-model="config.theme">
        <option value="light">{{ $t("cloudie.settings.themeTypes.light") }}</option>
        <option value="dark">{{ $t("cloudie.settings.themeTypes.dark") }}</option>
      </select>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.download") }}</legend>

      <!-- TODO: doesnt exit displayer -->
      <label class="label">{{ $t("cloudie.settings.config.savePath") }}</label>
      <div class="join">
        <input
          type="text"
          class="input join-item"
          :placeholder="$t('cloudie.settings.config.savePath')"
          v-model="config.savePath" />
        <button class="btn join-item" @click="openSavePathDialog">
          <Icon icon="mdi:folder-open" height="auto" />
        </button>
      </div>

      <label class="label">{{ $t("cloudie.settings.config.parallelDownloads") }}</label>
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

      <label class="label cursor-pointer">{{ $t("cloudie.settings.config.fileNaming") }}</label>
      <select class="select" v-model="config.fileNaming">
        <option value="title">{{ $t("cloudie.settings.fileNamingTypes.title") }}</option>
        <option value="artist-title">
          {{ $t("cloudie.settings.fileNamingTypes.artistTitle") }}
        </option>
        <option value="title-artist">
          {{ $t("cloudie.settings.fileNamingTypes.titleArtist") }}
        </option>
      </select>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.playlistSeparateDir" />
        <span>{{ $t("cloudie.settings.config.playlistSeparateDir") }}</span>
      </label>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.preferDirectDownload" />
        <span>{{ $t("cloudie.settings.config.preferDirectDownload") }}</span>
      </label>

      <label class="label">
        <input type="checkbox" class="toggle" v-model="config.nonMp3Convert" />
        <span>{{ $t("cloudie.settings.config.nonMp3Convert") }}</span>
      </label>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.addCover" />
        <span>{{ $t("cloudie.settings.config.addCover") }}</span>
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.misc") }}</legend>

      <!-- TODO: 写入封面 -->

      <label class="label cursor-pointer">
        <span>{{ $t("cloudie.settings.config.analyzeBpmAndKey") }}</span>
        <input type="checkbox" class="toggle" v-model="config.analyzeBpmAndKey" />
      </label>

      <label class="label cursor-pointer">
        <span>{{ $t("cloudie.settings.config.virtualDjSupport") }}</span>
        <input type="checkbox" class="toggle" v-model="config.virtualDjSupport" />
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.login") }}</legend>

      <label class="label">{{ $t("cloudie.settings.config.clientId") }}</label>
      <div class="join">
        <input
          type="text"
          class="input join-item"
          :placeholder="$t('cloudie.settings.config.clientId')"
          v-model="config.clientId" />
        <button class="btn join-item" @click="refreshClientId()">
          <!-- TODO: 可视化-->
          <Icon icon="mdi:refresh" height="auto" />
        </button>
      </div>

      <!-- TODO: add tutorial -->
      <input
        type="password"
        class="input"
        :placeholder="$t('cloudie.settings.config.oauthToken')"
        v-model="config.oauthToken" />
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.about") }}</legend>

      <div class="flex flex-col items-center gap-2">
        <img src="/logo.png" alt="logo" class="h-[120px] w-fit" />

        <span class="text-xl font-bold">Cloudie</span>

        <span>{{ $t("cloudie.settings.about.desc") }}</span>

        <div>
          <span class="mr-2">
            {{
              $t("cloudie.settings.about.version", {
                version: versionInfo.version,
                latestVersion: versionInfo.latestVersion,
              })
            }}
          </span>
          <button class="btn btn-sm ">
            <Icon icon="mdi:earth-arrow-up" height="auto"></Icon>
            {{ $t("cloudie.settings.about.visitReleases") }}
          </button>
        </div>

        <div class="flex gap-2">
          <a class="btn" href="https://github.com/hexadecimal233/cloudie" target="_blank">
            <Icon icon="mdi:github" height="auto"></Icon>
            {{ $t("cloudie.settings.about.repo") }}
          </a>
          <a class="btn" href="https://github.com/hexadecimal233/cloudie/issues" target="_blank">
            <Icon icon="mdi:bug" height="auto"></Icon>
            {{ $t("cloudie.settings.about.issue") }}
          </a>
        </div>
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
