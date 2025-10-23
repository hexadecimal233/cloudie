<template>
  <div ref="scrollContainer">
    <TrackList
      :tracks="tracks"
      :scroll-callbacks="{
        onTrigger: fetchNext, // TODO: fix auto loading
        canLoadMore: () => !loading && hasNext,
      }">
      <template #bottom>
        <template v-if="loading">
          <div class="loading loading-spinner loading-lg"></div>
          <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
        </template>

        <template v-else-if="hasNext">
          <button class="btn" @click="fetchNext">{{ $t("cloudie.common.loadMore") }}</button>
        </template>

        <template v-else>
          <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
        </template>
      </template>
    </TrackList>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { getJson, getUserInfo, getV2ApiJson } from "../utils/api"
import TrackList from "./TrackList.vue"
import { CollectionResp, Track, TrackLike } from "@/utils/types"

const tracks = ref<Track[]>([])
const loading = ref(false)
const nextHref = ref<string | null>(null)
const hasNext = ref(false)

const props = defineProps<{
  type: string
}>()

async function fetchNext() {
  loading.value = true

  let url: string
  if (props.type === "track_likes") {
    url = `/users/${(await getUserInfo()).id}/track_likes`
  } else {
    url = "/me/play-history/tracks"
  }

  const promise = nextHref.value ? getJson(nextHref.value) : getV2ApiJson(url, { limit: 500 })

  try {
    const res: CollectionResp<TrackLike> = await promise
    tracks.value = [...tracks.value, ...(res.collection.map((item) => item.track) || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href
  } catch (err) {
    console.error("CollectionView fetchNext error:", err)
    // TODO: display error on page
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNext()
})
</script>
