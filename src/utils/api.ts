import { fetch } from "@tauri-apps/plugin-http"
import { config } from "@/systems/config"
import { toast } from "vue-sonner"
import { i18n } from "@/systems/i18n"

let clientIdRefreshing = false
const v2Url = "https://api-v2.soundcloud.com"

// 发出v2 api json请求
export async function getV2ApiJson(
  endpoint: string,
  params: Record<string, any> = {},
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
  useClientId: boolean = true,
) {
  // Add client_id to url
  if (useClientId) {
    if (clientIdRefreshing) {
      throw new Error("clientId is refreshing, please try again later")
    }
    url += url.includes("?")
      ? `&client_id=${config.value.clientId}`
      : `?client_id=${config.value.clientId}`
  }

  const sendRequest = async () => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: useOAuth ? `OAuth ${config.value.oauthToken}` : "",
      },
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
      continue
    }
  }

  clientIdRefreshing = false
  throw new Error("Unable to extract client id")
}

export interface BasicUserInfo {
  id: number
  username: string
  avatar_url: string
  permalink: string
}

// Get basic info for current user
export async function getUserInfo(shallUpdate: boolean = false) {
  const userStr = localStorage.getItem("user")
  if (userStr && !shallUpdate) {
    const user = JSON.parse(userStr) as BasicUserInfo
    return user
  } else {
    try {
      const res = await getV2ApiJson("/me")
      return {
        id: res.id,
        username: res.username,
        avatar_url: res.avatar_url,
        permalink: res.permalink,
      } as BasicUserInfo
    } catch (err) {
      console.error("Get UserInfo Error", err)
      // TODO: some sort of log out logic (like cleaning the oauth token kinda brutal but wanna make sure its a 401 or 403 and we do this)
      toast.error(i18n.global.t("cloudie.toasts.userInfoErr"), { description: err as string })
      return {
        id: -1,
        username: "",
        avatar_url: "",
        permalink: "",
      }
    }
  }
}
