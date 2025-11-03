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
import { useCollection, userInfo } from "../utils/api"
import TrackList from "./TrackList.vue"
import { LocalPlaylist, TrackLike } from "@/utils/types"
import { savePlaylist } from "@/systems/cache"

const props = defineProps<{
  type: string
}>()

const playlist = ref(new LocalPlaylist(props.type))

function getUrl() {
  if (props.type === "track_likes") {
    return `/users/${userInfo.value.id}/track_likes`
  } else {
    return "/me/play-history/tracks"
  }
}

const collection = useCollection<TrackLike>(getUrl(), 500)

watch(
    () => collection.data.value,
    (newData) => {
      if (newData) {
        playlist.value.tracks = newData.map((item) => item.track)
        savePlaylist(playlist.value)
      }
    }
  )

onMounted(() => {
  collection.fetchNext()
})
</script>
