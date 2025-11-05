import { Track } from "@/utils/types"
import { ref } from "vue"
import { db } from "@/systems/db/db"
import * as schema from "@/systems/db/schema"
import { asc, inArray } from "drizzle-orm"
import { config } from "@/systems/config"

export enum PlayOrder {
  OrderedNoRepeat = "ordered-no-repeat",
  Ordered = "ordered",
  SingleRepeat = "single-repeat",
  Shuffle = "shuffle",
}

// FIXME: after delete current index should also be changed
// FIXME: shffle list not persistient after restarting app

export const listeningList = ref<Track[]>([])
const shuffledIndexMapping = new Map<number, number>() // <shuffled index, original index>

export async function initMedia() {
  const results = await db.query.listeningList.findMany({
    with: {
      localTrack: true,
    },
    orderBy: [asc(schema.listeningList.index)],
  })

  listeningList.value = results.map(({ localTrack }) => localTrack.meta)

  shuffle()
}

// update shuffled index mapping ( Fisher–Yates shuffle )
function shuffle() {
  const len = listeningList.value.length
  const indices = Array.from({ length: len }, (_, i) => i)
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

export async function addMultipleToListeningList(tracks: Track[]) {
  if (!tracks.length) return

  // Filter exists
  const existingIds = new Set(listeningList.value.map((t) => t.id))
  const uniqueTracks = tracks.filter((track) => !existingIds.has(track.id))

  if (!uniqueTracks.length) return

  // add right after current track
  const insertPosition = config.value.listenIndex + 1
  listeningList.value.splice(insertPosition, 0, ...uniqueTracks)

  await refreshTrackIds()
}

export async function addToListeningList(track: Track) {
  // check if that track exists and delete it
  const existingIndex = listeningList.value.findIndex((t) => t.id === track.id)
  if (existingIndex !== -1) {
    listeningList.value.splice(existingIndex, 1)
  }

  // add right after current track
  listeningList.value.splice(config.value.listenIndex + 1, 0, track)

  await refreshTrackIds()
}

let trackUpdateCallback: (idx: number) => void = () => {}
// To solve single repeat issue and watch doesnt update
export function setTrackUpdateCallback(callback: (idx: number) => void) {
  trackUpdateCallback = callback
}

export async function addAndPlay(track: Track, replacedTracklist?: Track[]) {
  if (replacedTracklist) {
    listeningList.value = [...replacedTracklist]
  }

  await addToListeningList(track) // this called when replace to ensure we are playing the upcoming track
  config.value.listenIndex = await getNextTrackIndex(1, true)
  trackUpdateCallback(config.value.listenIndex)
}

export async function removeSong(idx: number) {
  // delete from listening list
  listeningList.value.splice(idx, 1)
  await refreshTrackIds()
}

export async function removeMultipleSongs(indexes: number[]) {
  if (!indexes.length) return

  const sortedIndexes = [...indexes].sort((a, b) => b - a)

  for (const idx of sortedIndexes) {
    listeningList.value.splice(idx, 1)
  }

  await refreshTrackIds()
}

export function getNthTrack(idx: number) {
  return listeningList.value[idx]
}

export function getCurrentTrack() {
  return getNthTrack(config.value.listenIndex)
}

export function setCurrentTrack(index: number) {
  config.value.listenIndex = index
  trackUpdateCallback(index)
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n
}

/**
 * Get the offset track in the listening list, shuffle seed is changed on add or delete.
 * @param offset The offset from the current track. Default is 1.
 * @returns The offset track index in the listening list, -1 if there is no such track.
 */
export async function getNextTrackIndex(offset: number = 1, ignoreShuffle: boolean = false) {
  let { listenIndex: currentIndex, playOrder } = config.value

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
