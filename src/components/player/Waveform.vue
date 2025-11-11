<template>
  <div @click="waveformClick" class="relative p-0.5 w-full h-full cursor-pointer">
    <svg ref="waveformContainer" :width="elementWidth" :height="elementHeight" class="w-full h-full">
      <defs>
        <mask id="progress-mask">
          <rect x="0" y="0" :width="playProgress * elementWidth" :height="elementHeight" fill="white" />
        </mask>
      </defs>

      <!-- Base -->
      <path :d="waveformPath" class="fill-neutral-500 transition-opacity" :class="{ 'opacity-50': !isOutside }" />

      <!-- Played -->
      <path :d="waveformPath" mask="url(#progress-mask)" class="fill-primary transition-opacity"
        :class="{ 'opacity-50': !isOutside && hoverProgress > playProgress }" />


      <!-- Unplayed -->
      <rect v-if="!isOutside" :x="playProgress * elementWidth" y="0"
        :width="(hoverProgress - playProgress) * elementWidth" :height="elementHeight"
        class="fill-primary opacity-20 transition-opacity" />
    </svg>

    <div class="absolute top-0 bottom-0  opacity-0 bg-white rounded-md will-change-transform transition-all"
      :class="{ 'w-1 opacity-100': !isOutside }"
      :style="{ transform: `translateX(${(playProgress * elementWidth - 0.5)}px)` }" />
  </div>
</template>

<script setup lang="ts">
import { Waveform } from "@/utils/types"
import { interpolateInto } from "@/utils/utils"
import { useMouseInElement, useThrottleFn } from "@vueuse/core"
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
const { x, isOutside, elementWidth, elementHeight } = useMouseInElement(waveformContainer)

const waveform = ref<Waveform | null>(null)

const hoverProgress = ref(0)

const updateHoverProgress = useThrottleFn(() => {
  if (isOutside.value || elementWidth.value === 0) {
    hoverProgress.value = 0
  } else {
    hoverProgress.value = x.value / elementWidth.value
  }
}, 1000 / 60) // limit to 60fps

// Watch for mouse position changes and update hover progress
watch([x, isOutside, elementWidth], updateHoverProgress, { immediate: true })

// Generate SVG path from waveform bars
const waveformPath = computed(() => {
  if (waveformBars.value.length === 0) return ""

  let path = ""

  waveformBars.value.forEach((height, index) => {
    const barHeight = height * elementHeight.value
    const x = index * BAR_GAP_TOTAL
    const y = (elementHeight.value - barHeight) / 2

    // Create a rectangle for each bar
    path += `M ${x} ${y} h ${BAR_WIDTH} v ${barHeight} h -${BAR_WIDTH} Z `
  })

  return path
})

const waveformBars = computed(() => {
  let samples = waveform.value?.samples || [
    0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0,
  ]
  let maxSampleHeight = waveform.value?.height || 1

  const count = Math.floor(elementWidth.value / BAR_GAP_TOTAL)
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