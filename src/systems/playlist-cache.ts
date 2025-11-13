import {
  BasePlaylist,
  ExactPlaylist,
  PartialTrack,
  UserPlaylist,
  PlaylistLike,
  SystemPlaylist,
  Track,
} from "@/utils/types"
import * as schema from "@/systems/db/schema"
import { eq, inArray, sql } from "drizzle-orm"
import { db } from "@/systems/db/db"
import * as API from "@/utils/api"

export async function tryGetPlaylist(playlistId: string | number): Promise<ExactPlaylist | null> {
  const rawPlaylist = await db
    .select()
    .from(schema.playlists)
    .where(eq(schema.playlists.playlistId, playlistId.toString()))
    .limit(1)
    .get()
    .catch(() => {
      return null
    })

  // type definition bug workaround TODO: report a issue
  if (!rawPlaylist?.playlistId) {
    return null
  }

  const playlist = rawPlaylist.meta
  const trackIds = playlist.tracks!.map((t: { id: number }) => t.id)

  const rawResult = await db
    .select()
    .from(schema.localTracks)
    .where(inArray(schema.localTracks.trackId, trackIds))

  const tracks = rawResult.map((row) => {
    const track = row.meta

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
        meta: t,
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
      meta: omittedPlaylist,
    })
    .onConflictDoUpdate({
      target: schema.playlists.playlistId,
      set: {
        meta: omittedPlaylist,
      },
    })
    .returning()
}

export async function fetchUserPlaylist(playlistId: number) {
  const resp = await API.getPlaylist(playlistId)
  if (!resp.tracks) {
    throw new Error("Playlist tracks is empty")
  }
  resp.tracks = await API.getTracks(resp.tracks.map((t) => t.id))

  return resp
}

export async function fetchPlaylistUpdates(likeResp: PlaylistLike, _existTrackIds?: number[]) {
  const currentPlaylist: SystemPlaylist | UserPlaylist =
    likeResp.playlist ?? likeResp.system_playlist

  let partialTracks: PartialTrack[]
  if (likeResp.playlist) {
    const resp = await API.getPlaylist(likeResp.playlist.id)
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

  const currentItem = await API.getTracks(partialTracks.map((item) => item.id))

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
