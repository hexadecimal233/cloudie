<template>
  <div>
    <div v-if="currentPlaylist" class="text-xl">{{ currentPlaylist.title }}</div>
    <div>
      <TrackList
        :tracks="tracks"
        :parentPlaylist="currentPlaylist.id.toString()"
        :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts" name="PlaylistView">
import { SystemPlaylist, Track } from "@/utils/types"
import { computed, onMounted, ref } from "vue"
import { fetchUserPlaylist } from "@/systems/playlist-cache"
import { i18n } from "@/systems/i18n"
import { getTracks } from "@/utils/api"

const props = defineProps<{
  playlistId: number
}>()

const loading = ref(true)
const currentPlaylist = ref<SystemPlaylist>()
const tracks = ref<Track[]>([])

onMounted(async () => {
  try {
    tracks.value = await getTracks(props.playlistId)
    loading.value = false
  } catch (e) {
    useToast().add({
      color: "error",
      title: i18n.global.t("skye.common.error"),
    })
  }
})
</script>
