<template>
  <!-- 电台列表 没搞懂声云为什么电台要专门开个栏目出来 FIXME: 显示为undefined创作 -->
  <PlaylistList :items="stations" :cache="{}">
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
  </PlaylistList>
</template>

<script setup lang="ts" name="RadioView">
import { ref, onMounted } from "vue"
import { getJson, getV2ApiJson } from "../utils/api"
import PlaylistList from "../components/PlaylistList.vue"

const stations = ref<any[]>([])
const loading = ref(false)
const nextHref = ref("")
const hasNext = ref(false)

async function fetchNext() {
  loading.value = true

  const promise = nextHref.value
    ? getJson(nextHref.value)
    : getV2ApiJson("/me/library/stations", { limit: 10 })

  try {
    const res = await promise
    stations.value = [...stations.value, ...(res.collection || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href || ""
  } catch (err) {
    // TODO: Error alert
    console.error(err)
    return
  } finally {
    loading.value = false
  }
}

onMounted(fetchNext)
</script>
