<template>
  <div class="flex flex-col gap-6">
    <template v-if="track.commentable && track.comment_count">
      <div class="flex items-end gap-3 p-4">
        <UAvatar :src="useUserStore().avatar_url" size="md" />
        <UTextarea class="flex-1" v-model="myComment" autoresize :placeholder="$t('cloudie.comment.placeholder')" />
        <UButton icon="i-mingcute-send-line" @click="postComment" :disabled="!myComment || myComment.trim() === ''">
          {{ i18n.global.t("cloudie.comment.post") }}
        </UButton>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="text-highlighted text-lg font-bold">{{ track.comment_count }} comments</div>
        <div class="flex-1"></div>
        <span>{{ i18n.global.t("cloudie.comment.sortBy") }}</span>
        <USelect v-model="sort" :items="sortTypes" />
      </div>
      
      <div class="flex flex-col gap-2">
        <div v-for="comment in currentPageComments" :key="comment.id" class="flex gap-3 transition-all duration-300"
          :class="{ 'ml-10': isReply(comment) }">
          <UAvatar class="flex-shrink-0 mt-1" :src="comment.user.avatar_url" size="md" />

          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center text-sm mb-1">
              <span class="font-semibold text-gray-900 dark:text-white mr-2">{{ comment.user.username }}</span>

              <UButton variant="link" size="sm" class="font-bold text-primary p-0 cursor-pointer"
                @click="player.playAtPosition(track, comment.timestamp / 1000)">
                {{ formatMillis(comment.timestamp) }}
              </UButton>

              <span class="text-muted mx-1">·</span>

              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatFromNow(comment.created_at) }}
              </span>
            </div>

            <RichText :content="comment.body" class="text-base text-gray-700 dark:text-gray-300 mb-2" />

            <div class="text-sm text-gray-500 dark:text-gray-400">
              <span>{{ "TODO: Likes" }}</span>
            </div>
          </div>
        </div>
      </div>


      <div class="flex justify-center mt-6">
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="track.comment_count" />
      </div>

    </template>
    <div v-else>
      <UAlert color="warning" title="Comments are disabled for this track" icon="i-mingcute-warning-line" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { i18n } from "@/systems/i18n"
import { usePlayerStore } from "@/systems/stores/player"
import { useUserStore } from "@/systems/stores/user"
import { useTrackComments } from "@/utils/api"
import { Comment, Track } from "@/utils/types"
import { formatFromNow, formatMillis } from "@/utils/utils"
import { computed, ref, watch } from "vue"

const props = defineProps<{
  track: Track
}>()

const sortTypes = computed(() => [
  {
    label: i18n.global.t("cloudie.comment.sort.newest"),
    value: "newest",
  },
  {
    label: i18n.global.t("cloudie.comment.sort.oldest"),
    value: "oldest",
  },
  {
    label: i18n.global.t("cloudie.comment.sort.trackTimestamp"),
    value: "track-timestamp",
  },
])
const sort = ref<"newest" | "oldest" | "track-timestamp">("newest")
const page = ref(1)
const myComment = ref("") // TODO: POST/DELETE to send commands
const player = usePlayerStore()

function isReply(comment: Comment) {
  const findIndex = data.value.indexOf(comment)
  if (findIndex === 0) {
    return false
  }

  const previousComment = data.value[findIndex - 1]

  if (comment.timestamp === previousComment.timestamp) {
    return true
  }
}

const { data, loading, error, hasNext, pageSize, fetchTillPage, reset } = useTrackComments(
  props.track.id,
  true,
  sort.value,
)

function getSafeDuration(timestamp: number) {
  const existingTimestamps = data.value.map((comment) => comment.timestamp)

  let safeTimestamp = timestamp
  while (existingTimestamps.includes(safeTimestamp)) {
    safeTimestamp += 1
  }

  return safeTimestamp
}

function postComment() {
  let duration = Math.floor(props.track.full_duration * Math.random())
  if (player.isPlayingTrack(props.track)) {
    duration = player.currentTime * 1000 // from millis
  }

  duration = getSafeDuration(duration)

  if (!myComment.value) {
    return
  }
}

const currentPageComments = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = page.value * pageSize.value
  // 从已加载的所有评论中截取当前页的数据
  return data.value.slice(start, Math.min(end, data.value.length)) || []
})

watch(
  page,
  (newPage) => {
    if (!props.track.commentable) {
      return
    }

    if (hasNext.value && !loading.value) {
      fetchTillPage(newPage)
    }
  },
  { immediate: true },
)

watch(sort, () => {
  page.value = 1

  reset({ sort: sort.value })
  fetchTillPage(1)
})
</script>