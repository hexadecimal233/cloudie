<template>
  <Toaster closeButton closeButtonPosition="top-right" expand rich-colors />
  <div class="mx-auto flex h-screen flex-col">
    <div class="flex flex-1 overflow-hidden">
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
            <router-link to="/feeds">
              <Icon icon="mdi:rss" height="auto" />
              {{ $t("cloudie.main.feeds") }}
            </router-link>
          </li>
          <li>
            <router-link to="/likes">
              <Icon icon="mdi:heart" height="auto" />
              {{ $t("cloudie.main.likes") }}
            </router-link>
          </li>
          <li>
            <router-link to="/playlists">
              <Icon icon="mdi:list-box" height="auto" />
              {{ $t("cloudie.main.playlists") }}
            </router-link>
          </li>
          <li>
            <router-link to="/radio">
              <Icon icon="mdi:radio-tower" height="auto" />
              {{ $t("cloudie.main.radio") }}
            </router-link>
          </li>
          <li>
            <router-link to="/history">
              <Icon icon="mdi:history" height="auto" />
              {{ $t("cloudie.main.history") }}
            </router-link>
          </li>

          <div class="divider"></div>

          <li>
            <router-link to="/listening">
              <Icon icon="mdi:playlist-play" height="auto" />
              {{ $t("cloudie.main.listening") }}
            </router-link>
          </li>
          <li>
            <router-link to="/downloads">
              <Icon icon="mdi:download" height="auto" />
              {{ $t("cloudie.main.downloads") }}
            </router-link>
          </li>
          <li>
            <router-link to="/settings">
              <Icon icon="mdi:cog" height="auto" />
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
              <Icon icon="mdi:chevron-left" height="auto" />
            </button>
            <input
              type="text"
              :placeholder="$t('cloudie.main.searchBar')"
              class="input input-bordered join-item w-1/4" />
          </div>
          <div class="flex flex-col py-8">
            <span class="mb-4 text-3xl font-bold">
              <template v-if="$route.path !== '/'">
                {{ $t(`cloudie.main.${$route.path.slice(1)}`) }}
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
    <div class="bg-base-200 border-base-300/70 flex h-20 border-t-2">
      <img src="" alt="cover" class="object-cover" />
      <div class="flex flex-col">
        <p>示例标题</p>
        <p>示例艺术家</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { onMounted, ref } from "vue"
import { BasicUserInfo, getUserInfo } from "@/utils/api"
import { Toaster } from "vue-sonner"
import "vue-sonner/style.css"

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
