<template>
  <div class="mx-auto flex h-screen flex-col">
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Side: Navigation Menu -->
      <div class="bg-muted w-full max-w-64 flex-shrink-0 flex flex-col gap-y-1 px-4">
        <img src="/logo.png" alt="cloudie" class="h-20 object-contain" />

        <div class="flex items-center gap-2">
          <template v-if="!loading">
            <UAvatar :src="userInfo.avatar_url" size="lg" />
            <div class="font-bold">{{ userInfo.username }}</div>
          </template>

          <template v-else>
            <USkeleton class="size-8 rounded-full ring" />
            <USkeleton class="h-6 w-24" />
          </template>
        </div>

        <UNavigationMenu :items="items" orientation="vertical" />
      </div>

      <!-- Right Side: Content Browser -->
      <div class="bg-muted flex flex-1 p-4">
        <OverlayScrollbarsComponent class="bg-default rounded-md flex flex-1 flex-col px-8 py-4" defer
          :options="{ scrollbars: { theme: scrollbarTheme } }">
          <!-- Search Bar -->
          <UFieldGroup class="w-full">
            <UButton color="neutral" icon="i-lucide-chevron-left" variant="subtle" @click="$router.back()" />
            <UInputMenu :items="searchSuggestions" v-model:search-term="searchTerm"
              :placeholder="$t('cloudie.main.search')" @keydown.enter.prevent="handleSearch"
              @update:model-value="handleSuggestion" class="w-64" />
            <UButton color="neutral" icon="i-lucide-search" variant="subtle" @click="handleSearch" />
          </UFieldGroup>


          <UContainer class="py-8">
            <div class="mb-4 text-2xl font-bold">
              {{ getPageTitle() }}
            </div>

            <router-view v-slot="{ Component }">
              <Transition name="blur" mode="out-in">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </Transition>
            </router-view>
          </UContainer>
        </OverlayScrollbarsComponent>
      </div>
    </div>

    <!-- Player Controller -->
    <AudioPlayer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { BasicUserInfo, getSearchSuggestions, updateUserInfo, userInfo } from "@/utils/api"
import AudioPlayer from "./components/AudioPlayer.vue"
import { NavigationMenuItem } from "@nuxt/ui/runtime/components/NavigationMenu.vue.js"
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue"
import { useColorMode, useDebounceFn, useThrottleFn } from "@vueuse/core"

const route = useRoute()
const router = useRouter()
const i18n = useI18n()
const user = ref<BasicUserInfo>()
const loading = ref(true)
const colorMode = useColorMode()

// 计算滚动条主题
const scrollbarTheme = computed(() => {
  return "os-theme-" + (colorMode.value === "dark" ? "light" : "dark")
})


onMounted(async () => {
  await updateUserInfo(true)
  user.value = userInfo.value
  loading.value = false
})

function getPageTitle() {
  const path = route.path
  const pathSegments = path.split("/").filter(Boolean)
  if (pathSegments.length === 0) return ""

  // Handle dynamic routes by using only the first segment (e.g., /playlist/:id)
  const firstSegment = pathSegments[0]
  return i18n.t(`cloudie.main.${firstSegment}`)
}

const searchTerm = ref("")
const searchSuggestions = ref<string[]>([])

// Create the debounced function outside of the watch callback
const debounceGetSuggestions = useDebounceFn(async (term: string) => {
  console.log('getSearchSuggestions', term)
  searchSuggestions.value = (await getSearchSuggestions(term)).map((item) => item.output)
}, 500)

watch(searchTerm, (term) => {
  if (!term.trim()) {
    searchSuggestions.value = []
    return
  }

  debounceGetSuggestions(term)
})

// 当用户选择建议项时触发
function handleSuggestion(value: string) {
  searchTerm.value = value
}

// 当用户点击搜索按钮或按下自定义快捷键时触发
function handleSearch() {
  if (searchTerm.value.trim()) {
    router.push(`/search/${searchTerm.value}`)
  }
}

const items = ref<NavigationMenuItem[][]>([
  [
    { label: i18n.t("cloudie.main.feeds"), to: "/feeds", icon: "i-lucide-rss" },
    { label: i18n.t("cloudie.main.likes"), to: "/likes", icon: "i-lucide-heart" },
    { label: i18n.t("cloudie.main.playlists"), to: "/playlists", icon: "i-lucide-list" },
    { label: i18n.t("cloudie.main.radio"), to: "/radio", icon: "i-lucide-radio-tower" },
    { label: i18n.t("cloudie.main.history"), to: "/history", icon: "i-lucide-history" },
    { label: i18n.t("cloudie.main.following"), to: "/following", icon: "i-lucide-users" },
  ],
  [
    { label: i18n.t("cloudie.main.downloads"), to: "/downloads", icon: "i-lucide-download" },
    { label: i18n.t("cloudie.main.settings"), to: "/settings", icon: "i-lucide-cog" },
  ],
])
</script>
