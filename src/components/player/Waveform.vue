<template>
  <div @click="waveformClick" ref="waveformContainer" class="w-full h-full p-0.5 cursor-pointer">
    <svg :width="width" :height="height" class="w-full h-full ">
      <rect v-for="(h, index) in waveformBars" :key="index" :x="index * BAR_GAP_TOTAL" :y="(height - h * height) / 2"
        :width="BAR_WIDTH" :height="h * height" rx="2" ry="2" class="transition-all" :class="getBarClass(index)" />
      <!-- Yeah rounded stuff just brings more lag -->
      <!-- TODO: Clickable cursor icon  -->

      <line :x1="playProgress * width" :y1="0" :x2="playProgress * width" :y2="height" stroke-linecap="round"
        class="stroke-white stroke-4 will-change-transform transition-all" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { Waveform } from "@/utils/types"
import { interpolateInto } from "@/utils/utils"
import { useElementSize, useMouseInElement, useThrottleFn } from "@vueuse/core"
import { ref, computed, onMounted, watch } from "vue"

const props = defineProps<{
  waveformUrl: string
  playProgress: number
}>()

const emit = defineEmits<{
  (e: "click", percentage: number): void
}>()

const BAR_WIDTH = 2
const BAR_GAP = BAR_WIDTH / 2
const BAR_GAP_TOTAL = BAR_WIDTH + BAR_GAP * 2

const waveformContainer = ref<HTMLDivElement | null>(null)
const { width, height } = useElementSize(waveformContainer)
const { x, isOutside } = useMouseInElement(waveformContainer)

const waveform = ref<Waveform | null>(null)

const hoverProgressValue = ref(-1)

const updateHoverProgress = useThrottleFn(() => {
  if (isOutside.value || width.value === 0) {
    hoverProgressValue.value = -1
  } else {
    hoverProgressValue.value = x.value / width.value
  }
}, 50)

// Watch for mouse position changes and update hover progress
watch([x, isOutside, width], updateHoverProgress, { immediate: true })

function getBarClass(index: number) {
  const barPosition = index / waveformBars.value.length
  const isPlayed = barPosition < props.playProgress

  // If not hovering, use default colors
  if (isOutside.value || hoverProgressValue.value < 0) {
    return isPlayed ? "fill-secondary" : "fill-neutral-500"
  }

  const isHovered = barPosition <= hoverProgressValue.value

  if (isPlayed) {
    if (isHovered) {
      return "fill-secondary opacity-100 "
    } else {
      return "fill-secondary opacity-50"
    }
  } else {
    if (isHovered) {
      return "fill-primary opacity-50 "
    } else {
      return "fill-neutral-500 opacity-50"
    }
  }
}

const waveformBars = computed(() => {
  let samples = waveform.value?.samples || [
    0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0,
  ]
  let maxSampleHeight = waveform.value?.height || 1

  const count = Math.floor(width.value / BAR_GAP_TOTAL)
  const interpolatedSamples = interpolateInto(samples, count)
  return interpolatedSamples.map((sample) => sample / maxSampleHeight)
})

function waveformClick(event: MouseEvent) {
  if (!waveformContainer.value) return
  const rect = waveformContainer.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percent = clickX / rect.width

  emit("click", percent)
}

watch(() => props.waveformUrl, fetchWaveform)

function fetchWaveform(url: string) {
  waveform.value = null
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      waveform.value = data || null
    })
    .catch((error) => {
      waveform.value = null
      console.error("Failed to load waveform data:", error)
    })
}

// load waveform data
onMounted(() => {
  fetchWaveform(props.waveformUrl)
})
</script>