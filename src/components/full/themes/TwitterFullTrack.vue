<template>
  <div class="p-4 border border-accented bg-default max-w-3xl mx-auto">
    <div class="flex gap-3">
      <!-- Left Column: Avatar -->
      <UAvatar :src="streamItem?.user.avatar_url" class="size-10 flex-shrink-0" />

      <!-- Right Column: Content -->
      <div class="flex-1 min-w-0 flex flex-col">

        <!-- Context Header (User Info & Time) -->
        <div v-if="streamItem" class="flex items-center gap-2 text-muted mb-1 text-sm">
          <ULink :to="`/user/${streamItem.user.id}`" class="font-bold text-highlighted truncate hover:underline">
            {{ streamItem.user.username }}
          </ULink>
          <span class="text-muted">@{{ streamItem.user.permalink }}</span>
          <span class="text-muted mx-0.5">·</span>
          <span class="text-muted">{{ formatFromNow(streamItem.created_at) }}</span>
          <i-mingcute-repeat-line v-if="streamItem.type === 'track-repost'" class="ml-1" />
        </div>

        <!-- Caption -->
        <RichText v-if="streamItem?.caption" :content="streamItem.caption" class="text-sm mb-3 text-highlighted break-words" />

        <!-- Track Media Card (Small, bordered, containing original size-24 elements) -->
        <div
          class="flex items-start gap-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden mb-3">

          <!-- Album Art & Play Overlay (Original size-24) -->
          <div class="relative size-24 flex-shrink-0">
            <div @click="() => {
              if (player.isPlayingTrack(props.track) && !player.isPaused) { player.pause() } else { player.play(props.track) }
            }" class="absolute inset-0 size-full flex items-center justify-center bg-highlighted/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <!-- Play button style (Blue/Primary filled circle) -->
              <div
                class="size-10 bg-primary opacity-80 text-inverted rounded-full flex items-center justify-center transition-transform hover:scale-110">
                <i-mingcute-pause-fill v-if="player.isPlayingTrack(props.track) && !player.isPaused" class="text-2xl" />
                <i-mingcute-play-fill v-else class="text-2xl" />
              </div>
            </div>
            <img :src="replaceImageUrl(getCoverUrl(props.track))" :alt="props.track.title"
              class="size-24 rounded-lg object-cover" />
          </div>

          <!-- Track Details & Waveform -->
          <div class="flex-1 min-w-0 flex flex-col gap-2 h-24 bg-cover bg-fixed rounded-sm bg-center"
            :style="{ backgroundImage: `url('${visual}')` }">
            <div class="flex min-w-0 items-start justify-between">
              <div class="flex flex-col min-w-0 flex-1 gap-1">
                <UTooltip :text="props.track.title">
                  <ULink :to="`/track/${props.track.id}`"
                    class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted" :class="{
                      'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': player.isPlayingTrack(props.track)
                      , 'bg-default/80 p-0.5': visual
                    }">
                    {{ props.track.title }}
                  </ULink>
                </UTooltip>
                <UTooltip :text="getArtist(props.track)">
                  <ULink :to="`/user/${props.track.user_id}`"
                    class="truncate text-sm text-muted cursor-pointer max-w-full inline-block" :class="{
                      'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': player.isPlayingTrack(props.track)
                      , 'bg-default/80 p-0.5': visual
                    }">
                    {{ getArtist(props.track) }}
                  </ULink>
                </UTooltip>
              </div>

              <span class="text-muted" :class="{ 'bg-default/80 p-0.5': visual }">
                {{ formatMillis(track.full_duration) }}
              </span>
            </div>

            <!-- Waveform Area -->
            <Waveform class="flex-1" :track="props.track"></Waveform>

            <!-- Original Action Bar Placeholder (Empty in Twitter style to prioritize bottom actions) -->
            <div class="bg-muted rounded-sm h-6 opacity-0 hidden"></div>
          </div>
        </div>

        <!-- Action Bar (Small, spaced out icons, primary color emphasis) -->
        <div class="flex items-center justify-between max-w-md text-neutral-500 dark:text-neutral-400">

          <!-- Comments -->
          <UButton icon="i-mingcute-comment-line" color="neutral" variant="ghost" size="sm" class="hover:text-primary"
            @click=";/* TODO: Comment Track */">
            {{ formatViews(track.comment_count ?? 0) }}
          </UButton>

          <!-- Reposts (Primary/Green accent) -->
          <UButton :icon="user.isRepostedTrack(track.id) ? 'i-mingcute-share-3-fill' : 'i-mingcute-share-3-line'"
            :color="user.isRepostedTrack(track.id) ? 'primary' : 'neutral'" variant="ghost" size="sm"
            class="hover:text-primary" :label="track.reposts_count.toString()"
            @click="user.toggleRepostTrack(track.id)" />

          <!-- Likes (Red/Primary accent) -->
          <UButton :icon="user.isLikedTrack(track.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
            :color="user.isLikedTrack(track.id) ? 'primary' : 'neutral'" variant="ghost" size="sm"
            class="hover:text-primary" :label="track.likes_count ? track.likes_count.toString() : '0'"
            @click="user.toggleLikeTrack(track.id)" />

          <!-- Plays (Hidden in standard Twitter view, but kept for variable use) -->
          <UButton disabled icon="i-mingcute-play-line" color="neutral" variant="ghost" size="sm"
            class="hover:text-primary opacity-50">
            {{ formatViews(track.playback_count ?? 0) }}
          </UButton>

          <!-- Share -->
          <UButton icon="i-mingcute-share-2-line" color="neutral" variant="ghost" size="sm" class="hover:text-primary"
            @click=";/* TODO: Share Track */" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const formatViews = (views: number): string => {
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + "K"
  }
  return views.toString()
}

import { formatMillis, getArtist, getBestVisual, getCoverUrl, replaceImageUrl } from "@/utils/utils"
import { StreamItem, Track } from "@/utils/types"
import { useUserStore } from "@/systems/stores/user"
import { usePlayerStore } from "@/systems/stores/player"
import { formatFromNow } from "@/utils/utils"

const props = defineProps<{
  track: Track
  streamItem?: StreamItem
}>()

const user = useUserStore()
const player = usePlayerStore()
const visual = getBestVisual(props.track)
</script>

<style scoped>
/* 限制链接点击区域只包含文字内容 */
:deep(a) {
  display: inline;
  width: fit-content;
  max-width: 100%;
}
</style>