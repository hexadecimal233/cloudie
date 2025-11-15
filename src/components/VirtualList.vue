<template>
  <!-- FIXME: page changes doesnt active re-renderer -->
    <div ref="parentRef" class="overflow-auto">
      <span> {{`${totalSize} ${items.length} ${virtualRows.length}` }}</span>
        <div ref="scrollContainer" :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
            <div v-for="virtualRow in virtualRows" :key="virtualRow.index" class="absolute w-full top-0 left-0" :style="{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
            }">
                <div :ref="measureElement" class="w-full h-full">
                    <slot name="item" :item="items[virtualRow.index]" :index="virtualRow.index" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, VNodeRef } from "vue"
import { useVirtualizer } from "@tanstack/vue-virtual"

const props = defineProps<{
  items: any[]
  estimateSize?: (index: number) => number
}>()

const parentRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)

const rowVirtualizer = useVirtualizer(
  computed(() => {
    return {
      count: props.items.length, // this should be reactive
      getScrollElement: () => parentRef.value,
      estimateSize: props.estimateSize || (() => 50), // 提供默认值
      overscan: 5,
    }
  }),
)

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

// FIXME: dynamic height not working
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