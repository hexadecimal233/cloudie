import { defineStore } from "pinia"
import { getCurrentTrack } from "../player/listening-list"
import type { Track } from "@/utils/types"
import { markRaw } from "vue"

interface PlayerCallback {
  onResume: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onPlay: (track: Track, replacedTracklist?: Track[]) => void
  onPlayIndex: (index: number) => void
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number | undefined
  paused: boolean
  playerCallback: PlayerCallback | null
}

export const usePlayerStore = defineStore("player", {
  state: (): PlayerState => {
    return {
      isPlaying: false,
      /** @type {number | undefined} */
      currentTime: 0,
      duration: undefined,
      paused: true,
      playerCallback: null,
    }
  },
  getters: {
    track: (): Track | undefined => getCurrentTrack(),
  },
  actions: {
    init(callback: PlayerCallback) {
      this.playerCallback = markRaw(callback)
    },
    play(track: Track, replacedTracklist?: Track[]) {
      this.playerCallback?.onPlay(track, replacedTracklist)
    },
    playIndex(index: number) {
      this.playerCallback?.onPlayIndex(index)
    },
    pause() {
      this.playerCallback?.onPause()
    },
    resume() {
      this.playerCallback?.onResume()
    },
    seek(newTime: number) {
      this.playerCallback?.onSeek(newTime)
    },
  },
})
