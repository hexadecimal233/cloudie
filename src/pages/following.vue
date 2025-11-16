<template>
  <div>
      <div class="alert alert-warning">TODO: This is still a demo, translations and content experience might be bad</div>
  <div v-if="loading" class="flex justify-center items-center py-8">
    <div class="loading loading-spinner loading-lg"></div>
    <span class="ml-2">{{ $t("skye.common.loading") }}</span>
  </div>

  <div v-else-if="error" class="alert alert-error">
    <span>{{ $t("skye.common.loadFail") }}: {{ error }}</span>
  </div>

  <div v-else-if="followings.length === 0" class="text-center py-8">
    <p>{{ $t("skye.common.empty") }}</p>
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div v-for="user in followings" :key="user.id"
      class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      @click="$router.push(`/user/${user.id}`)">
      <div class="card-body p-4">
        <div class="flex items-center space-x-4">
          <div class="avatar">
            <div class="w-16 h-16 rounded-full">
              <img :src="user.avatar_url || 'https://picsum.photos/seed/default-avatar/200/200.jpg'"
                :alt="user.username" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="card-title text-lg truncate">
              {{ user.username }}
              <span v-if="user.verified" class="badge badge-info badge-sm">✓</span>
            </h3>
            <p class="text-sm text-gray-500 truncate">
              {{ user.full_name || user.username }}
            </p>
            <div class="flex space-x-2 mt-1 text-xs text-gray-400">
              <span>{{ $t("skye.following.followers", { count: user.followers_count }) }}</span>
              <span>•</span>
              <span>{{ $t("skye.following.tracks", { count: user.track_count }) }}</span>
            </div>
          </div>
        </div>
        <div v-if="user.description" class="mt-2">
          <p class="text-sm line-clamp-2">{{ user.description }}</p>
        </div>
      </div>
    </div>
  </div>

  <div v-if="hasNext && !loading" class="flex justify-center mt-6">
    <button class="btn btn-primary" @click="fetchNext">
      {{ $t("skye.common.loadMore") }}
    </button>
  </div>
  </div>
</template>

<script setup lang="ts" name="FollowingView">
import { onMounted } from "vue"
import { useFollowings } from "@/utils/api"
import { useUserStore } from "@/systems/stores/user"

const userInfo = useUserStore()
const { data: followings, loading, error, hasNext, fetchNext } = useFollowings(userInfo.id)

onMounted(async () => {
  await fetchNext()
})
</script>