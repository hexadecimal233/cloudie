import { fetch } from "@tauri-apps/plugin-http"

var clientId = ""
var oauthToken = ""
const v2Url = "https://api-v2.soundcloud.com"

// 发出v2 api json请求
export async function getV2ApiJson(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<any> {
  const finalUrl = `${v2Url}${endpoint}?${new URLSearchParams(params).toString()}`

  return (await getRequest(finalUrl, true, true)).json()
}

// 发出鉴权Json请求
export async function getJson(url: string, useOAuth: boolean = true, useClientId: boolean = true) {
  return (await getRequest(url, useOAuth, useClientId)).json()
}

// 发出有鉴权的请求
export async function getRequest(
  url: string,
  useOAuth: boolean = true,
  useClientId: boolean = true
) {
  // Add client_id to url
  if (useClientId) url += url.includes("?") ? `&client_id=${clientId}` : `?client_id=${clientId}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: useOAuth ? `OAuth ${oauthToken}` : "",
    },
  })

  if (!response.ok) throw new Error(`Failed to GET: ${response.status} - ${await response.text()}`)

  return response
}

export type BasicUserInfo = {
  id: number
  username: string
  avatar_url: string
  permalink: string
  last_refreshed_at: string // 最后刷新时间
}

export async function getUserInfo() {
  const userStr = localStorage.getItem("user")
  if (userStr) {
    const user = JSON.parse(userStr) as BasicUserInfo
    // TODO: 检查是否过期
    return user
  } else {
    try {
      const res = await getV2ApiJson("/me")
      return {
        id: res.id,
        username: res.username,
        avatar_url: res.avatar_url,
        permalink: res.permalink,
        last_refreshed_at: new Date().toISOString(),
      } as BasicUserInfo
    } catch (err) {
      console.log(err)
      return null
    }
  }
}

export function setApi(_clientId: string, _oauthToken: string) {
  clientId = _clientId
  oauthToken = _oauthToken
}

// 下载部分: credits to soundcloud.ts
