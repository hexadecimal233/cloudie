<template>
  <div class="flex items-center gap-3">
    <div class="relative size-14 flex-shrink-0 ">
      <div v-if="!hidePlay" @click="playTrack"
        class="absolute inset-0 size-full flex items-center justify-center opacity-0 hover:opacity-60 bg-black rounded-sm transition-opacity cursor-pointer">
        <i-mdi-play class="text-2xl text-white" />
      </div>
      <img :src="getCoverUrl(props.track)" :alt="props.track.title" class="size-14 rounded-sm object-cover" />
    </div>
    <div class="flex flex-col min-w-0 flex-1">
      <UTooltip :text="props.track.title">
        <ULink :to="`/track/${props.track.id}`"
          class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted"
          :class="{ 'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': isListening }">
          {{ props.track.title }}
        </ULink>
      </UTooltip>
      <UTooltip :text="getArtist(props.track)">
        <ULink :to="`/user/${props.track.user_id}`" class="truncate text-sm text-muted cursor-pointer max-w-full inline-block"
          :class="{ 'text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-500': isListening }">
          {{ getArtist(props.track) }}
        </ULink>
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Track } from "@/utils/types"
import { getArtist, getCoverUrl } from "@/utils/utils"
import { usePlayerStore } from "@/systems/stores/player"
import { computed } from "vue"

const player = usePlayerStore()
const isListening = computed(
  () => !props.hidePlay && player.track !== undefined && player.track.id === props.track.id,
)

const props = defineProps<{
  track: Track
  tracks?: Track[]
  listeningIndex?: number
  hidePlay?: boolean
}>()
const playerStore = usePlayerStore()

function playTrack() {
  if (props.listeningIndex !== undefined) {
    playerStore.playIndex(props.listeningIndex) // in listening list
  } else if (props.tracks !== undefined) {
    playerStore.play(props.track, props.tracks)
  } else {
    playerStore.play(props.track, [props.track])
  }
}
</script>

<style scoped>
.play-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 限制链接点击区域只包含文字内容 */
:deep(a) {
  display: inline;
  width: fit-content;
  max-width: 100%;
}
</style>
