<template>
  <TrackList :tracks="tracks">
    <template #bottom>
      <template v-if="loading">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">加载中...</span>
      </template>

      <template v-else-if="hasNext">
        <button class="btn" @click="fetchNext">加载更多</button>
      </template>

      <template v-else>
        <span class="ml-2">没有更多了</span>
      </template>
    </template>
  </TrackList>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { getJson, getUserInfo, getV2ApiJson } from "../utils/api"
import TrackList from "./TrackList.vue"

// 数据获取

const tracks = ref<any[]>([])
const loading = ref(false)
const nextHref = ref("")
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
    const res = await promise
    tracks.value = [...tracks.value, ...(res.collection || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href || ""
  } catch (err) {
    // TODO: Error alert
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchNext)
</script>
