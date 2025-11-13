<template>
    <div class="flex flex-col h-full">
        <div v-if="currentPlaylist">
            {{ currentPlaylist.title }}
        </div>
        <TrackList v-if="currentPlaylist" :tracks="(tracks as Track[])" :parent-playlist="currentPlaylist" :loading="loading" />
    </div>
</template>

<script setup lang="ts" name="PlaylistView">
import { Track, UserPlaylist } from "@/utils/types"
import { computed, onMounted, ref } from "vue"
import { fetchUserPlaylist } from "@/systems/playlist-cache"
import { toast } from "vue-sonner"
import { i18n } from "@/systems/i18n"
import { useRoute } from "vue-router"

const loading = ref(true)
const currentPlaylist = ref<UserPlaylist>()
const tracks = computed(() => currentPlaylist.value?.tracks || [])

onMounted(async () => {
  try {
    currentPlaylist.value = await fetchUserPlaylist(Number(useRoute().params.id))
    loading.value = false
  } catch (e) {
    toast.error(i18n.global.t("cloudie.common.loadFail"), {
      description: e instanceof Error ? e.message : String(e),
    })
  }
})
</script>
