<template>
  <div class="p-4 border border-accented bg-default max-w-3xl mx-auto">
    <div class="flex gap-3"> <!-- Left Column: Avatar -->
      <UAvatar :src="streamItem?.user.avatar_url" class="size-10 flex-shrink-0" />

      <!-- Right Column: Content -->
      <div class="flex-1 min-w-0 flex flex-col gap-2">

        <!-- Context Header (User Info & Time) -->
        <div v-if="streamItem" class="flex items-center gap-2 text-muted text-sm">
          <ULink :to="`/user/${streamItem.user.id}`" class="font-bold text-highlighted truncate hover:underline">
            {{ streamItem.user.username }}
          </ULink>
          <span class="text-muted">@{{ streamItem.user.username.toLowerCase() }}</span>
          <span class="text-muted mx-0.5">·</span>
          <span class="text-muted">{{ formatFromNow(streamItem.created_at) }}</span>
          <i-mingcute-repeat-line v-if="streamItem.type === 'playlist-repost'" class="text-primary ml-1" />
        </div>

        <!-- Caption -->
        <RichText v-if="streamItem?.caption" :content="streamItem.caption"  class="text-sm mb-1 text-highlighted break-words" />

        <!-- Playlist Media Card (Bordered and contained) -->
        <div
          class="flex items-start gap-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden">

          <!-- Cover Art (size-24) -->
          <div class="relative size-24 flex-shrink-0 rounded-lg">
            <img :src="replaceImageUrl(usePlaylistsStore().getCoverCache(props.playlist.id).value)"
              :alt="props.playlist.title" class="size-24 rounded-lg object-cover" />
          </div>

          <!-- Details Block -->
          <div class="flex-1 min-w-0 flex flex-col justify-center h-24 pr-0">
            <div class="flex min-w-0 items-start justify-between">

              <div class="flex flex-col min-w-0 flex-1 gap-1">
                <UTooltip :text="props.playlist.title">
                  <ULink :to="`/playlist/${props.playlist.id}`"
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
              </div>

              <span class="text-sm text-muted">
                {{ formatMillis(props.playlist.duration) }}
              </span>
            </div>
            <!-- Added a bit of spacing here for the Twitter style -->
            <div class="mt-2 text-xs text-neutral-500">
              <p>{{ $t('cloudie.full.playlist.tracks', { count: props.playlist.track_count ?? 0 }) }}</p>
              <p>{{ $t('cloudie.full.playlist.duration', { duration: formatMillis(props.playlist.duration ?? 0) }) }}</p>
            </div>
          </div>
        </div>

        <!-- Action Bar (Full width, spread out icons) -->
        <div class="flex items-center justify-between max-w-md text-neutral-500 dark:text-neutral-400 mt-1">

          <!-- Likes (Primary/Pink accent on hover) -->
          <UButton :icon="user.isLikedPlaylist(props.playlist.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
            :color="user.isLikedPlaylist(props.playlist.id) ? 'primary' : 'neutral'" variant="ghost" size="sm"
            class="hover:text-primary" :label="props.playlist.likes_count ? props.playlist.likes_count.toString() : '0'"
            @click="user.toggleLikePlaylist(props.playlist.id)" />

          <!-- Reposts (Primary/Green accent on hover) -->
          <UButton
            :icon="user.isRepostedPlaylist(props.playlist.id) ? 'i-mingcute-share-3-fill' : 'i-mingcute-share-3-line'"
            :color="user.isRepostedPlaylist(props.playlist.id) ? 'primary' : 'neutral'" variant="ghost" size="sm"
            class="hover:text-primary" :label="props.playlist.reposts_count.toString()"
            @click="user.toggleRepostPlaylist(props.playlist.id)" />

          <!-- Share -->
          <UButton icon="i-mingcute-share-2-line" color="neutral" variant="ghost" size="sm" class="hover:text-primary"
            @click=";/* TODO: Share Track */" />
        </div>
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