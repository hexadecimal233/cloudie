<template>
  <TrackList :playlist="playlist">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { getJson, getUserInfo, getV2ApiJson } from "../utils/api"
import TrackList from "./TrackList.vue"
import { CollectionResp, LocalPlaylist, TrackLike } from "@/utils/types"
import { savePlaylist } from "@/systems/cache"

const loading = ref(false)
const nextHref = ref<string | null>(null)
const hasNext = ref(false)

const props = defineProps<{
  type: string
}>()

const playlist = ref(new LocalPlaylist(props.type))

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
    playlist.value.tracks = [
      ...playlist.value.tracks,
      ...(res.collection.map((item) => item.track) || []),
    ]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href
    savePlaylist(playlist.value)
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
