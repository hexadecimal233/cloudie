<template>
  <div class="h-full flex flex-col">
    <UButton @click="$router.push('/test')"> go to components test </UButton>

    <VirtualList class="w-full flex-1" ref="virtualListRef"
      :items="data"
      :estimateSize="() => 235"
    >
   <template #item="{ item }">
    <FullTrack v-if="item.type === 'track' || item.type === 'track-repost'" :track="item.track" :stream-item="item" />
    <span v-else>{{ item.type  }}</span> 
  </template>
  </VirtualList>
  </div>
</template>

<script setup lang="ts" name="FeedsView">
import { useStream } from "@/utils/api"
import { useInfiniteScroll } from "@vueuse/core"
import { onMounted, ref } from "vue"

const { data, loading, error, hasNext, fetchNext } = useStream()
const virtualListRef = ref<InstanceType<typeof VirtualList> | null>(null)

const infiniteScroll = useInfiniteScroll(virtualListRef.value?.scrollContainer, fetchNext, {
  distance: 200, 
  canLoadMore: () => {
    return hasNext && !loading
  },
})

onMounted(() => {
  fetchNext()
})
</script>
