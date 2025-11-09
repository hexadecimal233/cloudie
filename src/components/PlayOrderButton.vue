<template>
  <UTooltip :text="$t(`cloudie.player.${config.playOrder}`)">
    <UButton size="xl" :icon="getIcon(config.playOrder)" class="rounded-full" variant="soft" @click="toggleOrder" />
  </UTooltip>
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

function getIcon(order: PlayOrder) {
  switch (order) {
    case PlayOrder.OrderedNoRepeat:
      return "i-mdi-forward"
    case PlayOrder.Ordered:
      return "i-mdi-repeat"
    case PlayOrder.SingleRepeat:
      return "i-mdi-repeat-once"
    case PlayOrder.Shuffle:
      return "i-mdi-shuffle"
  }
}

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
