<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <template #header>
        <p class="text-lg font-semibold">{{ $t("cloudie.settings.sections.appearance") }}</p>
      </template>

      <div class="space-y-4">
        <UFormField :label="$t('cloudie.settings.config.language')">
          <USelect v-model="config.language" :items="LANGUAGE_OPTIONS.map((item) => ({
            value: item,
            label: $t('cloudie.langName', '', { locale: item })
          }))" class="w-full max-w-1/3" />
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.theme')">
          <USelect v-model="config.theme" :items="THEMES.map((item) => ({
            value: item,
            label: capitalizeFirstLetter(item)
          }))" class="w-full max-w-1/3" />
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.bg')">
          <UFieldGroup class="w-full">
          <UInput :disabled="isLocalBg" v-model="bg" :placeholder="$t('cloudie.settings.config.bg')"
            class="w-full max-w-1/3" variant="outline" />
            
          <UButton @click="changeBg" icon="i-mingcute-file-upload-line" variant="outline" />
          <UButton @click="bg = 'https://t.mwm.moe/moez'" icon="i-mdi-dice" variant="outline" />
          <UButton @click="bg = ''" icon="i-mingcute-close-line" variant="outline" />
          </UFieldGroup>
        </UFormField>

        <USwitch v-model="config.bgBlur" :label="$t('cloudie.settings.config.bgBlur')" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ $t("cloudie.settings.sections.player") }}</h3>
      </template>

      <div class="space-y-4">
        <USwitch v-model="config.noHistory" :label="$t('cloudie.settings.config.noHistory')" />

        <UButton @click="clearCache">{{ $t("cloudie.settings.etc.clearCache") }}</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ $t("cloudie.settings.sections.download") }}</h3>
      </template>

      <div class="space-y-4">
        <USwitch v-model="config.playlistSeparateDir" :label="$t('cloudie.settings.config.playlistSeparateDir')" />

        <USwitch v-model="config.preferDirectDownload" :label="$t('cloudie.settings.config.preferDirectDownload')" />

        <USwitch v-model="config.addCover" :label="$t('cloudie.settings.config.addCover')" />

        <UFormField :label="$t('cloudie.settings.config.savePath')" :error="!isPathValid ? $t('cloudie.settings.etc.invalidSavePath') : undefined">
          <UFieldGroup class="w-full">
            <UInput v-model="config.savePath" :placeholder="$t('cloudie.settings.config.savePath')"
              class="w-full max-w-1/3" variant="outline" />
            <UButton @click="openSavePathDialog" icon="i-mdi-folder-edit" variant="outline" />
            <UButton @click="openPath(config.savePath)" icon="i-mingcute-folder-open-line" variant="outline" />
          </UFieldGroup>
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.mp3ConvertExts')">
          <UInputMenu :placeholder="$t('cloudie.settings.config.mp3ConvertExts')" v-model="config.mp3ConvertExts" multiple :items="knownExts" class="w-full max-w-1/3" />
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.parallelDownloads')">
          <div class="flex items-center gap-4">
            <USlider v-model="config.parallelDownloads" :min="1" :max="6" class="w-full max-w-1/3" />
            <span class="text-sm font-medium w-8">{{ config.parallelDownloads }}</span>
          </div>
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.fileNaming')">
          <USelect v-model="config.fileNaming" :items="Object.values(FileNaming).map((item) => ({
            value: item,
            label: $t(`cloudie.settings.fileNamingTypes.${item}`)
          }))" class="w-full max-w-1/3" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ $t("cloudie.settings.sections.misc") }}</h3>
      </template>

      <div class="space-y-4">
        <USwitch v-model="config.virtualDjSupport" :label="$t('cloudie.settings.config.virtualDjSupport')" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ $t("cloudie.settings.sections.login") }}</h3>
      </template>

      <div class="space-y-4">
        <UFormField :label="$t('cloudie.settings.config.clientId')">
          <UFieldGroup class="w-full">
            <UInput v-model="config.clientId" :placeholder="$t('cloudie.settings.config.clientId')"
              class="w-full max-w-1/3" />
            <UButton @click="refreshClientId()" icon="i-mingcute-refresh-1-line" variant="outline" />
          </UFieldGroup>
        </UFormField>

        <UFormField :label="$t('cloudie.settings.config.oauthToken')">
          <UFieldGroup class="w-full">
            <UInput v-model="config.oauthToken" type="password" :placeholder="$t('cloudie.settings.config.oauthToken')"
              class="w-full max-w-1/3" />
            <UButton @click="loginSoundcloud()" variant="outline">{{ $t("cloudie.settings.etc.loginSoundcloud") }}
            </UButton>
          </UFieldGroup>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ $t("cloudie.settings.sections.about") }}</h3>
      </template>

      <div class="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="logo" class="h-[120px] w-fit" />

        <span class="text-xl font-bold">Cloudie</span>

        <span class="text-center">{{ $t("cloudie.settings.about.desc") }}</span>

        <div class="flex items-center gap-2">
          <span class="text-sm">
            {{
              $t("cloudie.settings.about.version", {
                version: versionInfo.version,
                latestVersion: versionInfo.latestVersion,
              })
            }}
          </span>
          <UButton size="sm" variant="outline" icon="i-mingcute-version-line"
            to="https://github.com/hexadecimal233/cloudie/releases" target="_blank">
            {{ $t("cloudie.settings.about.visitReleases") }}
          </UButton>
        </div>

        <div class="flex gap-2">
          <UButton icon="i-mingcute-github-line" to="https://github.com/hexadecimal233/cloudie" target="_blank" variant="outline">
            {{ $t("cloudie.settings.about.repo") }}
          </UButton>
          <UButton icon="i-mingcute-bug-line" to="https://github.com/hexadecimal233/cloudie/issues" target="_blank"
            variant="outline">
            {{ $t("cloudie.settings.about.issue") }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts" name="SettingsView">
import { config, THEMES } from "@/systems/config"
import { open } from "@tauri-apps/plugin-dialog"
import { refreshClientId } from "@/utils/api"
import { getVersion } from "@tauri-apps/api/app"
import { computed, onMounted, ref, watch } from "vue"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { openPath } from "@tauri-apps/plugin-opener"
import { i18n, LANGUAGE_OPTIONS } from "@/systems/i18n"
import * as fs from "@tauri-apps/plugin-fs"
import { FileNaming } from "@/systems/download/parser"
import { capitalizeFirstLetter } from "@/utils/utils"
import { M3U8_CACHE_MANAGER } from "@/systems/player/cache"

const isPathValid = ref(false)
const versionInfo = ref({
  version: "",
  latestVersion: "",
})

const isLocalBg = computed(() => {
  return config.value.bg.startsWith("http://asset.localhost")
})

const bg = computed({
  get: () => {
    if (isLocalBg.value) return decodeURIComponent(config.value.bg.slice("http://asset.localhost/".length))
    return config.value.bg
  },
  set: (val) => {
    config.value.bg = val
  },
})

async function changeBg() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Image",
        extensions: ["jpg", "jpeg", "png", "gif", "webp"],
      },
    ],
  })

  if (file) {
    bg.value = convertFileSrc(file)
  }
}

const knownExts = ref(["m4a", "aac", "flac", "wav", "ogg", "opus"])

watch(
  () => config.value.savePath,
  async (path) => {
    isPathValid.value = await fs.exists(path)
  },
)

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

async function clearCache() {
  try {
    await M3U8_CACHE_MANAGER.clearCache()
    useToast().add({
      color: "success",
      title: i18n.global.t("cloudie.toasts.clearCacheSuccess"),
    })
  } catch (error) {
    console.error("Failed to clear cache: ", error)
    useToast().add({
      color: "error",
      title: i18n.global.t("cloudie.toasts.clearCacheFailed"),
      description: error as string,
    })
  }
}

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
    useToast().add({
      color: "success",
      title: i18n.global.t("cloudie.toasts.loginSuccess"),
    })
  } catch (error) {
    console.error("Failed to login Soundcloud: ", error) // 打印错误信息
    useToast().add({
      color: "error",
      title: i18n.global.t("cloudie.toasts.loginFailed"),
      description: error as string,
    })
  }
}
</script>
