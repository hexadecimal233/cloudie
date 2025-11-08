<template>
  <Toaster closeButton closeButtonPosition="top-right" expand rich-colors />
  <ModalsContainer />
  <div class="mx-auto flex h-screen flex-col">
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧 菜单栏 -->
      <div class="bg-base-200 w-72 flex-shrink-0">
        <ul class="menu menu-lg w-full gap-y-1">
          <img src="/logo.png" alt="cloudie" class="h-24 object-contain" />

          <div class="mx-4 flex items-center gap-2">
            <template v-if="!loading">
              <img :src="userInfo.avatar_url" alt="user" class="skeleton size-12 rounded-full object-contain ring" />
              <div class="text-lg font-bold">{{ userInfo.username }}</div>
            </template>

            <template v-else>
              <div class="skeleton size-12 rounded-full ring" />
              <div class="skeleton h-6 w-24"></div>
            </template>
          </div>

          <li>
            <router-link to="/feeds">
              <i-mdi-rss />
              {{ $t("cloudie.main.feeds") }}
            </router-link>
          </li>
          <li>
            <router-link to="/likes">
              <i-mdi-heart />
              {{ $t("cloudie.main.likes") }}
            </router-link>
          </li>
          <li>
            <router-link to="/playlists">
              <i-mdi-list-box />
              {{ $t("cloudie.main.playlists") }}
            </router-link>
          </li>
          <li>
            <router-link to="/radio">
              <i-mdi-radio-tower />
              {{ $t("cloudie.main.radio") }}
            </router-link>
          </li>
          <li>
            <router-link to="/history">
              <i-mdi-history />
              {{ $t("cloudie.main.history") }}
            </router-link>
          </li>
          <li>
            <router-link to="/following">
              <i-mdi-account-multiple />
              {{ $t("cloudie.main.following") }}
            </router-link>
          </li>

          <div class="divider"></div>
          <li>
            <router-link to="/downloads">
              <i-mdi-download />
              {{ $t("cloudie.main.downloads") }}
            </router-link>
          </li>
          <li>
            <router-link to="/settings">
              <i-mdi-cog />
              {{ $t("cloudie.main.settings") }}
            </router-link>
          </li>
        </ul>
      </div>

      <!-- 右侧 内容区域 -->
      <div class="bg-base-200 flex flex-1 p-4">
        <div class="bg-base-100 rounded-box flex flex-1 flex-col overflow-y-auto px-8 py-4">
          <div class="join w-full">
            <button class="btn join-item" @click="$router.back()">
              <i-mdi-chevron-left />
            </button>
            <input type="text" :placeholder="$t('cloudie.main.searchBar')"
              class="input input-bordered join-item w-1/4" v-model="searchQuery" @keyup.enter="handleSearch" />
          </div>
          <div class="flex flex-col py-8">
            <span class="mb-4 text-3xl font-bold">
              <template v-if="$route.path !== '/'">
                {{ getPageTitle() }}
              </template>
            </span>
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </div>
        </div>
      </div>
    </div>

    <!-- 播放器 UI -->
    <AudioPlayer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { BasicUserInfo, updateUserInfo, userInfo } from "@/utils/api"
import { Toaster } from "vue-sonner"
import { ModalsContainer } from "vue-final-modal"
import "vue-sonner/style.css"
import "vue-final-modal/style.css"
import AudioPlayer from "./components/AudioPlayer.vue"

const route = useRoute()
const router = useRouter()
const i18n = useI18n()
const user = ref<BasicUserInfo>()
const loading = ref(true)

onMounted(async () => {
  await updateUserInfo(true)
  user.value = userInfo.value
  loading.value = false
})

function getPageTitle() {
  const path = route.path
  const pathSegments = path.split("/").filter(Boolean)

  // Handle dynamic routes by using only the first segment (e.g., /playlist/:id)
  const firstSegment = pathSegments[0]
  return i18n.t(`cloudie.main.${firstSegment}`)
}

const searchQuery = ref("")

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push(`/search/${searchQuery.value}`)
  }
}
</script>
