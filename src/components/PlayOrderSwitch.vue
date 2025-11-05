<template>
  <div class="tooltip" :data-tip="$t(`cloudie.player.${config.playOrder}`)">
    <button class="btn btn-circle btn-ghost" @click="toggleOrder">
      <i-mdi-forward v-if="config.playOrder === PlayOrder.OrderedNoRepeat" />
      <i-mdi-repeat v-else-if="config.playOrder === PlayOrder.Ordered" />
      <i-mdi-repeat-once v-else-if="config.playOrder === PlayOrder.SingleRepeat" />
      <i-mdi-shuffle v-else />
    </button>
  </div>
</template>

<script setup lang="ts">
import { config } from "@/systems/config"
import { PlayOrder } from "@/systems/player/listening-list"

const cycle: PlayOrder[] = [
  PlayOrder.OrderedNoRepeat,
  PlayOrder.Ordered,
  PlayOrder.SingleRepeat,
  PlayOrder.Shuffle,
]

const toggleOrder = () => {
  const currentOrder = config.value.playOrder as PlayOrder

  const currentIndex = cycle.indexOf(currentOrder)

  if (currentIndex === -1) {
    config.value.playOrder = cycle[0]
    return
  }

  const nextIndex = (currentIndex + 1) % cycle.length

  config.value.playOrder = cycle[nextIndex]
}
</script>
