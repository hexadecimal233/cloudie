<template>
  <!-- FIXME: page changes doesnt active re-renderer and they are not unmounting-->
  <div ref="parentRef" class="overflow-auto">
    <div
      ref="scrollContainer"
      :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
      <div
        class="absolute w-full top-0 left-0"
        :style="{
          transform: `translateY(${virtualRows[0]?.start - rowVirtualizer.options.scrollMargin}px)`,
        }">
        <div
          v-for="virtualRow in virtualRows"
          :data-index="virtualRow.index"
          :key="virtualRow.index"
          :ref="estimateSize === defaultEstimateSize ? undefined : measureElement"
          class="w-full h-full">
          <slot name="item" :item="items[virtualRow.index]" :index="virtualRow.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useVirtualizer } from "@tanstack/vue-virtual"

const props = defineProps<{
  items: any[]
  estimateSize?: (index: number) => number
}>()

const parentRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const defaultEstimateSize = (index: number) => 50

const rowVirtualizer = useVirtualizer(
  computed(() => {
    return {
      count: props.items.length, // this should be reactive
      getScrollElement: () => parentRef.value,
      estimateSize: props.estimateSize || defaultEstimateSize, // 提供默认值
      overscan: 5,
    }
  }),
)

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

const measureElement = (el: any) => {
  if (!el) {
    return
  }

  rowVirtualizer.value.measureElement(el)

  return undefined
}

function goToIndex(index: number) {
  rowVirtualizer.value.scrollToIndex(index, { align: "center" })
}

defineExpose({ goToIndex, scrollContainer })
</script>
