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

  shuffle()
}

// update shuffled index mapping ( randomization )
function shuffle() {
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

async function refreshTrackIds() {
  const trackWithIndex = listeningList.value.map((track, index) => ({ track, index }))

  // 获取数据库中现有的所有trackId
  const existingTracks = await db
    .select({ trackId: schema.listeningList.trackId })
    .from(schema.listeningList)
  const existingTrackIds = new Set(existingTracks.map((t) => t.trackId))

  // 获取当前播放列表中的所有trackId
  const currentTrackIds = new Set(trackWithIndex.map(({ track }) => track.id))

  // 删除数据库中不存在于当前播放列表的曲目
  const tracksToDelete = [...existingTrackIds].filter((id) => !currentTrackIds.has(id))
  if (tracksToDelete.length > 0) {
    await db
      .delete(schema.listeningList)
      .where(inArray(schema.listeningList.trackId, tracksToDelete))
  }

  // 只插入或更新当前播放列表中的曲目索引
  await db
    .insert(schema.listeningList)
    .values(trackWithIndex.map(({ track, index }) => ({ trackId: track.id, index })))
    .onConflictDoUpdate({
      target: schema.listeningList.trackId,
      set: { index: schema.listeningList.index },
    })

  shuffle()
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

export async function addAndPlay(track: Track) {
  await addToPlaylist(track)
  config.value.currentIndex = await getNextTrackIndex(1, true)
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

export async function removeMultipleSongs(indexes: number[]) {
  // 按索引从大到小排序，避免删除时索引变化导致的错误
  const sortedIndexes = [...indexes].sort((a, b) => b - a)

  for (const idx of sortedIndexes) {
    await removeSong(idx)
  }
}

export function getCurrentTrack() {
  return listeningList.value[config.value.currentIndex]
}

export function setCurrentTrack(index: number) {
  config.value.currentIndex = index
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n
}

/**
 * Get the offset track in the listening list, shuffle seed is changed on add or delete.
 * @param offset The offset from the current track. Default is 1.
 * @returns The offset track index in the listening list, or -1 if there is no such track.
 */
export async function getNextTrackIndex(offset: number = 1, ignoreShuffle: boolean = false) {
  let { currentIndex, playOrder } = config.value

  // back to first track if goes beyond the end
  const newIdx = mod(currentIndex + offset, listeningList.value.length)

  switch (playOrder) {
    case PlayOrder.Ordered:
      return newIdx
    case PlayOrder.OrderedNoRepeat:
      // Returns -1 if its the last track, pausing playback
      if (currentIndex + offset >= listeningList.value.length) {
        return -1
      } else {
        return newIdx
      }
    case PlayOrder.SingleRepeat:
      return currentIndex
    case PlayOrder.Shuffle: {
      if (ignoreShuffle) {
        return newIdx
      }

      const realMusicIndex = shuffledIndexMapping.get(newIdx)
      if (realMusicIndex === undefined) {
        throw Error("Shuffled index not found")
      }
      return realMusicIndex
    }
  }
}
