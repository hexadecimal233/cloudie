import { fetch } from "@tauri-apps/plugin-http"
import { ref, shallowRef } from "vue"
import { toast } from "vue-sonner"
import { config } from "@/systems/config"
import { i18n } from "@/systems/i18n"
import type {
  CollectionResp,
  Comment,
  FacetItem,
  M3U8Info,
  Me,
  UserPlaylist,
  PlaylistLike,
  QueryCollection,
  SCUser,
  SearchCollection,
  SearchSuggestion,
  StreamItem,
  SystemPlaylist,
  Track,
  TrackLike,
  Transcoding,
  WebProfile,
} from "./types"

let clientIdRefreshing = false
const v2Url = "https://api-v2.soundcloud.com"

// 发出v2 api json请求
async function getV2ApiJson<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const finalUrl = `${endpoint}?${new URLSearchParams(params).toString()}`

  return (await requestV2Api("GET", finalUrl)).json()
}

// 发出鉴权Json get请求
async function getJson(url: string) {
  return (await requestV2Api("GET", url, undefined, true)).json()
}

// Generic v2 API request
async function requestV2Api(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  endpoint: string,
  body?: Record<string, any>,
  endpointAsFullUrl = false
): Promise<Response> {
  if (clientIdRefreshing) {
    throw new Error("clientId is refreshing, please try again later")
  }

  // Add client_id to endpoint
  endpoint += endpoint.includes("?")
    ? `&client_id=${config.value.clientId}`
    : `?client_id=${config.value.clientId}`

  const finalUrl = `${endpointAsFullUrl ? "" : v2Url}${endpoint}`

  const sendRequest = async () => {
    const response = await fetch(finalUrl, {
      method,
      headers: {
        Authorization: `OAuth ${config.value.oauthToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    return response
  }

  const response = await sendRequest()
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !clientIdRefreshing) {
      // 尝试刷新一次client_id
      await refreshClientId()
      const response = await sendRequest()
      if (!response.ok) {
        throw new Error(`Failed to GET: ${response.status} - ${await response.text()}`)
      }
    }

    throw new Error(`Failed to GET: ${response.status} - ${await response.text()}`)
  }

  return response
}


async function postV2Api(endpoint: string, params: Record<string, any> = {}): Promise<Response> {
  return await requestV2Api("POST", endpoint, params)
}

async function putV2Api(endpoint: string, body?: Record<string, any>): Promise<Response> {
  return await requestV2Api("PUT", endpoint, body)
}

async function deleteV2Api(endpoint: string, params: Record<string, any> = {}): Promise<Response> {
  return await requestV2Api("DELETE", endpoint, params)
}

async function patchV2Api(endpoint: string, body?: Record<string, any>): Promise<Response> {
  return await requestV2Api("PATCH", endpoint, body)
}

// Export the new API functions
export { putV2Api, deleteV2Api, patchV2Api, requestV2Api }

/**
 * Public methods
 */

// client_id helper from yt-dlp
export async function refreshClientId() {
  clientIdRefreshing = true // 防止无限循环刷新

  const webpage = await fetch("https://soundcloud.com/")
  const html = await webpage.text()
  const scriptMatches = html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)

  for (const match of Array.from(scriptMatches).reverse()) {
    const scriptUrl = match[1]
    try {
      const script = await fetch(scriptUrl)
      const scriptText = await script.text()
      const clientIdMatch = scriptText.match(/client_id\s*:\s*"([0-9a-zA-Z]{32})"/)
      if (clientIdMatch) {
        config.value.clientId = clientIdMatch[1]
        clientIdRefreshing = false
        return
      }
    } catch (error) {
      console.warn(`Failed to fetch script from ${scriptUrl}:`, error)
    }
  }

  clientIdRefreshing = false
  throw new Error("Unable to extract client id")
}

/**
 * API methods
 */

// TODO: logged off support
export class BasicUserInfo {
  id: number = -1
  username: string = ""
  avatar_url: string = ""
  permalink: string = ""
}

export const userInfo = ref<BasicUserInfo>(new BasicUserInfo())

// Get basic info for current user
export async function updateUserInfo(forceUpdate: boolean = false) {
  const userStr = localStorage.getItem("user")

  if (userStr) {
    const user = JSON.parse(userStr) as BasicUserInfo
    userInfo.value = user
    if (!forceUpdate) {
      return user
    }
  }

  try {
    const res = await getV2ApiJson<Me>("/me")
    userInfo.value = {
      id: res.id,
      username: res.username,
      avatar_url: res.avatar_url,
      permalink: res.permalink,
    } as BasicUserInfo
    localStorage.setItem("user", JSON.stringify(userInfo.value))
    return userInfo.value
  } catch (err) {
    console.error("Get UserInfo Error", err)
    // TODO: some sort of log out logic (like cleaning the oauth token kinda brutal but wanna make sure its a 401 or 403 and we do this)
    toast.error(i18n.global.t("cloudie.toasts.userInfoErr"), { description: err as string })
    return new BasicUserInfo()
  }
}

/**
 * Collection responses
 */

export async function useStream() {
  return useCollection<StreamItem>("/stream", 20, { promoted_playlist: true }) // dunno if this is used for advertising :/
}

export async function useUserStream(id: number) {
  return useCollection<StreamItem>(`/stream/users/${id}`, 20)
}

export function useTrackLikes(userId: number) {
  return useCollection<TrackLike>(`/users/${userId}/track_likes`, 500)
}

export function useTracks(userId: number) {
  return useCollection<Track>(`/users/${userId}/tracks`, 50)
}

export function useLikes(userId: number) {
  return useCollection<TrackLike>(`/users/${userId}/likes`, 50) // TODO: whats the difference (maybe id?)
}

export function usePlaylists(userId: number) {
  return useCollection<UserPlaylist>(`/users/${userId}/playlists`, 50)
}

export function useHistory() {
  return useCollection<TrackLike>("/me/play-history/tracks", 500)
}

export function useTrackComments(id: number) {
  return useCollection<Comment>(`/tracks/${id}/comments`, 10, { threaded: 0 })
}

export async function useTrackAlbums(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/albums`, 10, { representation: "mini" })
}

export async function useTrackPlaylistsWithoutAlbum(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/playlists_without_albums`, 10, {
    representation: "mini",
  })
}

export async function useTrackPlaylists(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/playlists`, 10, { representation: "mini" })
}

export async function useTrackLikers(id: number) {
  return useCollection<SCUser>(`/tracks/${id}/likers`, 9)
}

export async function useTrackReposters(id: number) {
  return useCollection<SCUser>(`/tracks/${id}/reposters`, 9)
}

export function useFollowings(userId: number, followedBy?: number, notFollowedBy: boolean = false) {
  const extraParams = followedBy
    ? `/${notFollowedBy ? "not_followed_by" : "followed_by"}/${followedBy}`
    : ""
  return useCollection<SCUser>(`/users/${userId}/followings${extraParams}`, 24)
}

export function useLibrary() {
  return useCollection<PlaylistLike>("/me/library/all", 30)
}

export function useStations() {
  return useCollection<PlaylistLike>("/me/library/stations", 30)
}

export function useFollowers(userId: number, followedBy?: number, notFollowedBy: boolean = false) {
  const extraParams = followedBy
    ? `/${notFollowedBy ? "not_followed_by" : "followed_by"}/${followedBy}`
    : ""
  return useCollection<SCUser>(`/users/${userId}/followers${extraParams}`, 24)
}

export function useUserComments(id: number) {
  return useCollection<Comment>(`/users/${id}/comments`, 20)
}

interface FacetQuery {
  name: string
  value: string
}

// TODO: facet

export function useSearch(query: string, filters: FacetQuery[]) {
  return useSearchCollection<Track>(`/search/tracks`, query, filters, "model", 20)
}

export function useSearchTracks(query: string, filters: FacetQuery[]) {
  return useSearchCollection<Track>(`/search/tracks`, query, filters, "genre", 20)
}

export function useSearchUsers(query: string, filters: FacetQuery[]) {
  return useSearchCollection<SCUser>(`/search/users`, query, filters, "location", 20)
}

export function useSearchPlaylists(query: string, filters: FacetQuery[]) {
  return useSearchCollection<UserPlaylist>(`/search/playlists`, query, filters, "genre", 20)
}

export function useSearchAlbums(query: string, filters: FacetQuery[]) {
  return useSearchCollection<UserPlaylist>(`/search/albums`, query, filters, "genre", 20)
}

/**
 * Get Responses
 */

export async function getMe() {
  return await getV2ApiJson<Me>("/me")
}

export async function getPlaylist(id: number, representation: "mini" | "full" = "full") {
  return await getV2ApiJson<UserPlaylist>(`/playlists/${id}`, { representation })
}

export async function getTracks(ids: number[]) {
  // 50 requests each time is the maximum supported by the API
  const promises = []
  for (let i = 0; i < ids.length; i += 50) {
    const promise = getV2ApiJson<Track[]>(`/tracks`, { ids: ids.slice(i, i + 50).join(",") })
    promises.push(promise)
  }
  const currentItem = (await Promise.all(promises)).flat() as Track[]

  return currentItem
}

export async function getDownload(id: number) {
  return (await getV2ApiJson<any>(`/tracks/${id}/download`)).redirectUri as string
}

export async function getM3U8Info(transcoding: Transcoding) {
  return (await getJson(transcoding.url)) as M3U8Info
}

// used when pushing new tracks to the listening list
export async function getRelatedTracks(id: number) {
  const response = await getV2ApiJson<QueryCollection<Track>>(`/tracks/${id}/related`, {
    user_id: userInfo.value.id,
    limit: 30,
  })
  return response.collection
}

export async function getUser(id: number) {
  return await getV2ApiJson<SCUser>(`/users/${id}`)
}

export async function getSpolight(id: number) {
  const response = await getV2ApiJson<CollectionResp<Track>>(`/users/${id}/spotlight`, {
    limit: 10,
  })
  return response.collection
}

export async function getWebProfiles(id: number) {
  return await getV2ApiJson<WebProfile[]>(`/users/soundcloud:users:${id}/web-profiles`)
}

export async function getRelatedArtists(id: number) {
  const response = await getV2ApiJson<CollectionResp<SCUser>>(`/users/${id}/relatedartists`, {
    creators_only: false,
    page_size: 12,
    limit: 12,
  })
  return response.collection
}

export async function getTrackStation(id: number) {
  return await resolveUrl<SystemPlaylist>(
    `https://soundcloud.com/discover/sets/track-stations:${id}`,
  )
}

export async function getArtistStation(id: number) {
  return await resolveUrl<SystemPlaylist>(
    `https://soundcloud.com/discover/sets/artist-stations:${id}`,
  )
}

export async function getSearchSuggestions(query: string) {
  return (
    await getV2ApiJson<CollectionResp<SearchSuggestion>>(`/search/queries`, { q: query, limit: 10 })
  ).collection
}

export async function getFeaturedProfiles(id: number) {
  return (
    await getV2ApiJson<CollectionResp<SCUser>>(`/users/${id}/featured-profiles`, {
      limit: 10,
    })
  ).collection
}

/**
 * Operations
 */

export async function follow(id: number) {
  throw new Error("Unimplemented")
}

export async function unfollow(id: number) {
  throw new Error("Unimplemented")
}

export async function likeTrack(id: number) {
  throw new Error("Unimplemented")
}

export async function unlikeTrack(id: number) {
  throw new Error("Unimplemented")
}

export async function repostTrack(id: number) {
  throw new Error("Unimplemented")
}

export async function unrepostTrack(id: number) {
  throw new Error("Unimplemented")
}

export async function likePlaylist(id: number) {
  throw new Error("Unimplemented")
}

export async function unlikePlaylist(id: number) {
  throw new Error("Unimplemented")
}

export async function repostPlaylist(id: number) {
  throw new Error("Unimplemented")
}

export async function unrepostPlaylist(id: number) {
  throw new Error("Unimplemented")
}

export async function addToHistory(track: Track) {
  const anonId = random6Digit() + "-" + random6Digit() + "-" + random6Digit() + "-" + random6Digit()
  const uuid = uuidv4() // generate a v4 uuid
  const time = Date.now()

  const event = {
    events: [
      {
        event: "audio_performance",
        version: "v0.0.0",
        payload: {
          type: "play",
          latency: Math.floor(1000 + Math.random() * 2000).toString(),
          protocol: "hls",
          player_type: "MaestroHLSMSE",
          host: "playback.media-streaming.soundcloud.cloud",
          format: "aac",
          app_state: "foreground",
          track_urn: "soundcloud:tracks:" + track.id,
          player_version: "v24.2.0",
          player_build_number: "1203",
          preset: "aac_160k",
          quality: "sq",
          audio_quality_mode: "standard",
          entity_type: "soundcloud",
          anonymous_id: anonId,
          client_id: "46941",
          ts: time.toString(),
          url: "https://soundcloud.com/you/history",
          session_id: uuid,
          app_version: "1762854424",
          user: "soundcloud:users:" + userInfo.value.id,
          referrer: "https://soundcloud.com/",
        },
      },
      {
        event: "audio",
        version: "v1.27.17",
        payload: {
          page_name: "collection:history", // or tracks:main, varies
          source: "history", // or recommender, varies
          track_length: track.full_duration,
          track_authorization: track.track_authorization,
          player_type: "MaestroHLSMSE",
          preset: "aac_160k",
          quality: "sq",
          audio_quality_mode: "standard",
          app_state: "foreground",
          action: "play",
          trigger: "manual",
          policy: track.policy,
          monetization_model: track.monetization_model,
          query_position: 1, // sometimes 0
          track: "soundcloud:tracks:" + track.id,
          track_owner: "soundcloud:users:" + track.user_id,
          playhead_position: 42, // a random number
          anonymous_id: anonId,
          client_id: 46941,
          ts: time, // this is not string
          url: "https://soundcloud.com/you/history",
          session_id: uuid,
          app_version: "1762854424",
          user: "soundcloud:users:" + userInfo.value.id,
          referrer: "https://soundcloud.com/",
        },
      },
    ],
    auth_token: config.value.oauthToken,
  }

  await postV2Api(`/me/play-history`, {
    track_urn: "soundcloud:tracks:" + track.id,
  })
  await postV2Api(`/me`, event)
}

export async function changePlaylist(id: number, trackIds: number[]) {
  throw new Error("Unimplemented")
}

export async function createPlaylist(title: string, tracks: number[], isPrivate: boolean) {
  await postV2Api(`/playlists`, {
    "playlist": {
      title,
      "sharing": isPrivate ? "private" : "public",
      tracks,
      "_resource_id": "f-26",
      "_resource_type": "playlist"
    }
  })
}

/**
 * Internal API Utils
 */

function random6Digit() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4))))
      .toString(16)
      .toUpperCase(),
  )
}

