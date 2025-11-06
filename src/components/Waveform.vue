<template>
  <div class="w-full h-full py-1">
    <div @click="waveformClick" ref="waveformContainer" class="flex items-center w-full h-full relative">
      <!-- We not using margin cuz they wont update-->
      <div v-for="(height, index) in waveformBars" :key="index"
        class="absolute bg-neutral-500 rounded transition-colors" :class="{
          'bg-primary/70': index / waveformBars.length < hoverProgress, // prioritize hover
          'bg-primary': index / waveformBars.length < playProgress,
        }" :style="{
          height: `${height}%`,
          transform: `translateX(${index * (BAR_WIDTH + BAR_GAP * 2)}px)`,
          width: `${BAR_WIDTH}px`
        }"></div>
      <!-- The Needle -->
      <div class="bg-white w-1 rounded h-full transition-transform border border-primary will-change-transform" :style="{
        transform: `translateX(${playProgress * width}px)`,
      }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Waveform } from "@/utils/types"
import { interpolateInto } from "@/utils/utils"
import { useElementSize, useMouseInElement } from "@vueuse/core"
import { ref, computed, onMounted } from "vue"

const props = defineProps<{
  waveformUrl: string
  playProgress: number
}>()

const BAR_WIDTH = 2
const BAR_GAP = BAR_WIDTH / 2

const waveformContainer = ref<HTMLDivElement | null>(null)
const waveform = ref<Waveform | null>(null)
const { width } = useElementSize(waveformContainer)
const isLoading = ref(true)

const { elementX, isOutside } = useMouseInElement(waveformContainer)
const hoverProgress = computed(() => {
  if (isOutside.value || !elementX.value || !width.value) return 0
  return elementX.value / width.value
})

const waveformBars = computed(() => {
  let samples = waveform.value?.samples || [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
  let height = waveform.value?.height || 1

  const count = Math.floor(width.value / (BAR_WIDTH + BAR_GAP * 2))
  const interpolatedSamples = interpolateInto(samples, count)

  return interpolatedSamples.map((sample) => (sample / height) * 100)
})

function waveformClick(event: MouseEvent) {
  if (!waveformContainer.value) return
  const rect = waveformContainer.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percent = clickX / rect.width

  emit("click", percent)
}

// load waveform data
onMounted(() => {
  fetch(props.waveformUrl)
    .then((response) => response.json())
    .then((data) => {
      waveform.value = data || null
      isLoading.value = false
    })
    .catch((error) => {
      console.error("Failed to load waveform data:", error)
      isLoading.value = false
    })
})

const emit = defineEmits<{
  (e: "click", percentage: number): void
}>()
</script>