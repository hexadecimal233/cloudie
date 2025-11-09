<template>
    <div ref="parentRef" class="overflow-auto">
        <div :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
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
import { ref, computed, defineExpose } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'


interface VirtualListProps<T> {
    items: T[],
    estimateSize: (index: number) => number,
}

const props = defineProps<VirtualListProps<any>>()

const parentRef = ref<HTMLElement | null>(null)

const rowVirtualizer = useVirtualizer({
    count: props.items.length,
    getScrollElement: () => parentRef.value,
    estimateSize: props.estimateSize,
    overscan: 10,
})

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

function goToIndex(index: number) {
    rowVirtualizer.value.scrollToIndex(index, { align: 'center' })
}

defineExpose({ goToIndex })
</script>