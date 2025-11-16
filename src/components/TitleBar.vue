<template>
  <div class="w-full px-2 py-1 flex from-primary/5 to-secondary/5 z-10 bg-gradient-to-r"
    @mousedown="Window.getCurrent().startDragging()">
    <div class="flex items-center gap-2" @mousedown.stop @click.stop="clicksFunc()">
      <i-mingcute-moon-cloudy-line class="text-primary" />

      <span class="font-bold transition-none" :style="easterStyle" :class="{ 'text-primary': windowStates.isFocused }">
        Skye
      </span>
    </div>

    <div class="flex-1"></div>

    <div class="flex items-center gap-2" :class="{ 'opacity-50': !windowStates.isFocused }" @mousedown.stop>
      <UButton class="cursor-pointer" icon="i-mingcute-minimize-line" color="neutral" variant="link"
        @click="Window.getCurrent().minimize()" />
      <UButton class="cursor-pointer"
        :icon="windowStates.isMaximized ? 'i-mingcute-restore-line' : 'i-mingcute-rectangle-line'" color="neutral"
        variant="link" @click="Window.getCurrent().toggleMaximize()" />
      <UButton class="cursor-pointer hover:bg-error hover:text-inverted" icon="i-mingcute-close-line" color="neutral"
        variant="link" @click="Window.getCurrent().close()" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { Window } from "@tauri-apps/api/window"
import { ref, computed } from "vue"
import { useRouter } from "vue-router"

const clicksFunc = () => {
  easterClicks.value++
}

const easterClicks = ref(0)
const easterStyle = computed(() => {
  if (easterClicks.value === 5) {
    useRouter().push("/test")
    easterClicks.value = 0
    return { animation: "none" }
  }
})

const windowStates = ref({
  isFocused: false,
  isMaximized: false,
})

Window.getCurrent().onResized(async () => {
  windowStates.value.isMaximized = await Window.getCurrent().isMaximized()
})

Window.getCurrent().onFocusChanged(({ payload: focused }) => {
  windowStates.value.isFocused = focused
})
</script>