async function resolveUrl<T>(url: string) {
  return await getV2ApiJson<T>(`/resolve`, { url })
}

// Composable function for reactive collection handling
function useCollection<T>(
  url: string,
  limit: number = 30,
  params: Record<string, any> = {}, // Only adds to the first request
) {
  const data = shallowRef<T[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<any | null>(null)
  const hasNext = shallowRef(false)

  let nextHref: string | null = null

  const fetchNext = async () => {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      // Linked Partitioning is default to true ig
      const promise = nextHref
        ? (getJson(nextHref) as Promise<CollectionResp<T>>)
        : getV2ApiJson<T>(url, { ...params, limit })
      const res = (await promise) as CollectionResp<T>

      data.value = [...data.value, ...(res.collection || [])] as T[]
      hasNext.value = !!res.next_href
      nextHref = res.next_href
    } catch (err) {
      console.error("useCollection fetchNext error:", err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = []
    nextHref = null
    hasNext.value = false
    error.value = null
  }

  return {
    data,
    loading,
    error,
    hasNext,
    fetchNext,
    reset,
  }
}

// SEARCH useCollection, make sure to reinit when facet changes
function useSearchCollection<T extends Track | UserPlaylist | SCUser>(
  url: string,
  query: string,
  filters: FacetQuery[],
  requestFacet: "model" | "genre" | "location",
  limit: number = 20,
) {
  const data = shallowRef<T[]>([])
  const facets = shallowRef<FacetItem[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<any | null>(null)
  const hasNext = shallowRef(false)

  let nextHref: string | null = null

  const fetchNext = async () => {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      // Linked Partitioning is default to true ig
      const facetObj = filters.reduce((acc, cur) => ({ ...acc, [cur.name]: cur.value }), {})

      const promise = nextHref
        ? (getJson(nextHref) as Promise<SearchCollection<T>>)
        : getV2ApiJson<T>(url, { limit, q: query, ...facetObj, facet: requestFacet })
      const res = (await promise) as SearchCollection<T>

      data.value = [...data.value, ...(res.collection || [])] as T[]
      facets.value = res.facets
      hasNext.value = !!res.next_href
      nextHref = res.next_href
    } catch (err) {
      console.error("useSearchCollection fetchNext error:", err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = []
    nextHref = null
    hasNext.value = false
    error.value = null
  }

  return {
    data,
    loading,
    error,
    hasNext,
    fetchNext,
    reset,
  }
}
