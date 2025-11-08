<template>
  <VueFinalModal class="flex items-center justify-center" overlay-transition="vfm-fade" content-transition="vfm-fade"
    content-class="max-w-4xl modal-box opacity-100 max-h-[80vh] overflow-y-auto">

    <div> TODO: This UI still very poor and wip</div>
    <div class="mb-2 flex items-center gap-2">
      <button class="btn btn-primary" @click="removeSelected">
        {{ $t("cloudie.player.removeSelected") }}
      </button>
      <span>{{ $t("cloudie.trackList.selected", { count: selectedIdxs.length }) }}</span>
      <input type="checkbox" class="checkbox" @change="selectAll"
        :checked="selectedIdxs.length === listeningList.length && listeningList.length > 0" />
    </div>

    <div class="flex flex-col">
      <div v-for="(track, index) in listeningList" :key="index" class="flex items-center gap-2">
        <input type="checkbox" class="checkbox" v-model="selectedIdxs" :value="index" />
        <MiniTrack :track="track" :listening-index="index">
        </MiniTrack>
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
import { VueFinalModal } from "vue-final-modal"
import MiniTrack from "./mini/MiniTrack.vue"

const emit = defineEmits<{
  (e: "close"): void
}>()

const selectedIdxs = ref<number[]>([])

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
