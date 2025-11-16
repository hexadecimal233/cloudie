import { fetch } from "@tauri-apps/plugin-http"
import { shallowRef } from "vue"
import { config } from "@/systems/config"
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
import { useUserStore } from "@/systems/stores/user"

let clientIdRefreshing = false
const v2Url = "https://api-v2.soundcloud.com"

function getSignature(target: string) {
  const version = 1 // __FOLLOWS_SIGNATURE_VERSION__
  const key = "5Dpr3ubBw8LFtbvQcd4Hx6hU" //__FOLLOWS_SIGNATURE_SECRET__

  const userId = useUserStore().id
  const clientId = config.value.clientId
  // 1. 获取 userAgent 数组片段
  var a = window.navigator.userAgent.split(/[ /]/)

  var s = version + key + clientId + key + target + userId + a[a[0].length % a.length] // 重点：使用 userAgent 数组的某个元素作为盐值

  // 3. 对原始字符串进行 URL 解码
  var l = unescape(encodeURIComponent(s))

  // 4. 初始化一个哈希值和异或/位移操作
  var u = 7996111 // 0x799c7f - 一个固定的初始值
  var c = 0

  // 5. 循环计算哈希
  // 使用简单的位移和异或操作，结合字符串 l 的每个字符的 ASCII 码进行累加
  for (; c < l.length; c += 1) {
    // u = (u >> 1) + ((1 & u) << 23)  // 循环右移 1 位 (24位哈希)
    u = (u >> 1) + ((1 & u) << 23)
    u += l.charCodeAt(c)
    u &= 16777215 // 限制为 24 位 (0xFFFFFF)
  }

  // 6. 格式化输出
  // 返回 "版本号" + ":" + "24位哈希值的16进制表示"
  return `${version}:${u.toString(16)}`
}

