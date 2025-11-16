<template>
  <!-- FIXME: Scroll does not load-->
  <div class="flex flex-col h-full">
    <VirtualList class="w-full flex-1" ref="virtualListRef" :items="data" :estimateSize="() => 235">
      <template #item="{ item }">
        <component
          :is="getFullTrackComponent()"
          v-if="item.type === 'track' || item.type === 'track-repost'"
          :track="item.track"
          :stream-item="item" />
        <component
          :is="getFullPlaylistComponent()"
          v-else-if="item.type === 'playlist' || item.type === 'playlist-repost'"
          :playlist="item.playlist"
          :stream-item="item" />
      </template>
    </VirtualList>
  </div>
</template>

<script setup lang="ts" name="FeedsView">
import { config } from "@/systems/config"
import { useStream } from "@/utils/api"
import { useInfiniteScroll } from "@vueuse/core"
import { onMounted, ref } from "vue"

// explicitly import the components to avoid tree-shaking
import FullTrack from "@/components/full/FullTrack.vue"
import TwitterFullTrack from "@/components/full/themes/TwitterFullTrack.vue"
import FullPlaylist from "@/components/full/FullPlaylist.vue"
import TwitterFullPlaylist from "@/components/full/themes/TwitterFullPlaylist.vue"

const { data, loading, hasNext, fetchNext } = useStream()
const virtualListRef = ref<InstanceType<typeof VirtualList> | null>(null)

function getFullPlaylistComponent() {
  switch (config.value.feedStyle) {
    case "twitter":
      return TwitterFullPlaylist
    default:
      return FullPlaylist
  }
}

function getFullTrackComponent() {
  switch (config.value.feedStyle) {
    case "twitter":
      return TwitterFullTrack
    default:
      return FullTrack
  }
}

useInfiniteScroll(virtualListRef.value?.scrollContainer, fetchNext, {
  distance: 200,
  canLoadMore: () => {
    return hasNext && !loading
  },
})

onMounted(() => {
  fetchNext()
})
</script>
