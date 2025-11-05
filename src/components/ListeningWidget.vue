<template>
  <div> TODO: This UI still very poor and wip</div>
  <VueFinalModal
    class="flex items-center justify-center"
    overlay-transition="vfm-fade"
    content-transition="vfm-fade"
    content-class="max-w-4xl modal-box opacity-100 max-h-[80vh] overflow-y-auto"
  >
    <div class="mb-2 flex items-center gap-2">
      <button class="btn btn-primary" @click="removeSelected">
        {{ $t("cloudie.player.removeSelected") }}
      </button>
      <span>{{ $t("cloudie.trackList.selected", { count: selectedIdxs.length }) }}</span>
    </div>

    <div class="flex flex-col">
      <table class="table w-full table-fixed">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                class="checkbox"
                @change="selectAll"
                :checked="selectedIdxs.length === listeningList.length && listeningList.length > 0" />
            </th>
            <th>#</th>
            <th>{{ $t("cloudie.trackList.song") }}</th>
            <th>{{ $t("cloudie.trackList.duration") }}</th>
            <th></th>
          </tr>
        </thead>
      </table>
      
      <!-- 虚拟滚动容器 -->
      <div v-bind="containerProps" class="relative overflow-auto" :style="{ height: '400px' }">
        <div v-bind="wrapperProps" class="relative w-full">
          <table class="table w-full table-fixed">
            <tbody>
              <tr
                v-for="{ data: item, index } in list"
                :key="item.id"
                class="transition-opacity hover:opacity-70"
                :style="{ height: `${ITEM_HEIGHT}px` }">
                <td>
                  <input type="checkbox" class="checkbox" v-model="selectedIdxs" :value="listeningList.indexOf(item)" />
                </td>

                <td>{{ listeningList.indexOf(item) + 1 }}</td>

                <td>
                  <div class="flex gap-2">
                    <!-- TODO: add loading skeleton -->
                    <img :src="getCoverUrl(item)" alt="cover" class="size-16 rounded-md object-contain" />

                    <div class="flex w-full flex-col justify-center">
                      <div class="truncate font-bold">
                        {{ item.title }}
                      </div>

                      <div class="text-base-content/70 truncate text-sm">
                        {{ getArtist(item) }}
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  {{ formatMillis(item.full_duration) }}
                </td>

                <td>
                  <div class="flex justify-center">
                    <button class="btn btn-ghost btn-sm" @click="removeSongs([listeningList.indexOf(item)])">
                      <i-mdi-close />
                    </button>
                    <a class="btn btn-ghost btn-sm" :href="item.permalink_url" target="_blank">
                      <i-mdi-open-in-new />
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="listeningList.length === 0" class="py-8 text-center">
        <div class="mb-2 text-lg">
          {{ $t("cloudie.common.empty") }}
        </div>
        <div class="text-base-content/70 text-sm">
          {{ $t("cloudie.common.emptyDesc") }}
        </div>
      </div>
    </div>
    
    <div class="modal-action">
      <button class="btn" @click="emit('close')">{{ $t("cloudie.toasts.close") }}</button>
    </div>
  </VueFinalModal>
</template>

<script setup lang="ts" name="ListeningView">
import { removeMultipleSongs, listeningList } from "@/systems/player/listening-list"
import { ref } from "vue"
import { formatMillis, getArtist, getCoverUrl } from "@/utils/utils"
import { VueFinalModal } from "vue-final-modal"
import { useVirtualList } from "@vueuse/core"

const emit = defineEmits<{
  (e: "close"): void
}>()

const selectedIdxs = ref<number[]>([])

const ITEM_HEIGHT = 80 // 估算行高

const { list, containerProps, wrapperProps } = useVirtualList(listeningList, {
  itemHeight: ITEM_HEIGHT,
  overscan: 10, // 可选：多渲染一些项目以提高用户体验
})

function selectAll() {
  if (selectedIdxs.value.length === listeningList.value.length && listeningList.value.length > 0) {
    selectedIdxs.value = []
  } else {
    selectedIdxs.value = listeningList.value.map((_item, index) => index)
  }
}

async function removeSongs(idxs: number[]) {
  try {
    await removeMultipleSongs(idxs)
    selectedIdxs.value = []
  } catch (error) {
    console.error(error)
  }
}

async function removeSelected() {
  removeSongs(selectedIdxs.value)
  selectedIdxs.value = []
}
</script>

<style scoped>
th:nth-child(1),
td:nth-child(1) {
  width: 4rem;
} /* 复选框列 */

th:nth-child(2),
td:nth-child(2) {
  width: 3rem;
} /* 序号列 */

th:nth-child(3),
td:nth-child(3) {
  width: auto; /* 允许标题列自适应 */
}

th:nth-child(4),
td:nth-child(4) {
  width: 6rem;
} /* 时长列 */

th:nth-child(5),
td:nth-child(5) {
  width: 8rem;
} /* 操作列 */

/* 确保虚拟列表的容器和表格样式正确 */
.virtual-list-container {
  position: relative;
  overflow: auto;
}

.virtual-list-wrapper {
  position: relative;
  width: 100%;
}

/* 确保表格行高匹配 ITEM_HEIGHT */
.virtual-list-container tbody tr {
  height: 80px;
}
</style>
