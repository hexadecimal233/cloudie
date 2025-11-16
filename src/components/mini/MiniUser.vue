<template>
  <div
    class="flex items-center gap-3 p-2 rounded-lg hover:bg-accented/50 transition-colors min-w-0 w-full h-18">
    <img
      :src="replaceImageUrl(props.user.avatar_url)"
      :alt="props.user.username"
      class="size-14 rounded-full object-cover shrink-0" />
    <div class="flex flex-col min-w-0 flex-1">
      <UTooltip :text="props.user.username">
        <ULink
          :to="`/user/${props.user.id}`"
          class="truncate font-bold cursor-pointer max-w-full inline-block text-highlighted items-center gap-1">
          {{ props.user.username }}
          <span v-if="props.user.verified" class="badge badge-info badge-xs">✓</span>
        </ULink>
      </UTooltip>
      <UTooltip :text="props.user.full_name || props.user.username">
        <p class="truncate text-sm text-muted">{{ props.user.full_name || props.user.username }}</p>
      </UTooltip>
      <div class="flex items-center gap-3 text-xs text-muted">
        <span
          >{{ props.user.followers_count }}
          {{ $t("skye.user.followers") }}</span
        >
        <span>•</span>
        <span
          >{{ props.user.track_count }}
          {{ $t("skye.user.tracks") }}</span
        >
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        variant="ghost"
        :icon="user.followingIds.includes(props.user.id) ? 'i-mingcute-user-follow-fill' : 'i-mingcute-user-follow-line'"
        :color="user.followingIds.includes(props.user.id) ? 'primary' : 'neutral'"
        @click="user.toggleFollowUser(props.user.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { replaceImageUrl } from "@/utils/utils"
import { SCUser } from "@/utils/types"
import { useUserStore } from "@/systems/stores/user"

const user = useUserStore()

const props = defineProps<{
  user: SCUser
}>()
</script>
