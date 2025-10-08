<template>
  <div class="mx-auto flex">
    <!-- 左侧 菜单栏 -->
    <div class="bg-base-200 w-72 flex-shrink-0">
      <ul class="menu menu-lg w-full gap-y-2">
        <img src="/logo.png" alt="cloudie" class="h-24 object-contain" />

        <div class="mx-4 flex items-center gap-2">
          <template v-if="!loading">
            <img
              :src="user?.avatar_url"
              alt="user"
              class="skeleton size-12 rounded-full object-contain ring-2" />
            <div class="text-lg font-bold">{{ user?.username }}</div>
          </template>

          <template v-else>
            <div class="skeleton size-12 rounded-full ring-2" />
            <div class="skeleton h-6 w-24"></div>
          </template>
        </div>

        <li>
          <router-link to="/likes" >
            <Icon icon="mdi:heart" height="auto" />
            喜欢的音乐
          </router-link>
        </li>
        <li>
          <router-link to="/playlists">
            <Icon icon="mdi:list-box" height="auto" />
            歌单与专辑
          </router-link>
        </li>
        <li>
          <router-link to="/radio">
            <Icon icon="mdi:radio-tower" height="auto" />
            电台
          </router-link>
        </li>
        <li>
          <router-link to="/history">
            <Icon icon="mdi:history" height="auto" />
            播放历史
          </router-link>
        </li>

        <div class="divider"></div>

        <li>
          <router-link to="/listening">
            <Icon icon="mdi:playlist-play" height="auto" />
            试听列表
          </router-link>
        </li>
        <li>
          <router-link to="/downloads">
            <Icon icon="mdi:download" height="auto" />
            下载管理
          </router-link>
        </li>
        <li>
          <router-link to="/settings">
            <Icon icon="mdi:cog" height="auto" />
            设置
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 右侧 内容区域 -->
    <div class="bg-base-200 flex h-screen flex-1 p-4">
      <div class="bg-base-100 rounded-box flex flex-1 flex-col overflow-y-auto px-8 py-4">
          <div class="join w-full">
            <button class="btn join-item" @click="$router.back()">
              <Icon icon="mdi:chevron-left" height="auto" />
            </button>
            <input type="text" placeholder="搜索 (暂未实现)" class="input input-bordered join-item w-1/4"></input>
          </div>
        <div class="flex flex-col py-8">
          <span class="mb-4 text-3xl font-bold">{{ $route.name }}</span>
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
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
