<template>
  <div v-if="user">
    <div>
      <div class="alert alert-warning">TODO: This is still a demo, translations and content experience might be bad
      </div>
      <div class="flex items-center mb-6">
        <div class="avatar mr-4">
          <div class="w-20 h-20 rounded-full">
            <img :src="user.avatar_url || 'https://picsum.photos/seed/default-avatar/200/200.jpg'" :alt="user.username"
              class="w-full h-full object-cover" />
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-bold flex items-center">
            {{ user.username }}
            <span v-if="user.verified" class="badge badge-info badge-sm ml-2">✓</span>
          </h2>
          <p class="text-gray-500">{{ user.full_name || user.username }}</p>
          <div class="flex space-x-4 mt-1 text-sm text-gray-400">
            <span>{{ user.followers_count }} {{ $t("cloudie.user.followers") }}</span>
            <span>•</span>
            <span>{{ user.followings_count }} {{ $t("cloudie.user.following") }}</span>
            <span>•</span>
            <span>{{ user.track_count }} {{ $t("cloudie.user.tracks") }}</span>
          </div>
        </div>
      </div>

      <div v-if="user.description" class="mb-6">
        <p class="text-sm">{{ user.description }}</p>
      </div>

      <div class="tabs tabs-boxed mb-6">
        <a v-for="(tab, index) in tabs" :key="tab.id" class="tab" :class="{ 'tab-active': activeTab === index }"
          @click="activeTab = index">
          {{ $t(`cloudie.user.tabs.${tab.id}`) }}
        </a>
      </div>

      <div class="min-h-[300px]">
        <!-- Tracks Tab -->
        <div v-if="activeTab === 0">
          <div v-if="tracksLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </div>
          <div v-else-if="tracksError" class="alert alert-error">
            <span>{{ $t("cloudie.user.tracksError") }}: {{ tracksError }}</span>
          </div>
          <div v-else-if="tracks.length === 0" class="text-center py-8">
            <p>{{ $t("cloudie.user.noTracks") }}</p>
          </div>
          <div v-else class="flex-col flex space-y-2">
            <div v-for="track in tracks" :key="track.id">
              <MiniTrack :track="track" />
            </div>
          </div>
        </div>

        <!-- Spotlight Tab -->
        <div v-if="activeTab === 1">
          <div v-if="spotlightLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </div>
          <div v-else-if="spotlightError" class="alert alert-error">
            <span>{{ $t("cloudie.user.spotlightError") }}: {{ spotlightError }}</span>
          </div>
          <div v-else-if="spotlight.length === 0" class="text-center py-8">
            <p>{{ $t("cloudie.user.noSpotlight") }}</p>
          </div>
          <div v-else class="space-y-2">
            <MiniTrack :track="track" v-for="track in spotlight" :key="track.id" />
          </div>
        </div>

        <!-- Web Profiles Tab -->
        <div v-if="activeTab === 2">
          <div v-if="webProfilesLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </div>
          <div v-else-if="webProfilesError" class="alert alert-error">
            <span>{{ $t("cloudie.user.webProfilesError") }}: {{ webProfilesError }}</span>
          </div>
          <div v-else-if="webProfiles.length === 0" class="text-center py-8">
            <p>{{ $t("cloudie.user.noWebProfiles") }}</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="profile in webProfiles" :key="profile.network"
              class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow" @click="openWebProfile(profile.url)">
              <div class="card-body p-4">
                <div class="flex items-center space-x-3">
                  <div class="text-2xl">
                    {{ getNetworkIcon(profile.network) }}
                  </div>
                  <div>
                    <h4 class="font-medium">{{ profile.title }}</h4>
                    <p class="text-sm text-gray-500">{{ profile.network }}</p>
                    <p v-if="profile.username" class="text-sm text-gray-400">@{{ profile.username }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Artists Tab -->
        <div v-if="activeTab === 3">
          <div v-if="relatedArtistsLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </div>
          <div v-else-if="relatedArtistsError" class="alert alert-error">
            <span>{{ $t("cloudie.user.relatedArtistsError") }}: {{ relatedArtistsError }}</span>
          </div>
          <div v-else-if="relatedArtists.length === 0" class="text-center py-8">
            <p>{{ $t("cloudie.user.noRelatedArtists") }}</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="artist in relatedArtists" :key="artist.id"
              class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              @click="openUserProfile(artist.permalink)">
              <div class="card-body p-4">
                <div class="flex items-center space-x-3">
                  <div class="avatar">
                    <div class="w-12 h-12 rounded-full">
                      <img :src="artist.avatar_url || 'https://picsum.photos/seed/user-' + artist.id + '/200/200.jpg'"
                        :alt="artist.username" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium truncate flex items-center">
                      {{ artist.username }}
                      <span v-if="artist.verified" class="badge badge-info badge-sm ml-2">✓</span>
                    </h4>
                    <p class="text-sm text-gray-500 truncate">{{ artist.full_name || artist.username }}
                    </p>
                    <div class="flex space-x-2 mt-1 text-xs text-gray-400">
                      <span>{{ artist.followers_count }} {{ $t("cloudie.user.followers") }}</span>
                      <span>•</span>
                      <span>{{ artist.track_count }} {{ $t("cloudie.user.tracks") }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comments Tab -->
        <div v-if="activeTab === 4">
          <div v-if="commentsLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
          </div>
          <div v-else-if="commentsError" class="alert alert-error">
            <span>{{ $t("cloudie.user.commentsError") }}: {{ commentsError }}</span>
          </div>
          <div v-else-if="comments.length === 0" class="text-center py-8">
            <p>{{ $t("cloudie.user.noComments") }}</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="comment in comments" :key="comment.id" class="card bg-base-100 shadow-sm">
              <div class="card-body p-4">
                <div class="flex items-start space-x-3">
                  <div class="avatar">
                    <div class="w-10 h-10 rounded-full">
                      <img
                        :src="comment.user.avatar_url || 'https://picsum.photos/seed/user-' + comment.user.id + '/200/200.jpg'"
                        :alt="comment.user.username" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <h4 class="font-medium">{{ comment.user.username }}</h4>
                      <span class="text-xs text-gray-400">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <p class="text-sm">{{ comment.body }}</p>
                    <div class="mt-2">
                      <p class="text-xs text-gray-500">{{ $t("cloudie.user.onTrack") }}: {{
                        comment.track.title }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="UserView">
import { ref, onMounted, watch } from "vue"
import {
  getRelatedArtists,
  getSpolight,
  getUser,
  getWebProfiles,
  useTracks,
  useUserComments,
} from "@/utils/api"
import { SCUser, Track, WebProfile } from "@/utils/types"
import { toast } from "vue-sonner"
import { useRoute } from "vue-router"

const id = Number(useRoute().params.id)


const tabs = [
  { id: "tracks", label: "Tracks" },
  { id: "spotlight", label: "Spotlight" },
  { id: "webProfiles", label: "Web Profiles" },
  { id: "relatedArtists", label: "Related Artists" },
  { id: "comments", label: "Comments" },
]

const activeTab = ref(0)

// Data for each tab
const {
  data: tracks,
  error: tracksError,
  loading: tracksLoading,
  fetchNext: fetchTracks,
} = useTracks(id)

const user = ref<SCUser>()
const userLoading = ref(false)
const userError = ref<string | null>(null)

const spotlight = ref<Track[]>([])
const spotlightLoading = ref(false)
const spotlightError = ref<string | null>(null)

const webProfiles = ref<WebProfile[]>([])
const webProfilesLoading = ref(false)
const webProfilesError = ref<string | null>(null)

const relatedArtists = ref<SCUser[]>([])
const relatedArtistsLoading = ref(false)
const relatedArtistsError = ref<string | null>(null)

const {
  data: comments,
  error: commentsError,
  loading: commentsLoading,
  fetchNext: fetchComments,
} = useUserComments(id)

const loadUser = async () => {
  if (user.value) return // Already loaded

  userLoading.value = true
  userError.value = null

  try {
    user.value = await getUser(id)
  } catch (err: any) {
    console.error("Error loading user:", err)
    userError.value = err.message || "Failed to load user"
  } finally {
    userLoading.value = false
  }
}



// Load data for each tab
const loadTracks = async () => {
  if (tracks.value.length > 0) return // Already loaded

  await fetchTracks()
}

const loadSpotlight = async () => {
  if (spotlight.value.length > 0) return // Already loaded

  spotlightLoading.value = true
  spotlightError.value = null

  try {
    spotlight.value = await getSpolight(id)
  } catch (err: any) {
    console.error("Error loading user spotlight:", err)
    spotlightError.value = err.message || "Failed to load spotlight"
  } finally {
    spotlightLoading.value = false
  }
}

const loadWebProfiles = async () => {
  if (webProfiles.value.length > 0) return // Already loaded

  webProfilesLoading.value = true
  webProfilesError.value = null

  try {
    webProfiles.value = await getWebProfiles(id)
  } catch (err: any) {
    console.error("Error loading user web profiles:", err)
    webProfilesError.value = err.message || "Failed to load web profiles"
  } finally {
    webProfilesLoading.value = false
  }
}

const loadRelatedArtists = async () => {
  if (relatedArtists.value.length > 0) return // Already loaded

  relatedArtistsLoading.value = true
  relatedArtistsError.value = null

  try {
    relatedArtists.value = await getRelatedArtists(id)
  } catch (err: any) {
    console.error("Error loading related artists:", err)
    relatedArtistsError.value = err.message || "Failed to load related artists"
  } finally {
    relatedArtistsLoading.value = false
  }
}

const loadComments = async () => {
  if (comments.value.length > 0) return // Already loaded

  await fetchComments()
}

// Load data when tab changes
watch(activeTab, (newTab) => {
  switch (newTab) {
    case 0: // Tracks
      loadTracks()
      break
    case 1: // Spotlight
      loadSpotlight()
      break
    case 2: // Web Profiles
      loadWebProfiles()
      break
    case 3: // Related Artists
      loadRelatedArtists()
      break
    case 4: // Comments
      loadComments()
      break
  }
})

// Load initial tab data
onMounted(() => {
  loadUser()
  loadTracks()
})

// Helper functions
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const playTrack = (track: Track) => {
  // This would need to be implemented based on the player system
  // For now, just show a toast
  toast.info(`Playing: ${track.title}`)
}

const openWebProfile = (url: string) => {
  window.open(url, "_blank")
}

const openUserProfile = (permalink: string) => {
  window.open(`https://soundcloud.com/${permalink}`, "_blank")
}

const getNetworkIcon = (network: string) => {
  // Return appropriate icon for each social network
  // This is a simplified version, you might want to use actual icons
  const icons: Record<string, string> = {
    facebook: "📘",
    twitter: "🐦",
    instagram: "📷",
    youtube: "📺",
    soundcloud: "🎵",
    spotify: "🎶",
    bandcamp: "💿",
    website: "🌐",
  }
  return icons[network.toLowerCase()] || "🔗"
}
</script>