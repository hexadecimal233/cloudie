<template>
  <video
    @timeupdate="onTimeUpdate"
    @ended="onEnded"
    @loadedmetadata="onLoadedMetadata"
    @play="onPlay"
    @pause="onPause"
    ref="mediaRef"
    autoplay
    hidden></video>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { usePlayerStore } from "@/systems/stores/player"

const player = usePlayerStore()
const mediaRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  player.init(mediaRef)
})

function onTimeUpdate(_event: Event) {
  if (mediaRef.value) {
    // 修复 NaN/Infinity 错误: 仅当 duration 是有效数字时才更新
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      player.currentTime = mediaRef.value.currentTime
      player.duration = duration
    } else {
      console.warn("Invalid duration value:", duration)
    }
  }
}

function onEnded() {
  player.nextTrack()
}

function onLoadedMetadata() {
  if (mediaRef.value) {
    // metadata 加载后，duration 通常是正确的了
    const duration = mediaRef.value.duration
    if (isFinite(duration) && duration > 0) {
      player.duration = duration
      player.loading = false
    } else {
      console.warn("Invalid duration value on load:", duration)
      player.duration = Infinity // 确保非正常值时进入加载状态
      player.loading = true
    }
  }
}

function onPlay() {
  player.isPaused = false
}

function onPause() {
  player.isPaused = true
}
</script>

<style scoped>
</style>
