<template>
  <!-- 电台列表 没搞懂声云为什么电台要专门开个栏目出来 -->
  <PlaylistList :items="collection.data.value" :cache="{}">
    <template #bottom>
      <template v-if="collection.loading.value">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
      </template>

      <template v-else-if="collection.hasNext.value">
        <button class="btn" @click="collection.fetchNext">{{ $t("cloudie.common.loadMore") }}</button>
      </template>

      <template v-else>
        <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
      </template>
    </template>
  </PlaylistList>
</template>

<script setup lang="ts" name="RadioView">
import { onMounted } from "vue"
import { useStations } from "@/utils/api"
import PlaylistList from "@/components/PlaylistList.vue"

const collection = useStations()

onMounted(() => {
  collection.fetchNext()
})
</script>
