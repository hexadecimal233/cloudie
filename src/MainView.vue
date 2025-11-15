<template>
  <div class="mx-auto flex h-screen flex-col bg-muted relative">
    <!-- Background -->
    <div v-if="config.bg" class="absolute inset-0 bg-cover bg-fixed bg-center opacity-20 background"
      :style="{ backgroundImage: `url(${config.bg})` }"
      :class="{'blur-sm': config.bgBlur}"></div>

    <!-- Title Bar PS: data-tauri-drag-region doesn't work somehow -->
    <div class="w-full px-2 py-1 flex from-primary/5 to-secondary/5 z-10 bg-gradient-to-r" @mousedown="Window.getCurrent().startDragging()">
      <div class="flex items-center gap-2">
        <i-lucide-cloud class="text-primary" />
        <span class="font-bold" :class="{'text-primary': windowStates.isFocused}">Cloudie</span>
      </div>

      <div class="flex-1"></div>

      <div class="flex items-center gap-2" :class="{'opacity-50': !windowStates.isFocused}" @mousedown.stop>
        <UButton class="cursor-pointer" icon="i-lucide-minus" color="neutral" variant="link"
          @click="Window.getCurrent().minimize()" />
        <UButton class="cursor-pointer" :icon="windowStates.isMaximized ? 'i-lucide-minimize' : 'i-lucide-maximize'"
          color="neutral" variant="link" @click="Window.getCurrent().toggleMaximize()" />
        <UButton class="cursor-pointer hover:bg-error hover:text-inverted" icon="i-lucide-x" color="neutral"
          variant="link" @click="Window.getCurrent().close()" />
      </div>
    </div>

    <!-- Main Area -->
    <div class="flex flex-1 overflow-hidden my-2">
      <!-- Left Side: Navigation Menu -->
      <div class="w-full max-w-48 flex-shrink-0 flex flex-col px-4 bg-default rounded-r-lg">
        <!--
        <img src="/logo.png" alt="cloudie" class="h-20 object-contain" />
        -->

        <!-- Matches the right section text to make the spacing consistent -->
        <div class="flex items-center gap-2 mt-4 mb-8">
          <template v-if="!loading && userInfo.id !== -1">
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
            <UButton color="neutral" icon="i-lucide-chevron-left" variant="subtle" @click="$router.back()" />
            <UFieldGroup >
              <UInputMenu leading-icon="i-lucide-search" :items="searchSuggestions" v-model:search-term="searchTerm"
                :placeholder="$t('cloudie.main.search')" @keydown.enter.prevent="handleSearch"
                @update:model-value="(value) => searchTerm = value" class="w-64" />
              <UButton color="neutral" icon="i-lucide-x" variant="outline" @click="searchTerm = ''" />
            </UFieldGroup>
          </div>


          <!-- Page -->
          <router-view v-slot="{ Component }">
            <OverlayScrollbarsComponent defer ref="scrollbarRef" :options="{ scrollbars: { theme: scrollbarTheme } }">
              <!-- Set H-full for virtualist to work properly -->
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
import { Window } from "@tauri-apps/api/window"
import { config } from "./systems/config"

const route = useRoute()
const router = useRouter()
const i18n = useI18n()
const loading = ref(true)
const colorMode = useColorMode()
const userInfo = useUserStore()

const windowStates = ref({
  isFocused: false,
  isMaximized: false,
})

Window.getCurrent().onResized(async ({}) => {
  windowStates.value.isMaximized = await Window.getCurrent().isMaximized()
})

Window.getCurrent().onFocusChanged(({ payload: focused }) => {
  windowStates.value.isFocused = focused
})

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
    { label: i18n.t("cloudie.main.feeds"), to: "/feeds", icon: "i-lucide-rss" },
    { label: i18n.t("cloudie.main.likes"), to: "/likes", icon: "i-lucide-heart" },
    { label: i18n.t("cloudie.main.library"), to: "/library", icon: "i-lucide-list" },
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

<style scoped>
.background {
  transition: filter 0.3s ease-in-out;
}
</style>