<template>
  <!-- 电台列表 没搞懂声云为什么电台要专门开个栏目出来 -->
  <PlaylistList :items="stations" :cache="{}">
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
  </PlaylistList>
</template>

<script setup lang="ts" name="RadioView">
import { ref, onMounted } from "vue"
import { getJson, getV2ApiJson } from "@/utils/api"
import PlaylistList from "@/components/PlaylistList.vue"
import { CollectionResp, PlaylistLike } from "@/utils/types"

const stations = ref<PlaylistLike[]>([])
const loading = ref(false)
const nextHref = ref<string | null>(null)
const hasNext = ref(false)

async function fetchNext() {
  loading.value = true

  const promise = nextHref.value
    ? getJson(nextHref.value)
    : getV2ApiJson("/me/library/stations", { limit: 10 })

  try {
    const res: CollectionResp<PlaylistLike> = await promise
    stations.value = [...stations.value, ...(res.collection || [])]
    hasNext.value = !!res.next_href
    nextHref.value = res.next_href
  } catch (err) {
    console.error("RadioView fetchNext error:", err)
    // TODO: display error on page
    return
  } finally {
    loading.value = false
  }
}

onMounted(fetchNext)
</script>
