<template>
  <div>
    <UTabs :items="items">
      <template v-for="item in items" :key="item.slot" #[item.slot]>
        <PlaylistList :items="getTab(item.slot)!">
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
    </UTabs>
  </div>
</template>

<script setup lang="ts" name="PlaylistView">
import { onMounted, computed } from "vue"
import { useLibrary } from "@/utils/api"
import { i18n } from "@/systems/i18n"

const items = computed(() => [
  {
    label: i18n.global.t("skye.library.playlist"),
    icon: "i-mingcute-playlist-line",
    slot: "playlist",
  },
  {
    label: i18n.global.t("skye.library.systemPlaylist"),
    icon: "i-mingcute-server-line",
    slot: "system",
  },
  { label: i18n.global.t("skye.library.album"), icon: "i-mingcute-album-line", slot: "album" },
])

const collection = useLibrary()

function getTab(slot: string) {
  switch (slot) {
    case "system":
      return collection.data.value.filter((item) => item.type === "system-playlist-like")
    case "playlist":
      return collection.data.value.filter(
        (item) => item.type === "playlist-like" && !item.playlist?.is_album,
      )
    case "album":
      return collection.data.value.filter(
        (item) => item.type === "playlist-like" && item.playlist?.is_album === true,
      )
  }
}

onMounted(() => {
  collection.fetchNext()
})
</script>
