<template>
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
      <tbody>
        <tr
          v-for="(item, index) in listeningList"
          :key="item.id"
          class="transition-opacity hover:opacity-70">
          <td>
            <input type="checkbox" class="checkbox" v-model="selectedIdxs" :value="index" />
          </td>

          <td>{{ index + 1 }}</td>

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
              <button class="btn btn-ghost btn-sm" @click="removeSong(index)">
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
</template>

<script setup lang="ts">
import { removeMultipleSongs, listeningList, removeSong } from "@/systems/player/playlist"

import { ref } from "vue"
import { formatMillis, getArtist, getCoverUrl } from "@/utils/utils"

const selectedIdxs = ref<number[]>([])

function selectAll() {
  if (selectedIdxs.value.length === listeningList.value.length && listeningList.value.length > 0) {
    selectedIdxs.value = []
  } else {
    selectedIdxs.value = listeningList.value.map((item, index) => index)
  }
}

async function removeSelected() {
  try {
    await removeMultipleSongs(selectedIdxs.value)
    selectedIdxs.value = []
  } catch (error) {
    console.error("Error removing selected songs:", error)
  }
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
  width: 70%;
} /* 标题列  */

th:nth-child(5),
td:nth-child(5) {
  width: 6rem;
} /* 时长列 */

th:nth-child(7),
td:nth-child(7) {
  width: 8rem;
} /* 操作列 */
</style>
