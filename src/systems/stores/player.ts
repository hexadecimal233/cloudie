import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { getCurrentTrack } from "../player/listening-list"
import type { Track } from "@/utils/types"

export const usePlayerStore = defineStore("player", () => {
  const isPlaying = ref(false)

  const track = computed<Track | undefined>(() => {
    return getCurrentTrack()
  })

  const currentTime = ref(0)
  const duration = ref<number | undefined>(0)
  const paused = ref(true)

  let playbackCallbacks: PlayerCallback | undefined

  interface PlayerCallback {
    onResume: () => void
    onPause: () => void
    onSeek: (time: number) => void
    onPlay: (track: Track, replacedTracklist?: Track[]) => void
  }

  function init(callback: PlayerCallback) {
    playbackCallbacks = callback
  }

  function playSong(track: Track, replacedTracklist?: Track[]) {
    playbackCallbacks?.onPlay(track, replacedTracklist)
  }

  function pause() {
    playbackCallbacks?.onPause()
  }

  function resume() {
    playbackCallbacks?.onResume()
  }

  function seek(newTime: number) {
    playbackCallbacks?.onSeek(newTime)
  }

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    paused,

    // Getters
    track,

    // Actions
    playSong,
    pause,
    resume,
    seek,
    init,
  }
})
