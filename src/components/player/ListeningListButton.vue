<template>
  <UDrawer v-model:open="open" :overlay="false" direction="right" handle-only>
    <UButton size="xl" class="rounded-full cursor-pointer" icon="i-mingcute-playlist-line" variant="soft" />

    <template #content>
      <div class="flex flex-col gap-3 w-md overflow-y-auto p-3">
        <span class="text-xl font-bold">{{ $t("skye.player.listening") }}</span>

        <div class="flex items-center gap-2">
          <UCheckbox @change="selectAll"
            :checked="selectedIdxs.length === listeningList.length && listeningList.length > 0" />
          <UButton label="removeSelected" @click="removeSelected">
            {{ $t("skye.player.removeSelected") }}
          </UButton>
          <span>{{ $t("skye.trackList.selected", { count: selectedIdxs.length }) }}</span>

          <div class="flex-1"></div>

          <UButton icon="i-mingcute-close-line" size="xl" variant="ghost" @click="open = false" />
        </div>



        <!-- Specify W so that the virtual list can display correctly -->
        <VirtualList ref="virtualListRef" :items="listeningList" :estimateSize="() => 80" class="w-full flex-1">
          <template #item="{ item, index }">
            <div class="flex items-center gap-2 pr-1">
              <UCheckbox class="checkbox" :model-value="selectedIdxs.includes(index)" @update:model-value="(val) => {
                if (val) {
                  selectedIdxs.push(index)
                } else {
                  selectedIdxs = selectedIdxs.filter((i) => i !== index)
                }
              }" :value="index" />
              <MiniTrack :track="item" :listening-index="index" />
            </div>
          </template>
        </VirtualList>

        <!-- 空状态 -->
        <div v-if="listeningList.length === 0" class="py-8 text-center">
          <div class="mb-2 text-lg">
            {{ $t("skye.common.empty") }}
          </div>
          <div class="text-base-content/70 text-sm">
            {{ $t("skye.common.emptyDesc") }}
          </div>
        </div>
      </div>
    </template>
  </UDrawer>
</template>

<script setup lang="ts" name="ListeningView">
import { removeMultipleSongs, listeningList } from "@/systems/player/listening-list"
import { ref, watch, nextTick } from "vue"
import { usePlayerStore } from "@/systems/stores/player"

const open = ref(false)
const selectedIdxs = ref<number[]>([])
const virtualListRef = ref<InstanceType<typeof VirtualList> | null>(null)

// 监听抽屉打开状态，当打开时滚动到当前播放曲目
watch(open, async (isOpen) => {
  if (isOpen && listeningList.value.length > 0) {
    await nextTick()
    // 确保当前播放索引在有效范围内
    const currentIndex = Math.max(
      0,
      Math.min(usePlayerStore().listenIndex, listeningList.value.length - 1),
    )

    // 使用 VirtualList 的 scrollToIndex 方法滚动到当前播放项
    if (virtualListRef.value && currentIndex >= 0) {
      virtualListRef.value.goToIndex(currentIndex)
    }
  }
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
