<template>
  <div v-bind="containerProps" :style="{height: `${props.containerHeight}px`}">
    <div v-bind="wrapperProps">
      <slot name="container">
        <slot :item="item.data" :index="item.index" v-for="item in list" :key="item.index" :style="{ height: `${props.itemHeight}px` }">
        </slot>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVirtualList } from "@vueuse/core"

interface Props<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
}

const props = defineProps<Props<any>>()

const { list, containerProps, wrapperProps } = useVirtualList(props.items, {
  itemHeight: props.itemHeight,
})
</script>