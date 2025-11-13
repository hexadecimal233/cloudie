<template>
  <div class="h-[500px] w-[500px] bg-amber-50 overflow-hidden">
    <OverlayScrollbarsComponent ref="scrollbarsRef" defer>
      <UContainer class="flex-col flex h-full">
        <div class="my-2 text-2xl font-bold">
          abcde
        </div>

        <div class="flex-1 h-full overflow-hidden">
          <div class="flex flex-col h-full">
            nonrelated elements 1 <br>
            nonrelated elements 2 <br>
            nonrelated elements 3 <br>
            nonrelated elements 4 <br>
            nonrelated elements 1 <br>
            nonrelated elements 2 <br>
            nonrelated elements 3 <br>
            <VirtualList class="flex-1" :items="fakeData(1000)" :estimateSize="(index) => 50">
              <template #item="{ item, index }">
                <div class="h-[50px] text-amber-500 border-b border-amber-200">
                  {{ getText(index, item) }}
                </div>
              </template>
            </VirtualList>
          </div>
        </div>
      </UContainer>
    </OverlayScrollbarsComponent>
  </div>
</template>

<script setup lang="ts" name="FeedsView">
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue"

function getText(index: number, item: string) {
  console.log("im the", index)
  return item
}

function fakeData(count: number) {
  return Array.from({ length: count }, (_, index) => `item${index}`)
}
</script>

<style scoped></style>
