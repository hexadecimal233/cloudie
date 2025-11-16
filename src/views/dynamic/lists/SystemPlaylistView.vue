<template>
  <div>
    <div v-if="currentPlaylist" class="text-xl">{{ currentPlaylist.title }}</div>
    <div>
      <TrackList :tracks="tracks" :parentPlaylist="currentPlaylist" :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts" name="PlaylistView">
import { UserPlaylist } from "@/utils/types"
import { computed, onMounted, ref } from "vue"
import { fetchUserPlaylist } from "@/systems/playlist-cache"
import { i18n } from "@/systems/i18n"

const props = defineProps<{
  playlistId: number
}>()

const loading = ref(true)
const currentPlaylist = ref<UserPlaylist>()
const tracks = computed(() => currentPlaylist.value?.tracks || [])

onMounted(async () => {
  try {
    currentPlaylist.value = await fetchUserPlaylist(props.playlistId)
    loading.value = false
  } catch (e) {
    useToast().add({
      color: "error",
      title: i18n.global.t("skye.common.error"),
    })
  }
})
</script>
