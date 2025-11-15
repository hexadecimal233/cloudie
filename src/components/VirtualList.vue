<template>
  <!-- FIXME: page changes doesnt active re-renderer -->
    <div ref="parentRef" class="overflow-auto">
      <span> {{`${totalSize} ${items.length} ${virtualRows.length}` }}</span>
        <div ref="scrollContainer" :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
            <div v-for="virtualRow in virtualRows" :key="virtualRow.index" class="absolute w-full top-0 left-0" :style="{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
            }">
                <slot class="w-full h-full" name="item" :item="items[virtualRow.index]" :index="virtualRow.index" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useVirtualizer } from "@tanstack/vue-virtual"

const props = defineProps<{
  items: any[]
  estimateSize: (index: number) => number
}>()

const parentRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)

const rowVirtualizer = useVirtualizer(
  computed(() => {
    return {
      count: props.items.length, // this should be reactive
      getScrollElement: () => parentRef.value,
      estimateSize: props.estimateSize,
      overscan: 5,
    }
  }),
)

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

function goToIndex(index: number) {
  rowVirtualizer.value.scrollToIndex(index, { align: "center" })
}

defineExpose({ goToIndex, scrollContainer })
</script>