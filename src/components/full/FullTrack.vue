<template>
  <div class="flex flex-col">
    <div v-if="streamItem" class="flex items-center gap-2 text-muted">
      <UAvatar :src="streamItem.user.avatar_url" class="size-8" />
      <ULink :to="`/user/${streamItem.user.id}`" class="text-lg font-bold text-highlighted truncate">
        {{ streamItem.user.username }}
      </ULink>
      <i-mingcute-repeat-line v-if="streamItem.type === 'track-repost'" />
      {{ streamItem.type === 'track-repost' ? 'Reposted' : 'Posted' }} a track {{ formatFromNow(streamItem.created_at)
      }}
    </div>

    <span v-if="streamItem" class="text-sm line-clamp-1">
      {{ streamItem.caption }}
    </span>

    <div class="flex items-start gap-3 p-3">
      <div class="relative size-36 flex-shrink-0">
        <div @click="() => {
          if (player.isPlayingTrack(props.track) && !player.isPaused) { player.pause() } else { player.play(props.track) }
        }
        "
          class="absolute inset-0 size-full flex items-center justify-center opacity-0 hover:opacity-60 bg-black rounded-sm transition-opacity cursor-pointer">
          <i-mingcute-pause-fill v-if="player.isPlayingTrack(props.track) && !player.isPaused"
            class="text-2xl text-white" />
          <i-mingcute-play-fill v-else class="text-2xl text-white" />
        </div>
        <img :src="replaceImageUrl(getCoverUrl(props.track))" :alt="props.track.title"
          class="size-36 rounded-sm object-cover" />
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-2 h-36 bg-cover bg-fixed rounded-sm bg-center px-4 pt-2"
        :style="{ backgroundImage: `url('${visual}')` }">
        <div class="flex min-w-0">
          <div class="flex flex-col min-w-0 flex-1 gap-1">
            <UTooltip :text="props.track.title">
              <ULink :to="`/track/${props.track.id}`"
                class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted"
                :class="{ 'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': player.isPlayingTrack(props.track)
                  , 'bg-default/80' : visual
                 }">
                {{ props.track.title }}
              </ULink>
            </UTooltip>
            <UTooltip :text="getArtist(props.track)">
              <ULink :to="`/user/${props.track.user_id}`"
                class="truncate text-sm text-muted cursor-pointer max-w-full inline-block" 
                :class="{ 'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': player.isPlayingTrack(props.track)
                  , 'bg-default/80' : visual
                 }">
                {{ getArtist(props.track) }}
              </ULink>
            </UTooltip>
          </div>

          <span class="text-sm" :class="{'bg-default/80': visual}">
            {{ formatMillis(track.full_duration) }} <!-- TODO: Time display -->
          </span>
        </div>

        <Waveform class="flex-1" :track="props.track"></Waveform>

        <div class="bg-muted rounded-sm">
          <div class="flex max-w-xl items-center justify-around gap-3 ">
          <UButton :icon="user.isLikedTrack(track.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
            :color="user.isLikedTrack(track.id) ? 'primary' : 'neutral'" variant="ghost"
            :label="track.likes_count ? track.likes_count.toString() : '0'" @click="user.toggleLikeTrack(track.id)" />
          <UButton :icon="user.isRepostedTrack(track.id) ? 'i-mingcute-share-3-fill' : 'i-mingcute-share-3-line'"
            :color="user.isRepostedTrack(track.id) ? 'primary' : 'neutral'" variant="ghost"
            :label="track.reposts_count.toString()" @click="user.toggleRepostTrack(track.id)" />
          <UButton icon="i-mingcute-share-2-line" color="neutral" variant="ghost"
            @click=";/* TODO: Share Track */" />
          <UButton icon="i-mingcute-comment-line" color="neutral" variant="ghost"
            @click=";/* TODO: Comment Track */" > 
            {{ formatViews(track.comment_count ?? 0) }}
            </UButton>
          <UButton disabled icon="i-mingcute-play-line" color="neutral" variant="ghost">
            {{formatViews(track.playback_count ?? 0) }} </UButton>
          </div>
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
import { formatFromNow } from "../../utils/utils"

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