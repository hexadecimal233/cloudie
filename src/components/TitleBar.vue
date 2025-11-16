<template>
  <div class="w-full px-2 py-1 flex from-primary/5 to-secondary/5 z-10 bg-gradient-to-r"
    @mousedown="Window.getCurrent().startDragging()">
    <div class="flex items-center gap-2" @mousedown.stop @click.stop="clicksFunc()">
      <i-mingcute-moon-cloudy-line class="text-primary" />

      <span class="font-bold transition-none" :style="easterStyle"
        :class="{ 'text-primary': windowStates.isFocused && easterClicks === 0, 'spin-active': false }">
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
import { ref, computed } from "vue" // 引入 onMounted 和 onUnmounted
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
  if (easterClicks.value === 4) {
    return { animation: "oldschool-blink 0.1s step-end infinite" }
  } else {
    return { animation: "none" }
  }
})

const windowStates = ref({
  isFocused: false,
  isMaximized: false,
})

Window.getCurrent().onResized(async ({ }) => {
  windowStates.value.isMaximized = await Window.getCurrent().isMaximized()
})

Window.getCurrent().onFocusChanged(({ payload: focused }) => {
  windowStates.value.isFocused = focused
})
</script>

<style>
@keyframes oldschool-blink {
  0% {
    color: #000;
  }

  50% {
    color: #f00;
  }

  100% {
    color: #000;
  }
}

@keyframes spin-easter-egg {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.spin-active {
  animation: spin-easter-egg 0.5s ease-in-out infinite;
  transform-origin: center;
}
</style>