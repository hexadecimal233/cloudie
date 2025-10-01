<template>
  <div class="mx-auto flex">
    <!-- 左侧 菜单栏 -->
    <div class="w-72 bg-base-200 flex-shrink-0">
      <ul class="menu menu-lg gap-y-2 w-full">
        <img src="/logo.png" alt="cloudie" class="h-24 object-contain" />

        <div class="mx-4 flex items-center gap-2">
          <template v-if="!loading">
            <img
              :src="user?.avatar_url"
              alt="user"
              class="size-12 ring-2 object-contain rounded-full skeleton" />
            <div class="text-lg font-bold">{{ user?.username }}</div>
          </template>

          <template v-else>
            <div class="size-12 ring-2 rounded-full skeleton" />
            <div class="skeleton w-24 h-6"></div>
          </template>
        </div>

        <li>
          <router-link to="/likes" id="like">
            <Icon icon="mdi:heart" height="auto" />
            喜欢的音乐
          </router-link>
        </li>
        <li>
          <router-link to="/playlists" id="playlist">
            <Icon icon="mdi:list-box" height="auto" />
            歌单与专辑
          </router-link>
        </li>
        <li>
          <router-link to="/radio" id="radio">
            <Icon icon="mdi:radio-tower" height="auto" />
            电台
          </router-link>
        </li>
        <li>
          <router-link to="/history" id="history">
            <Icon icon="mdi:history" height="auto" />
            播放历史
          </router-link>
        </li>

        <div class="divider"></div>

        <li>
          <router-link to="/playlist-play" id="playlist-play">
            <Icon icon="mdi:playlist-play" height="auto" />
            播放列表 (敬请期待)
          </router-link>
        </li>
        <li>
          <router-link to="/download" id="download">
            <Icon icon="mdi:download" height="auto" />
            下载管理
          </router-link>
        </li>
        <li>
          <router-link to="/settings" id="setting">
            <Icon icon="mdi:cog" height="auto" />
            设置
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 右侧 内容区域 -->
    <div class="flex-1 overflow-hidden bg-base-200 flex h-screen">
      <div class="m-4 bg-base-100 rounded-box overflow-y-auto flex-1">
        <div class="px-8 py-12 flex flex-col">
          <span class="text-3xl font-bold mb-4">{{ $route.name }}</span>
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { onMounted, ref } from "vue"
import { BasicUserInfo, getUserInfo } from "./utils/api"

const user = ref<BasicUserInfo>()
const loading = ref(true)


onMounted(async () => {
  const userInfo = await getUserInfo()
  if (userInfo) {
    user.value = userInfo
    loading.value = false
  }
})
</script>

<style scoped></style>
