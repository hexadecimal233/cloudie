<template>
  <div class="mx-auto flex h-screen flex-col bg-muted relative overflow-hidden">
    <!-- Background -->
    <div v-show="config.bg" class="absolute inset-0 bg-cover bg-fixed bg-center opacity-15 dark:opacity-10 background transition-all duration-700 ease-in-out z-[9999] pointer-events-none"
      :style="{ backgroundImage: `url(${config.bg})` }"
      :class="{'blur-sm scale-105': config.bgBlur}"></div>

    <TitleBar />

    <!-- Main Area -->
    <div class="flex flex-1 overflow-hidden my-2">
      <!-- Left Side: Navigation Menu -->
      <div class="w-full max-w-48 flex-shrink-0 flex flex-col px-4 bg-default rounded-r-lg">
        <!-- Matches the right section text to make the spacing consistent -->
        <div class="flex items-center gap-2 mt-4 mb-8">
          <template v-if="!loading && userInfo.isLoggedIn">
            <UAvatar :src="userInfo.avatar_url" size="lg" />
            <div class="font-bold">{{ userInfo.username }}</div>
          </template>

          <template v-else>
            <USkeleton class="size-8 ring" />
            <USkeleton class="h-6 w-24" />
          </template>
        </div>

        <UNavigationMenu :items="items" orientation="vertical" />
      </div>

      <!-- Right Side: Content Browser -->
      <div class="flex flex-col flex-1">
        <div class="bg-default rounded-lg flex flex-1 flex-col gap-4 px-6 py-4 overflow-y-hidden mx-2">
          <!-- Search Bar -->
          <div class="w-full flex items-center gap-2">
            <UButton color="neutral" icon="i-mingcute-left-line" variant="subtle" @click="$router.back()" />
            <UFieldGroup >
              <UInputMenu leading-icon="i-mingcute-search-line" :items="searchSuggestions" v-model:search-term="searchTerm"
                :placeholder="$t('cloudie.main.search')" @keydown.enter.prevent="handleSearch"
                @update:model-value="(value) => searchTerm = value" class="w-64" />
              <UButton color="neutral" icon="i-mingcute-close-line" variant="outline" @click="searchTerm = ''" />
            </UFieldGroup>
          </div>


          <!-- Page -->
          <router-view v-slot="{ Component }">
            <OverlayScrollbarsComponent defer ref="scrollbarRef" :options="{ scrollbars: { theme: scrollbarTheme } }">
              <!-- Set H-full for VirtualList to work properly -->
              <UContainer class="flex-col flex h-full sm:px-0.5 lg:px-0.5 px-0.5">
                <div class="my-2 text-2xl font-bold">
                  {{ getPageTitle() }}
                </div>

                <div class="flex-1 h-full">
                  <Transition name="blur" mode="out-in">
                    <keep-alive include="DownloadsView,FeedsView,FollowingView,HistoryView,LibraryView,LikesView,RadioView,SettingsView">
                      <component :is="Component" />
                    </keep-alive>
                  </Transition>
                </div>
              </UContainer>
            </OverlayScrollbarsComponent>
          </router-view>
        </div>
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
import { useUserStore } from "@/systems/stores/user"
import { getSearchSuggestions } from "@/utils/api"
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue"
import { useColorMode, useDebounceFn } from "@vueuse/core"
import { config } from "./systems/config"

const route = useRoute()
const router = useRouter()
const i18n = useI18n()
const loading = ref(true)
const colorMode = useColorMode()
const userInfo = useUserStore()

// 计算滚动条主题
const scrollbarTheme = computed(() => {
  return "os-theme-" + (colorMode.value === "dark" ? "light" : "dark")
})

onMounted(async () => {
  await userInfo.initializeUserState()
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

const debounceGetSuggestions = useDebounceFn(async (term: string) => {
  const newSuggestions = (await getSearchSuggestions(term)).map((item) => item.output)
  searchSuggestions.value = newSuggestions
}, 250)

watch(searchTerm, (term) => {
  if (!term.trim()) {
    searchSuggestions.value = []
    return
  }

  debounceGetSuggestions(term)
})

function handleSearch() {
  if (searchTerm.value.trim()) {
    router.push(`/search/${searchTerm.value}`)
  }
}

const items = computed(() => [
  [
    { label: i18n.t("cloudie.main.feeds"), to: "/feeds", icon: "i-mingcute-rss-line" },
    { label: i18n.t("cloudie.main.likes"), to: "/likes", icon: "i-mingcute-heart-line" },
    { label: i18n.t("cloudie.main.library"), to: "/library", icon: "i-mingcute-playlist-line" },
    { label: i18n.t("cloudie.main.radio"), to: "/radio", icon: "i-mingcute-radio-line" },
    { label: i18n.t("cloudie.main.history"), to: "/history", icon: "i-mingcute-history-line" },
    { label: i18n.t("cloudie.main.following"), to: "/following", icon: "i-mingcute-group-line" },
  ],
  [
    { label: i18n.t("cloudie.main.downloads"), to: "/downloads", icon: "i-mingcute-download-line" },
    { label: i18n.t("cloudie.main.settings"), to: "/settings", icon: "i-mingcute-settings-3-line" },
  ],
])
</script>