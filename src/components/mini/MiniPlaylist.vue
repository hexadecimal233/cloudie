<template>
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented transition-colors min-w-0 w-full">
    <img :src="artworkUrl" :alt="props.playlist.title" class="size-14 rounded-sm object-cover" />
    <div class="flex flex-col min-w-0 flex-1">
      <UTooltip :text="props.playlist.title">
        <ULink :to="`/user-playlist/${props.playlist.id}`"
          class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted">
          {{ props.playlist.title }}
        </ULink>
      </UTooltip>
      <UTooltip :text="props.playlist.user.username">
        <ULink :to="`/user/${props.playlist.user.id}`"
          class="truncate text-sm text-muted cursor-pointer max-w-full inline-block">
          {{ props.playlist.user.username }}
        </ULink>
      </UTooltip>
      <p class="truncate text-sm text-muted">{{ (props.playlist.tracks || []).length }} {{ $t("cloudie.trackList.song")
        }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { replaceImageUrl } from "@/utils/utils"
import { UserPlaylist } from "@/utils/types"
import { usePlaylistsStore } from "@/systems/stores/playlists"
import { computed } from "vue"

const playlistsStore = usePlaylistsStore()

// get & fetch missing artwork
const artworkUrl = computed(() => {
  let artworkUrl = ""
  if (props.playlist.artwork_url) {
    artworkUrl = props.playlist.artwork_url
  } else {
    artworkUrl = playlistsStore.getCoverCache(props.playlist.id).value
  }

  return replaceImageUrl(artworkUrl)
})

const props = defineProps<{
  playlist: UserPlaylist
}>()
</script>