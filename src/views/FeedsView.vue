<template>
  <div class="h-[500px] w-[500px] bg-amber-50">
    <OverlayScrollbarsComponent ref="scrollbarsRef" defer class="h-full">
      <UContainer class="flex flex-col h-full">
        <div class="flex flex-col h-full">
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          nonrelated elements 2 <br>
          nonrelated elements 3 <br>
          nonrelated elements 4 <br>
          nonrelated elements 1 <br>
          <VirtualList class="flex-1" :items="fakeData(1000)" :estimateSize="(index) => 50">
            <template #item="{ item, index }">
              <div class="h-[50px] text-amber-500 border-b border-amber-200">
                {{ getText(index, item) }}
              </div>
            </template>
          </VirtualList>
        </div>
      </UContainer>
    </OverlayScrollbarsComponent>
  </div>
</template>

<script setup lang="ts" name="FeedsView">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue';

function getText(index: number, item: string) {
  console.log("im the", index);
  return item;
}

function fakeData(count: number) {
  return Array.from({ length: count }, (_, index) => `item${index}`);
}
</script>

<style scoped></style>
