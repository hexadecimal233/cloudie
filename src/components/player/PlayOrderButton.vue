<template>
  <UTooltip :text="$t(`cloudie.player.${player.playOrder}`)">
    <UButton size="xl" :icon="getIcon(player.playOrder)" class="rounded-full cursor-pointer" variant="soft" @click="toggleOrder" />
  </UTooltip>
</template>

<script setup lang="ts">
import { PlayOrder, usePlayerStore } from "@/systems/stores/player"

const player = usePlayerStore()

const cycle: PlayOrder[] = [
  PlayOrder.OrderedNoRepeat,
  PlayOrder.Ordered,
  PlayOrder.SingleRepeat,
  PlayOrder.Shuffle,
]

function getIcon(order: PlayOrder) {
  switch (order) {
    case PlayOrder.OrderedNoRepeat:
      return "i-mingcute-large-arrow-right-fill"
    case PlayOrder.Ordered:
      return "i-mingcute-repeat-line"
    case PlayOrder.SingleRepeat:
      return "i-mingcute-repeat-one-line"
    case PlayOrder.Shuffle:
      return "i-mingcute-shuffle-line"
  }
}

const toggleOrder = () => {
  const currentOrder = player.playOrder

  const currentIndex = cycle.indexOf(currentOrder)

  if (currentIndex === -1) {
    player.playOrder = cycle[0]
    return
  }

  const nextIndex = (currentIndex + 1) % cycle.length

  player.playOrder = cycle[nextIndex]
}
</script>
