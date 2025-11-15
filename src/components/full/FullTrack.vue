<template>
 <div class="bg-default border-t border-accented max-w-3xl mx-auto">
  <div class="flex flex-col gap-3">
    <div v-if="streamItem" class="flex items-center gap-2 text-muted">
      <UAvatar :src="streamItem.user.avatar_url" class="size-8" />
      <ULink :to="`/user/${streamItem.user.id}`" class="text-lg font-bold text-highlighted truncate">
        {{ streamItem.user.username }}
      </ULink>
      <i-mingcute-repeat-line v-if="streamItem.type === 'track-repost'" />
      {{ streamItem.type === 'track-repost' ? $t('cloudie.full.track.reposted', { time: formatFromNow(streamItem.created_at) }) : $t('cloudie.full.track.posted', { time: formatFromNow(streamItem.created_at) }) }}
    </div>

    <RichText v-if="streamItem?.caption" :content="streamItem.caption" class="text-sm line-clamp-1" />

    <div class="flex items-start gap-3">
      <div class="relative size-28 flex-shrink-0">
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
          class="size-28 rounded-sm object-cover" />
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-2 h-28 bg-cover bg-fixed rounded-sm bg-center px-4 pt-2"
        :style="{ backgroundImage: `url('${visual}')` }">
        <div class="flex min-w-0 items-start justify-between">
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
      </div>
    </div>

    <div class="flex max-w-xl items-center gap-3 ml-32">
          <UButton :icon="user.isLikedTrack(track.id) ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
            :color="user.isLikedTrack(track.id) ? 'primary' : 'neutral'" variant="soft"
            :label="track.likes_count ? track.likes_count.toString() : '0'" @click="user.toggleLikeTrack(track.id)" />
          <UButton :icon="user.isRepostedTrack(track.id) ? 'i-mingcute-share-3-fill' : 'i-mingcute-share-3-line'"
            :color="user.isRepostedTrack(track.id) ? 'primary' : 'neutral'" variant="soft"
            :label="track.reposts_count.toString()" @click="user.toggleRepostTrack(track.id)" />
          <UButton icon="i-mingcute-comment-line" color="neutral" variant="soft"
            @click=";/* TODO: Comment Track */" > 
            {{ formatViews(track.comment_count ?? 0) }}
          </UButton>
          <UButton icon="i-mingcute-play-line" color="neutral" variant="soft">
            {{formatViews(track.playback_count ?? 0) }} </UButton>
          <UButton icon="i-mingcute-share-2-line" color="neutral" variant="soft"
            @click=";/* TODO: Share Track */" />
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