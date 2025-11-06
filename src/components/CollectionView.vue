<template>
  <TrackList :playlist="playlist">
    <template #bottom>
      <template v-if="collection?.loading.value">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
      </template>

      <template v-else-if="collection && collection.hasNext.value">
        <button class="btn" @click="collection.fetchNext">{{ $t("cloudie.common.loadMore") }}</button>
      </template>

      <template v-else>
        <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
      </template>
    </template>
  </TrackList>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useHistory, userInfo, useTrackLikes } from "@/utils/api"
import TrackList from "./TrackList.vue"
import { LocalPlaylist } from "@/utils/types"
import { usePlaylistsStore } from "@/systems/stores/playlists"

const props = defineProps<{
  type: string
}>()

const playlist = ref(new LocalPlaylist(props.type))
const playlistsStore = usePlaylistsStore()

function getCollection() {
  if (props.type === "track_likes") {
    return useTrackLikes(userInfo.value.id)
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
      // 使用Pinia store保存播放列表
      playlistsStore.savePlaylistToStore(playlist.value)
    }
  },
)

onMounted(() => {
  collection.fetchNext()
})
</script>
