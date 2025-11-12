<template>
  <div>
    <UTabs :items="items">
      <template v-for="item in items" :key="item.slot" #[item.slot]>
        <PlaylistList :items="getTab(item.slot)!">
          <template #bottom>
            <template v-if="collection.loading.value">
              <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
            </template>

            <template v-else-if="collection.hasNext.value">
              <UButton @click="collection.fetchNext">{{ $t("cloudie.common.loadMore") }}</UButton>
            </template>

            <template v-else>
              <span class="ml-2">{{ $t("cloudie.common.noMore") }}</span>
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
  { label: i18n.global.t("cloudie.library.playlist"), icon: "i-lucide-list", slot: "playlist" },
  {
    label: i18n.global.t("cloudie.library.systemPlaylist"),
    icon: "i-lucide-server",
    slot: "system",
  },
  { label: i18n.global.t("cloudie.library.album"), icon: "i-lucide-album", slot: "album" },
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
