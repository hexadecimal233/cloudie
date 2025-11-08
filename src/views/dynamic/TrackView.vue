<template>
    <div class="alert alert-warning">TODO: This is still a demo, translations and content experience might be bad</div>
    <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
    </div>

    <div v-else-if="error" class="alert alert-error">
        <span>{{ error }}</span>
    </div>

    <div v-else-if="track" class="track-view">
        <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
                <div class="flex items-center gap-4">
                    <img :src="getCoverUrl(track)" :alt="track.title" class="w-32 h-32 rounded-lg object-cover" />
                    <div class="flex-1">
                        <h1 class="text-2xl font-bold">{{ track.title }}</h1>
                        <p class="text-lg opacity-70">{{ getArtist(track) }}</p>
                        <p class="text-sm opacity-50">{{ formatMillis(track.full_duration) }}</p>
                        <div class="flex gap-2 mt-2">
                            <button class="btn btn-primary" @click="playTrack">
                                <i-mdi-play />
                                {{ $t("cloudie.common.play") }}
                            </button>
                            <button class="btn btn-ghost" @click="addToListeningList">
                                <i-mdi-plus />
                                {{ $t("cloudie.trackList.addToListening") }}
                            </button>
                            <button class="btn btn-ghost" @click="downloadTrack">
                                <i-mdi-download />
                                {{ $t("cloudie.trackList.download") }}
                            </button>
                            <a class="btn btn-ghost" :href="track.permalink_url" target="_blank">
                                <i-mdi-open-in-new />
                            </a>
                        </div>
                    </div>
                </div>

                <div v-if="track.description" class="mt-4">
                    <h2 class="text-lg font-semibold mb-2">{{ $t("cloudie.trackView.description") }}</h2>
                    <p class="whitespace-pre-wrap">{{ track.description }}</p>
                </div>

                <div class="stats stats-vertical lg:stats-horizontal shadow mt-4">
                    <div class="stat">
                        <div class="stat-title">{{ $t("cloudie.trackView.playCount") }}</div>
                        <div class="stat-value">{{ formatNumber(track.playback_count) }}</div>
                    </div>

                    <div class="stat">
                        <div class="stat-title">{{ $t("cloudie.trackView.likes") }}</div>
                        <div class="stat-value">{{ formatNumber(track.likes_count) }}</div>
                    </div>

                    <div class="stat">
                        <div class="stat-title">{{ $t("cloudie.trackView.reposts") }}</div>
                        <div class="stat-value">{{ formatNumber(track.reposts_count) }}</div>
                    </div>

                    <div class="stat">
                        <div class="stat-title">{{ $t("cloudie.trackView.comments") }}</div>
                        <div class="stat-value">{{ formatNumber(track.comment_count) }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Related Tracks Section -->
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="text-xl font-bold mb-4">{{ $t("cloudie.trackView.relatedTracks") }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MiniTrack
                        v-for="track in relatedTracks" 
                        :key="track.id" 
                        :track="track" 
                        :tracks="relatedTracks"
                    />
                </div>
            </div>
        </div>

        <!-- Related Albums Section -->
        <div class="card bg-base-100 shadow-xl mt-6" v-if="relatedAlbums.length > 0">
            <div class="card-body">
                <h2 class="text-xl font-bold mb-4">{{ $t("cloudie.trackView.relatedAlbums") }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MiniPlaylist 
                        v-for="album in relatedAlbums" 
                        :key="album.id" 
                        :playlist="album" 
                        :max-tracks="5"
                    />
                </div>
            </div>
        </div>

        <!-- Related Playlists Section -->
        <div class="card bg-base-100 shadow-xl mt-6" v-if="relatedPlaylists.length > 0">
            <div class="card-body">
                <h2 class="text-xl font-bold mb-4">{{ $t("cloudie.trackView.relatedPlaylists") }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MiniPlaylist 
                        v-for="playlist in relatedPlaylists" 
                        :key="playlist.id" 
                        :playlist="playlist" 
                        :max-tracks="5"
                    />
                </div>
            </div>
        </div>

        <!-- Comments Section -->
        <div class="card bg-base-100 shadow-xl mt-6">
            <div class="card-body">
                <h2 class="text-xl font-bold mb-4">{{ $t("cloudie.trackView.comments") }}</h2>
                <div v-if="comments.loading.value" class="flex justify-center items-center h-32">
                    <div class="loading loading-spinner loading-md"></div>
                </div>
                <div v-else-if="comments.data.value.length === 0" class="text-center py-8">
                    <div class="text-lg">{{ $t("cloudie.common.empty") }}</div>
                    <div class="text-base-content/70 text-sm">{{ $t("cloudie.trackView.noComments") }}</div>
                </div>
                <div v-else class="space-y-4">
                    <div v-for="comment in comments.data.value" :key="comment.id" class="chat chat-start">
                        <div class="chat-image avatar">
                            <div class="w-10 rounded-full">
                                <img :src="comment.user.avatar_url" :alt="comment.user.username" />
                            </div>
                        </div>
                        <div class="chat-header">
                            {{ comment.user.username }}
                            <time class="text-xs opacity-50 ml-2">{{ formatDate(comment.created_at) }}</time>
                        </div>
                        <div class="chat-bubble">{{ comment.body }}</div>
                    </div>
                    <div v-if="comments.hasNext.value" class="text-center mt-4">
                        <button class="btn" @click="comments.fetchNext">
                            {{ $t("cloudie.common.loadMore") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="TrackView">
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { db } from "@/systems/db/db"
import * as schema from "@/systems/db/schema"
import { eq } from "drizzle-orm"
import {
  getTracks,
  getRelatedTracks,
  useTrackComments,
  useTrackAlbums,
  useTrackPlaylistsWithoutAlbum,
} from "@/utils/api"
import { formatMillis, getArtist, getCoverUrl, formatNumber, formatDate } from "@/utils/utils"
import { addToListeningList as addTrackToListeningList } from "@/systems/player/listening-list"
import { addDownloadTask } from "@/systems/download/download"
import { usePlayerStore } from "@/systems/stores/player"
import { LocalPlaylist, Track } from "@/utils/types"
import MiniPlaylist from "@/components/mini/MiniPlaylist.vue"
import MiniTrack from "@/components/mini/MiniTrack.vue"

const route = useRoute()
const playerStore = usePlayerStore()

// Props
const trackId = ref<number>(parseInt(route.params.id as string))

// State
const track = ref<Track | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Get related tracks
const relatedTracks = ref<Track[]>([])

// Get related albums and playlists
const relatedAlbums = ref<any[]>([])
const relatedPlaylists = ref<any[]>([])

// Get comments
const comments = useTrackComments(trackId.value)

// Functions
async function fetchTrackFromDb(id: number) {
  try {
    const result = await db
      .select()
      .from(schema.localTracks)
      .where(eq(schema.localTracks.trackId, id))
    if (result.length > 0) {
      return result[0].meta
    }
    return null
  } catch (err) {
    console.error("Error fetching track from database:", err)
    return null
  }
}

async function fetchTrackFromApi(id: number) {
  try {
    const tracks = await getTracks([id])
    return tracks.length > 0 ? tracks[0] : null
  } catch (err) {
    console.error("Error fetching track from API:", err)
    return null
  }
}

async function loadTrack() {
  loading.value = true
  error.value = null

  try {
    // First try to get track from local database
    let trackData = await fetchTrackFromDb(trackId.value)

    // If not found in database, fetch from API
    if (!trackData) {
      trackData = await fetchTrackFromApi(trackId.value)
      if (!trackData) {
        error.value = "Track not found"
        return
      }
    }

    track.value = trackData

    // Load related tracks
    relatedTracks.value = await getRelatedTracks(trackId.value)

    // Load related albums and playlists
    const albums = await useTrackAlbums(trackId.value)
    const playlists = await useTrackPlaylistsWithoutAlbum(trackId.value)

    await albums.fetchNext()
    await playlists.fetchNext()

    relatedAlbums.value = albums.data.value
    relatedPlaylists.value = playlists.data.value

    // Load comments
    await comments.fetchNext()
  } catch (err) {
    console.error("Error loading track:", err)
    error.value = "Failed to load track"
  } finally {
    loading.value = false
  }
}

function playTrack() {
  if (track.value) {
    playerStore.play(track.value, [track.value])
  }
}

function addToListeningList() {
  if (track.value) {
    addTrackToListeningList(track.value)
  }
}

async function downloadTrack() {
  if (track.value) {
    const playlist = new LocalPlaylist("single-track")
    playlist.tracks = [track.value]
    await addDownloadTask(track.value, playlist)
  }
}

// Lifecycle
onMounted(() => {
  loadTrack()
})
</script>

<style scoped>
.track-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
}
</style>
