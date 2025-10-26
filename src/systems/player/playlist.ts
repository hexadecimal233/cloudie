import { Track } from "@/utils/types"
import { ref } from "vue"
import { db } from "../db/db"
import * as schema from "@/systems/db/schema"
import { asc, inArray } from "drizzle-orm"
import { config } from "../config"

export enum PlayOrder {
  OrderedNoRepeat = "ordered-no-repeat",
  Ordered = "ordered",
  SingleRepeat = "single-repeat",
  Shuffle = "shuffle",
}

export const listeningList = ref<Track[]>([])
const shuffledIndexMapping = new Map<number, number>() // <shuffled index, original index>

export async function initMedia() {
  const results = await db.query.listeningList.findMany({
    with: {
      localTrack: true,
    },
    orderBy: [asc(schema.listeningList.index)],
  })

  listeningList.value = results.map(({ localTrack }) => JSON.parse(localTrack.meta))
}

async function refreshTrackIds() {
  const trackWithIndex = listeningList.value.map((track, index) => ({ track, index }))

  // delete tracks that doesnt exist anymore
  await db.delete(schema.listeningList).where(
    inArray(
      schema.listeningList.trackId,
      trackWithIndex.map(({ track }) => track.id),
    ),
  )

  // add & update new indices
  await db
    .insert(schema.listeningList)
    .values(trackWithIndex.map(({ track, index }) => ({ trackId: track.id, index })))
    .onConflictDoUpdate({
      target: schema.listeningList.trackId,
      set: { index: schema.listeningList.index },
    })

  // update shuffled index mapping ( randomization )
  // 生成新的随机映射
  const len = listeningList.value.length
  const indices = Array.from({ length: len }, (_, i) => i)
  // Fisher–Yates 洗牌
  for (let i = len - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  shuffledIndexMapping.clear()
  indices.forEach((original, shuffled) => {
    shuffledIndexMapping.set(shuffled, original)
  })
}

export async function addToPlaylist(track: Track) {
  // check if that track exists and delete it
  const existingIndex = listeningList.value.findIndex((t) => t.id === track.id)
  if (existingIndex !== -1) {
    listeningList.value.splice(existingIndex, 1)
  }

  // add right after current track
  listeningList.value.splice(config.value.currentIndex + 1, 0, track)
  await refreshTrackIds()
}

export async function removeSong(idx: number) {
  if (config.value.currentIndex === idx) {
    return // Cannot delete current track
  }

  // delete from listening list
  listeningList.value.splice(idx, 1)
  await refreshTrackIds()
}

export async function removeSongByTrackId(trackId: number) {
  const idx = listeningList.value.findIndex((t) => t.id === trackId)
  if (idx === -1) {
    throw Error("Track not found in listening list")
  }
  
  await removeSong(idx)
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n
}

/**
 * Get the offset track in the listening list, shuffle seed is changed on add or delete.
 * @param offset The offset from the current track. Default is 1.
 * @returns The offset track index in the listening list, or -1 if there is no such track.
 */
export async function getNextTrackIndex(offset: number = 1) {
  let { currentIndex, playOrder } = config.value

  // back to first track if goes beyond the end
  const newIdx = mod(currentIndex + offset, listeningList.value.length)

  switch (playOrder) {
    case PlayOrder.Ordered:
      currentIndex = newIdx
      return currentIndex
    case PlayOrder.OrderedNoRepeat:
      // Returns -1 if its the last track, pausing playback
      if (currentIndex + offset >= listeningList.value.length) {
        return -1
      } else {
        currentIndex = newIdx
        return currentIndex
      }
    case PlayOrder.SingleRepeat:
      return currentIndex
    case PlayOrder.Shuffle: {
      const realMusicIndex = shuffledIndexMapping.get(newIdx)
      if (realMusicIndex === undefined) {
        throw Error("Shuffled index not found")
      }
      return realMusicIndex
    }
  }
}
