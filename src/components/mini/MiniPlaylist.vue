<template>
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented/50 transition-colors min-w-0 w-full h-18">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <img :src="artworkUrl" :alt="props.playlist.title" class="size-14 rounded-sm object-cover flex-shrink-0" />
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
        <p class="truncate text-sm text-muted"> {{ $t("cloudie.trackList.tracks", {
          count: (props.playlist.tracks ||
            []).length})}}</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UButton color="neutral"
        :icon="user.isLikedPlaylist(props.playlist.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
        variant="ghost" @click="user.toggleLikePlaylist(props.playlist.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { replaceImageUrl } from "@/utils/utils"
import { UserPlaylist } from "@/utils/types"
import { usePlaylistsStore } from "@/systems/stores/playlists"
import { computed } from "vue"
import { useUserStore } from "@/systems/stores/user"

const user = useUserStore()
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