// Generic v2 API request
async function requestV2Api(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  endpoint: string,
  queries?: Record<string, any>,
  body?: Record<string, any>,
  endpointAsFullUrl = false,
): Promise<Response> {
  if (clientIdRefreshing) {
    throw new Error("clientId is refreshing, please try again later")
  }

  // Add client_id to endpoint
  endpoint += endpoint.includes("?")
    ? `&client_id=${config.value.clientId}`
    : `?client_id=${config.value.clientId}`

  // Add queries to endpoint
  if (queries) {
    endpoint += `&${new URLSearchParams({
      ...queries,
    }).toString()}`
  }

  const finalUrl = `${endpointAsFullUrl ? "" : v2Url}${endpoint}`

  const sendRequest = async () => {
    const response = await fetch(finalUrl, {
      method,
      headers: {
        Authorization: `OAuth ${config.value.oauthToken}`,
        ...(body ? { Accept: "application/json" } : {}),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "x-datadome-clientid":
          "VBqh_8DiipIwEqJYtY_Ow_rrJlSPvQznBMTFNQ6Db9cQBrgRaGj1MDlxIAyxK4jtlzZDeZWB7vFedjzRH7N1WDhCLBikwOr7fM9ztzfq8rJozqxj2UadeJCeI8xwMGqL",
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

// 发出v2 api json请求
async function getV2ApiJson<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const finalUrl = `${endpoint}?${new URLSearchParams(params).toString()}`

  return (await requestV2Api("GET", finalUrl)).json()
}

// 发出鉴权Json get请求
async function getJson(url: string) {
  return (await requestV2Api("GET", url, undefined, undefined, true)).json()
}

async function postWithQueryV2Api(
  endpoint: string,
  queries?: Record<string, any>,
  body?: Record<string, any>,
): Promise<Response> {
  return await requestV2Api("POST", endpoint, queries, body)
}

async function postV2Api(endpoint: string, body?: Record<string, any>): Promise<Response> {
  return await requestV2Api("POST", endpoint, undefined, body)
}

async function putV2Api(endpoint: string, body?: Record<string, any>): Promise<Response> {
  return await requestV2Api("PUT", endpoint, undefined, body)
}

async function deleteV2Api(endpoint: string, params: Record<string, any> = {}): Promise<Response> {
  return await requestV2Api("DELETE", endpoint, undefined, params)
}

async function _patchV2Api(endpoint: string, body?: Record<string, any>): Promise<Response> {
  return await requestV2Api("PATCH", endpoint, undefined, body)
}

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

/**
 * Collection responses
 */

export function useStream() {
  return useCollection<StreamItem>("/stream", 20, { promoted_playlist: true }) // dunno if this is used for advertising :/
}

export function useUserStream(id: number) {
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

export function useTrackComments(
  id: number,
  includeReplies: boolean = true,
  sort: "newest" | "oldest" | "track-timestamp" = "newest",
) {
  return useCollection<Comment>(`/tracks/${id}/comments`, 20, {
    threaded: includeReplies ? 1 : 0,
    sort,
    offset: 0,
  })
}

export function useTrackAlbums(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/albums`, 10, { representation: "mini" })
}

export function useTrackPlaylistsWithoutAlbum(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/playlists_without_albums`, 10, {
    representation: "mini",
  })
}

export function useTrackPlaylists(id: number) {
  return useCollection<UserPlaylist>(`/tracks/${id}/playlists`, 10, { representation: "mini" })
}

export function useTrackLikers(id: number) {
  return useCollection<SCUser>(`/tracks/${id}/likers`, 9)
}

export function useTrackReposters(id: number) {
  return useCollection<SCUser>(`/tracks/${id}/reposters`, 9)
}

export function usePlaylistLikers(id: number) {
  return useCollection<SCUser>(`/playlists/${id}/likers`, 50)
}

export function usePlaylistReposters(id: number) {
  return useCollection<SCUser>(`/playlists/${id}/reposters`, 50)
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

// User state related methods
export async function getFollowersIds() {
  return (await getV2ApiJson<CollectionResp<number>>("me/followers/ids")).collection
}

export async function getFollowingIds(id: number) {
  return (await getV2ApiJson<CollectionResp<number>>(`/users/${id}/followings/ids`)).collection
}

export async function useMeSystemPlaylistLikeUrns() {
  return (
    await getV2ApiJson<CollectionResp<string>>(`/me/system_playlist_likes/urns`, { limit: 5000 })
  ).collection
}

export function useMeTrackLikeIds() {
  return useCollection<number>(`/me/track_likes/ids`, 200)
}

export async function useMePlaylistLikeIds() {
  return (await getV2ApiJson<CollectionResp<number>>(`/me/playlist_likes/ids`, { limit: 5000 }))
    .collection
}

export async function useMeTrackRepostIds() {
  return (await getV2ApiJson<CollectionResp<number>>(`/me/track_reposts/ids`, { limit: 200 }))
    .collection
}

export async function useMePlaylistRepostIds() {
  return (await getV2ApiJson<CollectionResp<number>>(`/me/playlist_reposts/ids`, { limit: 200 }))
    .collection
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
  const userInfo = useUserStore()
  const response = await getV2ApiJson<QueryCollection<Track>>(`/tracks/${id}/related`, {
    user_id: userInfo.id,
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

export async function getUserFromName(name: string) {
  return await resolveUrl<SCUser>(`https://soundcloud.com/${name}`)
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

// TODO: Sometimes the firewall will be triggered, and the request will fail.

export async function follow(id: number) {
  await postWithQueryV2Api(`/me/followings/${id}`, {
    signature: getSignature(id.toString()),
  })
}

export async function unfollow(id: number) {
  await deleteV2Api(`/me/followings/${id}`)
}

export async function likeTrack(id: number) {
  await putV2Api(`/users/${useUserStore().id}/track_likes/${id}`)
}

export async function unlikeTrack(id: number) {
  await deleteV2Api(`/users/${useUserStore().id}/track_likes/${id}`)
}

export async function repostTrack(id: number) {
  await putV2Api(`/me/track_reposts/${id}`)
}

export async function repostCaption(id: number, caption: string) {
  await putV2Api(`/me/track_reposts/${id}`, { caption })
}

export async function unrepostTrack(id: number) {
  await deleteV2Api(`/me/track_reposts/${id}`)
}

export async function likePlaylist(id: number) {
  await putV2Api(`/users/${useUserStore().id}/playlist_likes/${id}`)
}

export async function unlikePlaylist(id: number) {
  await deleteV2Api(`/users/${useUserStore().id}/playlist_likes/${id}`)
}

export async function likeSystemPlaylist(urn: string) {
  await putV2Api(`/users/${useUserStore().id}/system_playlist_likes/${urn}`)
}

export async function unlikeSystemPlaylist(urn: string) {
  await deleteV2Api(`/users/${useUserStore().id}/system_playlist_likes/${urn}`)
}

export async function repostPlaylist(id: number) {
  await putV2Api(`/me/playlist_reposts/${id}`)
}

export async function unrepostPlaylist(id: number) {
  await deleteV2Api(`/me/playlist_reposts/${id}`)
}

// TODO: add playlist response type
export async function changePlaylist(id: number, trackIds: number[]) {
  await putV2Api(`/playlists/${id}`, {
    playlist: {
      trackIds,
    },
  })
}

export async function createPlaylist(title: string, tracks: number[], isPrivate: boolean) {
  await postV2Api(`/playlists`, {
    playlist: {
      title,
      sharing: isPrivate ? "private" : "public",
      tracks,
      _resource_id: "f-26",
      _resource_type: "playlist",
    },
  })
}

export async function addToHistory(track: Track) {
  const userInfo = useUserStore()
  const anonId = `${random6Digit()}-${random6Digit()}-${random6Digit()}-${random6Digit()}`
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
          track_urn: `soundcloud:tracks:${track.id}`,
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
          user: `soundcloud:users:${userInfo.id}`,
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
          track: `soundcloud:tracks:${track.id}`,
          track_owner: `soundcloud:users:${track.user_id}`,
          playhead_position: 42, // a random number
          anonymous_id: anonId,
          client_id: 46941,
          ts: time, // this is not string
          url: "https://soundcloud.com/you/history",
          session_id: uuid,
          app_version: "1762854424",
          user: `soundcloud:users:${userInfo.id}`,
          referrer: "https://soundcloud.com/",
        },
      },
    ],
    auth_token: config.value.oauthToken,
  }

  await postV2Api(`/me/play-history`, {
    track_urn: `soundcloud:tracks:${track.id}`,
  })
  await postV2Api(`/me`, event)
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

/**
 * Composable function for reactive collection handling
 * @param url The API endpoint URL.
 * @param limit The number of items to fetch per request. Default is 30.
 * @param params Additional query parameters to include in the first request.
 * @returns An object containing the reactive state and functions to handle pagination.
 */
function useCollection<T>(
  url: string,
  limit: number = 30,
  params: Record<string, any> = {}, // Only adds to the first request, and is not reactive, use reset to update
) {
  const data = shallowRef<T[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<any | null>(null)
  const hasNext = shallowRef(true)
  const pageSize = shallowRef(limit)

  let nextHref: string | null = null

  /**
   * A loading-safe function to fetches the next page of data.
   */
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

  /**
   * A loading-safe function to fetches the data till the specified page.
   */
  const fetchTillPage = async (page: number) => {
    while (pageSize.value * page > data.value.length && hasNext.value && !error.value) {
      await fetchNext()
    }
  }

  const reset = (newParams: Record<string, any>) => {
    data.value = []
    nextHref = null
    hasNext.value = true
    error.value = null
    params = { ...params, ...newParams }
  }

  return {
    data,
    loading,
    error,
    hasNext,
    pageSize,

    fetchNext,
    fetchTillPage,
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
  const hasNext = shallowRef(true)

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
    hasNext.value = true
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
