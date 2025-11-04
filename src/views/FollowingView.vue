<template>
    <div class="alert alert-warning">TODO: This is still a demo, translations and content experience might be bad</div>
    <div v-if="loading" class="flex justify-center items-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
      <span class="ml-2">{{ $t("cloudie.common.loading") }}</span>
    </div>

    <div v-else-if="error" class="alert alert-error">
      <span>{{ $t("cloudie.common.loadFail") }}: {{ error }}</span>
    </div>

    <div v-else-if="followings.length === 0" class="text-center py-8">
      <p>{{ $t("cloudie.common.empty") }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="user in followings" 
        :key="user.id" 
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
        @click="openUserModal(user)"
      >
        <div class="card-body p-4">
          <div class="flex items-center space-x-4">
            <div class="avatar">
              <div class="w-16 h-16 rounded-full">
                <img 
                  :src="user.avatar_url || 'https://picsum.photos/seed/default-avatar/200/200.jpg'" 
                  :alt="user.username"
                  class="w-full h-full object-cover"
                />
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
                <span>{{ user.followers_count }} {{ $t("cloudie.following.followers") }}</span>
                <span>•</span>
                <span>{{ user.track_count }} {{ $t("cloudie.following.tracks") }}</span>
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
        {{ $t("cloudie.common.loadMore") }}
      </button>
    </div>
</template>

<script setup lang="ts" name="FollowingView">
import { onMounted } from "vue"
import { useFollowings, userInfo } from "@/utils/api"
import { SCUser } from "@/utils/types"
import UserModal from "@/components/modals/UserModal.vue"
import { useModal } from "vue-final-modal"

const { data: followings, loading, error, hasNext, fetchNext } = useFollowings(userInfo.value.id)

const openUserModal = (user: SCUser) => {
  const { open, close } = useModal({
    component: UserModal,
    attrs: {
      user,
      onClose() {
        close()
      },
    },
  })

  open()
}

onMounted(async () => {
  await fetchNext()
})
</script>