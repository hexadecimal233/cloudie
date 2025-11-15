<template>
  <!-- 电台列表 没搞懂声云为什么电台要专门开个栏目出来 -->
  <PlaylistList :items="collection.data.value" :cache="{}">
    <template #bottom>
      <template v-if="collection.loading.value">
        <span class="ml-2">{{ $t("skye.common.loading") }}</span>
      </template>

      <template v-else-if="collection.hasNext.value">
        <UButton @click="collection.fetchNext">{{ $t("skye.common.loadMore") }}</UButton>
      </template>

      <template v-else>
        <span class="ml-2">{{ $t("skye.common.noMore") }}</span>
      </template>
    </template>
  </PlaylistList>
</template>

<script setup lang="ts" name="RadioView">
import { onMounted } from "vue"
import { useStations } from "@/utils/api"

const collection = useStations()

onMounted(() => {
  collection.fetchNext()
})
</script>
