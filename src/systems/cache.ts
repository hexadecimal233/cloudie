import {
  BasePlaylist,
  ExactPlaylist,
  PartialTrack,
  Playlist,
  PlaylistLike,
  SystemPlaylist,
  Track,
} from "@/utils/types"
import * as schema from "@/systems/db/schema"
import { eq, inArray, sql } from "drizzle-orm"
import { db } from "./db/db"
import { getV2ApiJson } from "@/utils/api"

export async function getPlaylist(playlistId: string | number): Promise<ExactPlaylist | null> {
  const rawPlaylist = await db
    .select()
    .from(schema.playlists)
    .where(eq(schema.playlists.playlistId, playlistId.toString()))
    .limit(1)
    .get()

  // type definition bug workaround TODO: report a issue
  if (!rawPlaylist?.playlistId) {
    return null
  }

  // if (!rawPlaylist) {
  //   return null
  // }

  const playlist = JSON.parse(rawPlaylist.meta)
  const trackIds = playlist.tracks.map((t: { id: number }) => t.id)

  const rawResult = await db
    .select()
    .from(schema.localTracks)
    .where(inArray(schema.localTracks.trackId, trackIds))

  const tracks = rawResult.map((row) => {
    const track = JSON.parse(row.meta)

    return track
  })

  return {
    ...playlist,
    tracks: tracks,
  }
}

// TODO: Make LOCAL like lists cachable

export async function savePlaylist(playlist: ExactPlaylist) {
  // Save all track metadatas

  let omittedPlaylist: BasePlaylist = playlist

  if (playlist.tracks.length > 0) {
    const data = playlist.tracks.map((t) => {
      // dumb way to detect if it is a Track not a PartialTrack
      if (!(t as Track).title) {
        throw new Error("Cannot save PartialTrack to localTracks")
      }

      return {
        trackId: t.id,
        meta: JSON.stringify(t),
      }
    })

    await db
      .insert(schema.localTracks)
      .values(data)
      .onConflictDoUpdate({
        target: schema.localTracks.trackId,
        set: { meta: sql`excluded.meta` }, // Update old track meta
      })

    omittedPlaylist = {
      ...playlist,
      tracks: playlist.tracks?.map((t) => {
        return {
          id: t.id,
          kind: t.kind,
          monetization_model: t.monetization_model,
          policy: t.policy,
        }
      }), // omit into PartialTracks to save space
    }
  }

  await db
    .insert(schema.playlists)
    .values({
      playlistId: omittedPlaylist.id.toString(),
      meta: JSON.stringify(omittedPlaylist),
    })
    .onConflictDoUpdate({
      target: schema.playlists.playlistId,
      set: {
        meta: JSON.stringify(omittedPlaylist),
      },
    })
    .returning()
}

export async function fetchPlaylistUpdates(likeResp: PlaylistLike, _existTrackIds?: number[]) {
  let currentPlaylist: SystemPlaylist | Playlist = likeResp.playlist ?? likeResp.system_playlist

  let partialTracks: PartialTrack[]
  if (likeResp.playlist) {
    const resp = (await getV2ApiJson(`/playlists/${likeResp.playlist.id}`, {
      representation: "full",
    })) as Playlist
    partialTracks = resp.tracks!
  } else {
    partialTracks = likeResp.system_playlist.tracks
  }

  // FIXME: calculate the difference
  // currently updating all tracks (for deletion and addition)
  // if (existTrackIds) {
  //   partialTracks = partialTracks.filter((t) => !existTrackIds.includes(t.id))
  // }

  if (partialTracks.length === 0) {
    return currentPlaylist as unknown as ExactPlaylist
  }

  // 50 requests each time is the maximum supported by the API
  const promises = []
  for (let i = 0; i < partialTracks.length; i += 50) {
    promises.push(
      getV2ApiJson("/tracks", {
        ids: partialTracks
          .slice(i, i + 50)
          .map((item) => item.id)
          .join(","),
      }),
    )
  }
  const currentItem = (await Promise.all(promises)).flat()

  const finalPlaylist: ExactPlaylist = likeResp.playlist
    ? {
        ...likeResp.playlist,
        tracks: currentItem,
      }
    : {
        ...likeResp.system_playlist,
        tracks: currentItem,
      }

  savePlaylist(finalPlaylist)
  return finalPlaylist
}
