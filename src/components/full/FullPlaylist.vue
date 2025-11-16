<template>
  <div class="bg-default border-t border-accented max-w-3xl mx-auto">
    <div class="flex flex-col gap-3">
      <div v-if="streamItem" class="flex items-center gap-2 text-muted">
        <UAvatar :src="streamItem.user.avatar_url" class="size-8" />
        <ULink
          :to="`/user/${streamItem.user.id}`"
          class="text-lg font-bold text-highlighted truncate">
          {{ streamItem.user.username }}
        </ULink>
        <i-mingcute-repeat-line v-if="streamItem.type === 'playlist-repost'" />
        {{ streamItem.type === 'playlist-repost' ? 'Reposted' : 'Posted' }}a playlist
        {{
          formatFromNow(streamItem.created_at)
        }}
      </div>

      <RichText
        v-if="streamItem?.caption"
        :content="streamItem.caption"
        class="text-sm line-clamp-1" />

      <div class="flex items-start gap-3">
        <div class="relative size-28 shrink-0">
          <img
            :src="replaceImageUrl(usePlaylistsStore().getCoverCache(props.playlist.id).value)"
            :alt="props.playlist.title"
            class="size-28 rounded-sm object-cover" />
        </div>

        <div
          class="flex-1 min-w-0 flex flex-col gap-2 h-28 bg-cover bg-fixed rounded-sm bg-center px-4 pt-2">
          <div class="flex min-w-0 items-start justify-between">
            <div class="flex flex-col min-w-0 flex-1 gap-1">
              <UTooltip :text="props.playlist.title">
                <ULink
                  :to="`/playlist/${props.playlist.id}`"
                  class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted">
                  {{ props.playlist.title }}
                </ULink>
              </UTooltip>
              <UTooltip :text="props.playlist.user.username">
                <ULink
                  :to="`/user/${props.playlist.user.id}`"
                  class="truncate text-sm text-muted cursor-pointer max-w-full inline-block">
                  {{ props.playlist.user.username }}
                </ULink>
              </UTooltip>
            </div>

            <span class="text-sm">
              <p>
                {{ $t('skye.full.playlist.tracks', { count: props.playlist.track_count ?? 0 }) }}
              </p>
              <p>
                {{ $t('skye.full.playlist.duration', { duration: formatMillis(props.playlist.duration ?? 0) }) }}
              </p>
              <!-- TODO: Time display -->
            </span>
          </div>
        </div>
      </div>

      <div class="flex max-w-xl items-center gap-3 ml-32">
        <UButton
          :icon="user.isLikedPlaylist(props.playlist.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
          :color="user.isLikedPlaylist(props.playlist.id) ? 'primary' : 'neutral'"
          variant="soft"
          :label="props.playlist.likes_count ? props.playlist.likes_count.toString() : '0'"
          @click="user.toggleLikePlaylist(props.playlist.id)" />
        <UButton
          :icon="user.isRepostedPlaylist(props.playlist.id) ? 'i-mingcute-share-3-fill' : 'i-mingcute-share-3-line'"
          :color="user.isRepostedPlaylist(props.playlist.id) ? 'primary' : 'neutral'"
          variant="soft"
          :label="props.playlist.reposts_count.toString()"
          @click="user.toggleRepostPlaylist(props.playlist.id)" />
        <UButton
          icon="i-mingcute-share-2-line"
          color="neutral"
          variant="soft"
          @click=";/* TODO: Share Track */" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMillis, replaceImageUrl } from "@/utils/utils"
import { StreamItem, UserPlaylist } from "@/utils/types"
import { useUserStore } from "@/systems/stores/user"
import { formatFromNow } from "@/utils/utils"
import { usePlaylistsStore } from "@/systems/stores/playlists"

const props = defineProps<{
  playlist: UserPlaylist
  streamItem?: StreamItem
}>()

const user = useUserStore()
</script>

<style scoped>
/* 限制链接点击区域只包含文字内容 */
:deep(a) {
  display: inline;
  width: fit-content;
  max-width: 100%;
}
</style>
