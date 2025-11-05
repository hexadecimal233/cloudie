<template>
  <div class="flex flex-col">
    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.appearance") }}</legend>

      <label class="label cursor-pointer">{{ $t("cloudie.settings.config.language") }}</label>
      <select class="select" v-model="config.language">
        <option v-for="lang in LANGUAGE_OPTIONS" :key="lang" :value="lang">
          {{ $t("cloudie.langName", "", { locale: lang }) }}
        </option>
      </select>

      <label class="label cursor-pointer">{{ $t("cloudie.settings.config.theme") }}</label>
      <select class="select" v-model="config.theme">
        <option v-for="theme in THEMES" :key="theme" :value="theme">
          {{ capitalizeFirstLetter(theme) }}
        </option>
      </select>
    </fieldset>
    
    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.player") }}</legend>

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.noHistory" />
        <span>{{ $t("cloudie.settings.config.noHistory") }}</span>
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.download") }}</legend>

      <!-- TODO: doesnt exist indicator -->
      <label class="label">{{ $t("cloudie.settings.config.savePath") }}</label>

      <div class="join w-full">
        <label class="input join-item">
          <i-mdi-alert v-if="!isPathValid" />
          <input
            type="text"
            class="grow"
            :placeholder="$t('cloudie.settings.config.savePath')"
            v-model="config.savePath" />
        </label>
        <button class="btn join-item" @click="openSavePathDialog">
          <i-mdi-folder-edit />
        </button>
        <button class="btn join-item" @click="openPath(config.savePath)">
          <i-mdi-folder-open />
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
        <option v-for="naming in FileNaming" :key="naming" :value="naming">
          {{ $t(`cloudie.settings.fileNamingTypes.${naming}`) }}
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

      <label class="label">{{ $t("cloudie.settings.config.mp3ConvertExts") }}</label>
      <!-- TODO: Update UX -->
      <input type="text" class="input" v-model="currentMp3" />

      <label class="label cursor-pointer">
        <input type="checkbox" class="toggle" v-model="config.addCover" />
        <span>{{ $t("cloudie.settings.config.addCover") }}</span>
      </label>
    </fieldset>

    <fieldset class="fieldset border-base-300 rounded-box border p-4 text-lg">
      <legend class="fieldset-legend">{{ $t("cloudie.settings.sections.misc") }}</legend>

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
          <!-- TODO: 可视化 刷新 -->
          <i-mdi-refresh />
        </button>
      </div>

      <input
        type="password"
        class="input"
        :placeholder="$t('cloudie.settings.config.oauthToken')"
        v-model="config.oauthToken" />

      <button class="btn" @click="loginSoundcloud()">
        {{ $t("cloudie.settings.etc.loginSoundcloud") }}
      </button>
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
          <a
            class="btn btn-sm"
            href="https://github.com/hexadecimal233/cloudie/releases"
            target="_blank">
            <i-mdi-earth-arrow-up />
            {{ $t("cloudie.settings.about.visitReleases") }}
          </a>
        </div>

        <div class="flex gap-2">
          <a class="btn" href="https://github.com/hexadecimal233/cloudie" target="_blank">
            <i-mdi-github />
            {{ $t("cloudie.settings.about.repo") }}
          </a>
          <a class="btn" href="https://github.com/hexadecimal233/cloudie/issues" target="_blank">
            <i-mdi-bug />
            {{ $t("cloudie.settings.about.issue") }}
          </a>
        </div>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts" name="SettingsView">
import { config, THEMES } from "@/systems/config"
import { open } from "@tauri-apps/plugin-dialog"
import { refreshClientId } from "@/utils/api"
import { getVersion } from "@tauri-apps/api/app"
import { computed, onMounted, ref } from "vue"
import { invoke } from "@tauri-apps/api/core"
import { openPath } from "@tauri-apps/plugin-opener"
import { toast } from "vue-sonner"
import { i18n, LANGUAGE_OPTIONS } from "@/systems/i18n"
import * as fs from "@tauri-apps/plugin-fs"
import { FileNaming } from "@/systems/download/parser"
import { capitalizeFirstLetter } from "@/utils/utils"

const isPathValid = ref(false)
const versionInfo = ref({
  version: "",
  latestVersion: "",
})

const currentMp3 = computed({
  get() {
    return config.value.mp3ConvertExts.join(",")
  },
  set(v) {
    config.value.mp3ConvertExts = v.split(",")
  },
})

onMounted(async () => {
  isPathValid.value = await fs.exists(config.value.savePath)
  versionInfo.value.version = await getVersion()
  try {
    versionInfo.value.latestVersion = "xxxx"
    // TODO: 从github获取最新版本
  } catch (error) {
    versionInfo.value.latestVersion = i18n.global.t("cloudie.settings.about.versionFailure")
    console.error("Failed to get latest version: ", error)
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

async function loginSoundcloud() {
  try {
    const token = await invoke<string>("login_soundcloud")
    config.value.oauthToken = token
    toast.success(i18n.global.t("cloudie.toasts.loginSuccess"))
  } catch (error) {
    console.error("Failed to login Soundcloud: ", error) // 打印错误信息
    toast.error(i18n.global.t("cloudie.toasts.loginFailed"), {
      description: error as string,
    })
  }
}
</script>
