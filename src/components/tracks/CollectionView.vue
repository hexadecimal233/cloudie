<template>
  <TrackList
    :tracks="playlist.tracks"
    :parentPlaylist="playlist"
    :loading="collection?.loading.value"
    :loadMore="collection?.fetchNext"
    :hasMore="collection?.hasNext.value" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useHistory, useTrackLikes } from "@/utils/api"
import { LocalPlaylist } from "@/utils/types"
import { savePlaylist } from "@/systems/playlist-cache"
import { useUserStore } from "@/systems/stores/user"

const props = defineProps<{
  type: string
}>()

const userInfo = useUserStore()
const playlist = ref(new LocalPlaylist(props.type))

function getCollection() {
  if (props.type === "track_likes") {
    return useTrackLikes(userInfo.id)
  } else {
    return useHistory()
  }
}

const collection = getCollection()

watch(
  () => collection.data.value,
  (newData) => {
    if (newData) {
      playlist.value.tracks = newData.map((item) => item.track)
      savePlaylist(playlist.value)
    }
  },
)

onMounted(() => {
  collection.fetchNext()
})
</script>
